"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search,
    Bell,
    FileText,
    BarChart3,
    MessageSquare,
    Users,
    User,
    Calendar,
    ArrowRight,
    Command,
    X,
    Calendar as CalendarIcon
} from 'lucide-react';
import clsx from 'clsx';
import { useCompleteness } from '@/hooks/useCompleteness';
import { useAuth } from '@/context/AuthContext';
import { normalizeTimezone } from '@/utils/timezones';

interface HeaderProps {
    sidebarOpen: boolean;
}

// Mock Data for Global Search
const SEARCH_DATA = [
    { type: 'patient', id: '1', title: 'Sarah Connor', subtitle: 'PT-8802 • Post-op Checkup', link: '/patients/1' },
    { type: 'patient', id: '2', title: 'James Wilson', subtitle: 'PT-4421 • Cardio Review', link: '/patients/2' },
    { type: 'patient', id: '3', title: 'Emma Watson', subtitle: 'PT-9912 • Initial Consultation', link: '/patients/3' },
    { type: 'appointment', id: 'a1', title: 'Consultation with Sarah', subtitle: 'Today, 2:00 PM', link: '/schedule' },
    { type: 'appointment', id: 'a2', title: 'Team Meeting', subtitle: 'Tomorrow, 9:00 AM', link: '/schedule' },
    { type: 'page', id: 'p1', title: 'Practice Manual', subtitle: 'Documentation & Guides', link: '/manual' },
    { type: 'page', id: 'p2', title: 'Settings', subtitle: 'System Preferences', link: '/settings' },
];

const Header: React.FC<HeaderProps> = () => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const { percentage } = useCompleteness();
    const { user } = useAuth();

    // Use user's timezone if set, otherwise fallback to browser's resolved timezone
    const timezone = user?.timezone ? normalizeTimezone(user.timezone) : Intl.DateTimeFormat().resolvedOptions().timeZone;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const filteredResults = SEARCH_DATA.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setIsOpen(true);
    };

    const handleSelect = (link: string) => {
        router.push(link);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-10 w-full transition-all duration-300 shadow-glass">
            {/* ... Left Section (Search) ... */}
            <div className="flex items-center gap-4 flex-1 max-w-[800px]">
                {/* Search Bar */}
                <div ref={searchRef} className="relative z-50">
                    <div className={clsx(
                        "flex items-center w-[400px] bg-slate-100/50 border border-slate-200/60 rounded-2xl px-4 py-2.5 transition-all duration-300",
                        isOpen ? "bg-white ring-2 ring-primary-100/50 shadow-lg" : "shadow-inset-soft"
                    )}>
                        <Search size={18} className={clsx("mr-3 transition-colors", isOpen ? "text-primary-500" : "text-slate-400")} />
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            onFocus={() => setIsOpen(true)}
                            placeholder="Search patients, appointments..."
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-700 font-medium"
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setIsOpen(false); }} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                        {!query && (
                            <div className="hidden md:flex items-center gap-1 ml-2 pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">⌘</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">K</span>
                            </div>
                        )}
                    </div>

                    {/* Search Dropdown */}
                    {isOpen && query && (
                        <div className="absolute top-full left-0 w-[400px] mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-bg-white zoom-in-95 duration-200">
                            <div className="max-h-[400px] overflow-y-auto p-2">
                                {filteredResults.length > 0 ? (
                                    <>
                                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Top Results</div>
                                        {filteredResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleSelect(result.link)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left"
                                            >
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors",
                                                    result.type === 'patient' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                                        result.type === 'appointment' ? "bg-purple-50 border-purple-100 text-purple-600" :
                                                            "bg-slate-50 border-slate-100 text-slate-600"
                                                )}>
                                                    {result.type === 'patient' && <User size={18} />}
                                                    {result.type === 'appointment' && <Calendar size={18} />}
                                                    {result.type === 'page' && <Command size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-700 group-hover:text-primary-600 truncate transition-colors">
                                                        {result.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                                                </div>
                                                <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <Search size={24} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-bold">No results found</p>
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                <span>Press <strong>Enter</strong> to select</span>
                                <span><strong>Esc</strong> to close</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notification Icon (Moved to where pinned icons were) */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                    <button className="relative p-2.5 text-slate-500 hover:text-primary-600 hover:bg-white rounded-xl transition-all shadow-premium border border-transparent hover:border-slate-100">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white animate-pulse"></span>
                    </button>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                {/* Date Display (Far Right) */}
                <div className="hidden lg:flex items-center text-slate-500 text-xs font-bold uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-premium">
                    <CalendarIcon size={14} className="mr-2 text-primary-500" />
                    <span>
                        {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone })}
                        <span className="mx-2 opacity-30">|</span>
                        {currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })}
                    </span>
                </div>

                {/* Quick Action */}
                {/* Profile Completeness - Only show if incomplete */}
                {percentage < 100 && (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-1 pr-4">
                        <div className="flex items-center gap-2 pl-3">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile</p>
                                <p className="text-xs font-bold text-slate-900">{percentage}% Complete</p>
                            </div>
                            <div className="h-8 w-8 relative flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="16" cy="16" r="14" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                                    <circle
                                        cx="16" cy="16" r="14"
                                        stroke={percentage === 100 ? "#22c55e" : "#0ea5e9"}
                                        strokeWidth="3"
                                        fill="none"
                                        strokeDasharray="88"
                                        strokeDashoffset={88 - (88 * percentage / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                            </div>
                        </div>
                        <button onClick={() => router.push('/settings?setup=true')} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center shadow-lg transition-all">
                            Complete Setup
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
