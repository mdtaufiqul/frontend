"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Users,
    FileText,
    MessageSquare,
    Settings,
    ChevronLeft,
    ChevronRight,
    Activity,
    LogOut,
    CreditCard,
    ClipboardList,
    Clock,
    Workflow,
    Mail,
    Video,
    Building2,
    Clock as ClockIcon,
    TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { PERMISSIONS } from '@/config/apiPermissions';
import Image from 'next/image';
import api, { getFullUrl } from '@/utils/api';
import { useCompleteness } from '@/hooks/useCompleteness';
import { POPULAR_TIMEZONES, getTimezoneAbbreviation } from '@/utils/timezones';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}

import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Check } from 'lucide-react'; // Import Lock icon
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
    const { user, logout, switchRole, can, updateUser } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [waitlistCount, setWaitlistCount] = React.useState(0);
    const { percentage } = useCompleteness();
    const [showBlocker, setShowBlocker] = React.useState(false);
    const [timezone, setTimezone] = React.useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

    const { get } = usePermissionApi();

    const [fetchedClinic, setFetchedClinic] = React.useState<{ name: string; logo?: string } | null>(null);

    React.useEffect(() => {
        // Debug logs for sidebar profile image
        console.log("Sidebar Profile Debug:", {
            userImage: user?.image,
            fullUrl: user?.image ? getFullUrl(user.image) : null,
            user
        });

        // Branding Logic: Fetch clinic if missing details
        // Only fetch waitlist count for doctors or those permitted
        if (user?.role !== 'DOCTOR' && !user?.permissions?.view_appointments) return;

        const fetchData = async () => {
            // 1. Fetch Waitlist
            try {
                const res = await get('view_appointments', '/appointments/waitlist/count');
                if (res) setWaitlistCount(res.data);
            } catch (err) {
                console.error('Failed to fetch waitlist count:', err);
            }

            // 2. Fetch Clinic if incomplete
            const clinicMissingOrIncomplete = !user?.clinic || !user?.clinic?.name || !user?.clinic?.logo;
            if (user?.clinicId && clinicMissingOrIncomplete && !fetchedClinic) {
                console.log("Fetching missing/incomplete clinic data for sidebar branding...");
                try {
                    const { data } = await api.get(`/clinics/${user.clinicId}`);
                    if (data) setFetchedClinic(data);
                } catch (error) {
                    console.error('Failed to fetch clinic details for sidebar:', error);
                }
            }
        };
        fetchData();
    }, [user?.role, get, user?.image, user, user?.clinicId, fetchedClinic]);

    const effectiveClinic = fetchedClinic || user?.clinic;

    // Define all menu items with permission-based access
    const allNavItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            path: '/',
            // Everyone has a dashboard, though content differs
            permission: null
        },
        {
            name: 'Schedule',
            icon: Calendar,
            path: '/schedule',
            permission: PERMISSIONS.VIEW_SCHEDULE,
        },
        {
            name: 'Appointments',
            icon: Calendar,
            path: '/appointments',
            check: (u: any) => u?.role === 'patient'
        },
        {
            name: 'Patients',
            icon: Users,
            path: '/patients',
            permission: PERMISSIONS.VIEW_ALL_PATIENTS
        },
        {
            name: 'Analytics',
            icon: TrendingUp,
            path: '/analytics',
            check: (u: any) => u?.role === 'SYSTEM_ADMIN' || u?.role === 'CLINIC_ADMIN' || u?.role === 'DOCTOR'
        },
        {
            name: 'Waitlist',
            icon: Clock,
            path: '/waitlist',
            badge: waitlistCount > 0 ? waitlistCount : null,
            // Logic: Admins/Doctors can see waitlist. Patients only if on it.
            check: (u: any) => {
                if (u?.role === 'patient') return !!u?.isOnWaitlist;
                // Admins/Doctors with manage_appointments likely see this
                return user?.permissions?.['manage_appointments'] || user?.permissions?.['view_appointments'] || u?.role === 'SYSTEM_ADMIN';
            }
        },
        {
            name: 'Billing',
            icon: CreditCard,
            path: '/billing',
            permission: PERMISSIONS.VIEW_BILLING,
            check: (u: any) => u?.role !== 'DOCTOR'
        },
        {
            name: 'Messages',
            icon: MessageSquare,
            path: '/messages',
            permission: null
        },
        {
            name: 'Meetings',
            icon: Video,
            path: '/meetings',
            // Visible to everyone except patients (Admins, Doctors, Staff)
            check: (u: any) => u?.role !== 'patient'
        },
        {
            name: 'Forms',
            icon: ClipboardList,
            path: '/forms',
            check: (u: any) => u?.role === 'SYSTEM_ADMIN'
        },
        {
            name: (user?.role === 'SYSTEM_ADMIN' || user?.role === 'CLINIC_ADMIN') ? 'Clinic' : 'Settings',
            icon: (user?.role === 'SYSTEM_ADMIN' || user?.role === 'CLINIC_ADMIN') ? Building2 : Settings,
            path: (user?.role === 'SYSTEM_ADMIN' || user?.role === 'CLINIC_ADMIN') ? '/clinic' : '/settings',
            // Admins manage clinic. Doctors manage own settings.
            check: (u: any) => {
                if (u?.role === 'SYSTEM_ADMIN' || u?.role === 'CLINIC_ADMIN') return true;
                if (u?.permissions?.['manage_own_config']) return true;
                return false;
            }
        },
    ];

    // Filter menu items based on permissions
    const navItems = allNavItems.filter(item => {
        // 1. Custom complex check
        if (item.check) {
            return item.check(user);
        }

        // 2. Explicit permission
        if (item.permission) {
            return can(item.permission);
        }

        // 3. Public / Null permission
        return true;
    });

    console.log('Sidebar Debug:', {
        role: user?.role,
        permissions: user?.permissions ? Object.keys(user.permissions).length : 'Missing',
        visibleItems: navItems.map(i => i.name)
    });

    const handleNavClick = (e: React.MouseEvent, path: string) => {
        if (path === '/forms' && percentage < 100) {
            e.preventDefault();
            setShowBlocker(true);
        }
    };

    return (
        <>
            <motion.aside
                initial={false}
                animate={{ width: isOpen ? 240 : 88 }}
                className="bg-slate-50 h-screen flex flex-col z-20 transition-all duration-300 relative border-r border-slate-200/50"
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center px-6 border-b border-slate-200/50">
                    <div className="flex items-center gap-3 font-bold text-xl text-primary-600 h-full">
                        <div className="bg-white shadow-premium p-2 rounded-xl h-10 w-10 flex items-center justify-center overflow-hidden relative shrink-0">
                            {effectiveClinic?.logo ? (
                                <img
                                    src={getFullUrl(effectiveClinic.logo)}
                                    alt="Clinic Logo"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <Activity
                                size={24}
                                className={clsx(
                                    "text-primary-600 fallback-icon",
                                    effectiveClinic?.logo ? 'hidden' : ''
                                )}
                            />
                        </div>
                        {isOpen && (
                            <span className="tracking-tight text-slate-900 truncate max-w-[140px] leading-none" title={effectiveClinic?.name || 'Mediflow'}>
                                {effectiveClinic?.name || 'Mediflow'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-8 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
                        const isLocked = item.path === '/forms' && percentage < 100;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={(e) => handleNavClick(e, item.path)}
                                className={clsx(
                                    "flex items-center px-4 py-3.5 rounded-xl group relative overflow-hidden transition-colors",
                                    isActive
                                        ? "bg-white text-primary-600 shadow-premium font-semibold"
                                        : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                                )}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={clsx("shrink-0", isOpen ? "mr-3" : "mx-auto")} />
                                {isOpen && <span className="text-sm">{item.name}</span>}
                                {item.badge && (
                                    <span className={clsx(
                                        "ml-auto font-bold text-[10px] px-1.5 py-0.5 rounded-full",
                                        isActive ? "bg-primary-100 text-primary-700" : "bg-primary-600 text-white"
                                    )}>
                                        {item.badge}
                                    </span>
                                )}
                                {isOpen && isLocked && (
                                    <Lock size={14} className="ml-auto text-slate-400" />
                                )}

                                {/* Sharp Active Indicator */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1.5 shadow-premium hover:scale-110 active:scale-95 transition-all z-30"
                >
                    {isOpen ? <ChevronLeft size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
                </button>

                {/* Timezone Selector - Bottom Left */}
                <div className="px-4 pb-3">
                    <Select
                        value={timezone}
                        onValueChange={async (newTimezone) => {
                            setTimezone(newTimezone);
                            try {
                                // 1. Update User Timezone
                                await api.patch(`/users/${user?.id}`, { timezone: newTimezone });

                                // 2. Update Context
                                updateUser({ timezone: newTimezone });

                                // 3. Sync with Clinic if Admin
                                if (user?.clinicId && can('manage_clinic_info')) {
                                    try {
                                        await api.patch(`/clinics/${user.clinicId}`, { timezone: newTimezone });
                                    } catch (err) {
                                        console.error('Failed to sync clinic timezone with sidebar change:', err);
                                    }
                                }

                                toast.success('Timezone updated');
                            } catch (e) {
                                console.error('Failed to update timezone:', e);
                                toast.error('Failed to update timezone');
                            }
                        }}
                    >
                        <SelectTrigger className={clsx(
                            "w-full h-9 text-xs bg-white border-slate-200 hover:bg-slate-50 transition-colors",
                            !isOpen && "px-2"
                        )}>
                            <div className="flex items-center gap-2 w-full">
                                <ClockIcon size={14} className="text-slate-400 shrink-0" />
                                {isOpen ? (
                                    <SelectValue placeholder="Select timezone">
                                        <span className="text-xs truncate">
                                            {getTimezoneAbbreviation(timezone)}
                                        </span>
                                    </SelectValue>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-600">
                                        {getTimezoneAbbreviation(timezone)}
                                    </span>
                                )}
                            </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {Array.from(new Set(POPULAR_TIMEZONES.map(t => t.region))).map(region => (
                                <SelectGroup key={region}>
                                    <SelectLabel className="text-xs">{region}</SelectLabel>
                                    {POPULAR_TIMEZONES.filter(t => t.region === region).map(tz => (
                                        <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                            {tz.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Footer / User Profile & Role Switcher */}
                <div className="px-2 mb-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className={clsx(
                                "p-3 bg-white rounded-2xl shadow-premium border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all group",
                                isOpen ? "mx-2" : "mx-0 flex justify-center"
                            )}>
                                <div className={clsx("flex items-center gap-3", isOpen ? "" : "justify-center")}>
                                    <div className="relative">
                                        {user?.image ? (
                                            <img
                                                src={getFullUrl(user.image)}
                                                alt="User"
                                                className="w-10 h-10 rounded-full bg-slate-50 ring-2 ring-white shadow-sm object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        {/* Use standard img tag for DiceBear fallback to avoid next/image optimization issues with SVGs */}
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
                                            alt="User"
                                            className={clsx(
                                                "w-10 h-10 rounded-full bg-slate-50 ring-2 ring-white shadow-sm",
                                                user?.image ? 'hidden' : ''
                                            )}
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white"></div>
                                    </div>
                                    {isOpen && (
                                        <div className="flex-1 overflow-hidden text-left">
                                            <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
                                            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 truncate flex items-center gap-1">
                                                {user?.role?.replace('_', ' ') || 'Member'}
                                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side={isOpen ? "right" : "right"} className="w-64 z-50 ml-2">
                            <DropdownMenuLabel className="text-xs text-slate-400 font-normal uppercase tracking-wider">Switch Profile</DropdownMenuLabel>


                            {/* Current Profile - Show as active */}
                            <DropdownMenuItem className="bg-primary-50/50 cursor-default border-l-2 border-primary-600">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-primary-700">{user?.role}</span>
                                    <span className="text-xs text-slate-500">{user?.clinic?.name || 'Global'}</span>
                                </div>
                                <Check size={16} className="ml-auto text-primary-600" />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Main Identity (if not current) */}
                            {/* Main Identity (if not current) - Allow switching back to Main Profile if currently acting as a member OR if role is different */}
                            {/* Primary Account / Main Role Switch */}
                            {/* Primary Account / Main Role Switch */}
                            {(
                                (user?.globalRole && user?.role !== user?.globalRole) ||
                                ((user as any)?.activeRoleId && (user as any)?.activeRoleId !== user?.id && user?.clinicId !== (user as any)?.globalClinicId)
                            ) && (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                switchRole('main');
                                            }}
                                            className="cursor-pointer hover:bg-slate-50"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700">
                                                    {user?.globalRole ? user.globalRole.replace('_', ' ') : 'Primary Account'}
                                                </span>
                                                <span className="text-xs text-slate-500">Switch to Main Profile</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                            {user?.memberships && user.memberships.length > 0 && (
                                <>

                                    <DropdownMenuSeparator />
                                    {user.memberships
                                        .filter((m: any) => {
                                            // Show if not the currently active membership ID
                                            // AND not the same Role+Clinic as existing active context (avoids Main/Member duplication)
                                            if (m.id === user.activeRoleId) return false;
                                            if (m.role === user.role && m.clinicId === user.clinicId) return false;
                                            return true;
                                        })
                                        .map((m: any) => (
                                            <DropdownMenuItem
                                                key={m.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    switchRole(m.id);
                                                }}
                                                className="cursor-pointer hover:bg-slate-50"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">{m.role}</span>
                                                    <span className="text-xs text-slate-400">{m.clinic?.name}</span>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                                <LogOut size={16} className="mr-2" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </motion.aside>

            {/* Profile Incomplete Dialog */}
            <Dialog open={showBlocker} onOpenChange={setShowBlocker}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Lock size={20} /> Access Restricted
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Your profile setup is incomplete ({percentage}%). You must complete your profile configuration (Clinic Info, Services, Schedule) before you can build and publish forms.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                            <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 text-right">{percentage}% Complete</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBlocker(false)}>Close</Button>
                        <Button onClick={() => {
                            setShowBlocker(false);
                            router.push('/settings?setup=true');
                        }}>
                            Complete Setup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Sidebar;
