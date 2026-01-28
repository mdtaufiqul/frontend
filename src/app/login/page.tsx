"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import React from 'react';
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Mail,
    Lock,
    Loader2,
    AlertCircle,
    Database,
    Cpu,
    Activity,
    Brain,
    Sparkles,
    Dna,
    Stethoscope,
    ChevronRight,
    Eye,
    EyeOff
} from "lucide-react";
import { toast } from "sonner";
import AuthTextSlider from "@/components/ui/AuthTextSlider";
import RoleSelectionCard from "@/components/ui/RoleSelectionCard";
import ForgotPasswordModal from "@/components/ui/ForgotPasswordModal";

const loginNews = [
    {
        category: "Advanced Diagnostics",
        title: "AI-Powered Precision",
        text: "Leverage our state-of-the-art AI algorithms to assist in early detection and diagnosis with 99.9% accuracy.",
        source: "Model Performance V4"
    },
    {
        category: "Security First",
        title: "Enterprise-Grade Protection",
        text: "Your data is secured with military-grade encryption and zero-trust architecture, ensuring complete HIPAA compliance.",
        source: "Security Protocol"
    },
    {
        category: "Interoperability",
        title: "Seamless Data Integration",
        text: "Effortlessly connect with existing EHR systems and IoT devices for a unified view of patient health.",
        source: "Integration Hub"
    },
    {
        category: "Analytics",
        title: "Real-time Clinical Insights",
        text: "Transform raw data into actionable insights with our dynamic analytics dashboard, empowering better decision-making.",
        source: "Data Science Team"
    }
];

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("DOCTOR");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

    const [availableRoles, setAvailableRoles] = useState<any[]>([]);
    const [tempToken, setTempToken] = useState<string | null>(null);

    const { login, confirmRoleSelection } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    React.useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await login(email, password, role); // Pass role hint if selected

            if (result && result.requiresRoleSelection) {
                setAvailableRoles(result.availableRoles);
                setTempToken(result.tempToken);
                toast.info("Validation successful. Please select your profile.", { duration: 4000 });
                return; // Stop loading, wait for user selection
            }

            toast.success("Identity verified. Welcome to MediFlow.");
            router.push("/");
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || "Verification failed. Please check your credentials.");
            toast.error("Access denied.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSelect = async (profile: any) => {
        if (!tempToken) return;
        setIsLoading(true);
        try {
            await confirmRoleSelection(tempToken, profile.id, profile.type);
            toast.success(`Welcome back, ${profile.name}`);
            router.push("/");
        } catch (err: any) {
            console.error("Profile selection error:", err);
            toast.error("Failed to load profile context.");
            setError("Session expired or invalid. Please login again.");
            // Reset to login form
            setAvailableRoles([]);
            setTempToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex bg-slate-50 selection:bg-blue-100 font-sans overflow-hidden">
            {/* Left side Image (Background) */}
            <div className="hidden lg:block absolute inset-0 w-full h-full z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 brightness-95"
                    style={{
                        backgroundImage: `url('/images/auth-bg-custom.jpg')`, // Custom futuristic AI background
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,transparent_35%,rgba(248,250,252,0.5)_50%,#f8fafc_65%,#f8fafc_100%)]" />
                {/* Dark overlay for better text readability on the left */}
                {/* Dark overlay for better text readability on the left */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_0%,#000_10%,rgba(0,0,0,0.9)_20%,rgba(0,0,0,0.7)_35%,rgba(0,0,0,0.4)_55%,rgba(0,0,0,0.1)_75%,transparent_90%)]" />
                {/* Floating Modules */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[10%] left-[8%] opacity-[0.6] text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]"
                    >
                        <Stethoscope className="w-14 h-14" strokeWidth={2} />
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute top-[15%] right-[10%] opacity-[0.5] text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                    >
                        <Activity className="w-12 h-12" strokeWidth={2} />
                    </motion.div>

                    <motion.div
                        animate={{ x: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-[10%] left-[12%] opacity-[0.6] text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]"
                    >
                        <Dna className="w-16 h-16" strokeWidth={2} />
                    </motion.div>

                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[45%] right-[25%] z-[-1] opacity-[0.5] text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                    >
                        <Sparkles className="w-12 h-12" strokeWidth={2} />
                    </motion.div>
                </div>

                <div className="absolute bottom-20 left-20 z-20 max-w-lg hidden xl:block">
                    <AuthTextSlider items={loginNews} mode="news" />
                </div>
            </div>

            {/* Right side Form (40%) */}
            <div className="relative z-10 w-full lg:w-2/5 lg:ml-auto h-screen flex flex-col items-center justify-center p-4 md:p-8 lg:p-12 bg-slate-50/80 lg:bg-transparent overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[420px] flex flex-col justify-center"
                    style={{ height: '90vh', maxHeight: '90vh' }}
                >
                    {/* Layered Glass Concept */}
                    <div className="relative flex flex-col max-h-full">
                        {/* Background decorative glass layer */}
                        <div className="absolute -inset-4 bg-indigo-500/5 blur-3xl rounded-full" />

                        <div className="relative flex flex-col h-full bg-white rounded-[var(--radius-auth-card)] border border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
                            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center overflow-hidden">
                                {/* Header */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                            <Stethoscope className="w-6 h-6 text-[var(--brand-primary)]" />
                                        </div>
                                        <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-[var(--brand-text-muted)] uppercase">
                                            Secure Access
                                        </span>
                                    </div>
                                    <h1 className="text-4xl font-serif text-[var(--brand-text-main)] mb-3 leading-tight">
                                        MediFlow Portal
                                    </h1>
                                    <p className="text-[14px] text-[var(--brand-text-muted)] font-medium">
                                        Secure system access for authorized medical personnel only.
                                    </p>
                                </div>

                                {availableRoles.length > 0 ? (
                                    <RoleSelectionCard
                                        roles={availableRoles}
                                        onSelect={handleProfileSelect}
                                        isLoading={isLoading}
                                    />
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-5">
                                            <div className="space-y-4">
                                                {/* Role Selector */}
                                                <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest">
                                                            Select Your Role
                                                        </label>
                                                    </div>
                                                    <div className="relative group">
                                                        <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-text-muted)] opacity-60" />
                                                        <select
                                                            value={role}
                                                            onChange={(e) => setRole(e.target.value)}
                                                            className="block w-full pl-11 pr-4 py-4 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[15px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400 appearance-none"
                                                        >
                                                            <option value="">Auto-detect Role</option>
                                                            <option value="SYSTEM_ADMIN">System Administrator</option>
                                                            <option value="CLINIC_ADMIN">Clinic Administrator</option>
                                                            <option value="DOCTOR">Doctor / Practitioner</option>
                                                            <option value="PATIENT">Patient</option>
                                                            <option value="STAFF">Front Desk Staff</option>
                                                            <option value="MANAGER">Operations Manager</option>
                                                            <option value="NURSE">Nurse / Assistant</option>
                                                            <option value="RECEPTIONIST">Receptionist</option>
                                                            <option value="REPRESENTATIVE">Representative</option>
                                                        </select>
                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-text-muted)] opacity-40 rotate-90" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest">
                                                            Email Address
                                                        </label>
                                                    </div>
                                                    <div className="relative group">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-text-muted)] opacity-60" />
                                                        <input
                                                            type="email"
                                                            required
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="block w-full pl-11 pr-4 py-4 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[15px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400"
                                                            placeholder="email@example.com"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest">
                                                            Account Password
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsForgotPasswordOpen(true)}
                                                            className="font-mono text-[9px] font-bold text-[var(--brand-primary)] uppercase hover:underline"
                                                        >
                                                            Forgot Password
                                                        </button>
                                                    </div>
                                                    <div className="relative group">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-text-muted)] opacity-60" />
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            required
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="block w-full pl-11 pr-12 py-4 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[15px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[var(--brand-text-muted)] hover:text-[var(--brand-primary)] transition-colors opacity-60 hover:opacity-100"
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="flex items-center gap-2 text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100"
                                                    >
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <p className="text-[12px] font-medium leading-tight">{error}</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full bg-[var(--brand-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-auth-button)] py-4 font-bold text-[14px] tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        SIGN IN TO PORTAL
                                                        <ChevronRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="mt-8 pt-8 border-t border-slate-200/30 text-center">
                                    <p className="text-[13px] text-[var(--brand-text-muted)] font-medium">
                                        New Practitioner?{" "}
                                        <Link href="/register" className="text-[var(--brand-primary)] font-bold hover:underline">
                                            Register Protocol
                                        </Link>
                                    </p>
                                </div>
                            </div>

                            {/* Secure Footer Segment */}
                            <div className="bg-slate-900/5 p-4 flex items-center justify-center gap-6">
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className="font-mono text-[8px] font-bold tracking-tighter">ENCR-256</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <Cpu className="w-3.5 h-3.5" />
                                    <span className="font-mono text-[8px] font-bold tracking-tighter">NODE-01</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={isForgotPasswordOpen}
                onClose={() => setIsForgotPasswordOpen(false)}
            />
        </div>
    );
}
