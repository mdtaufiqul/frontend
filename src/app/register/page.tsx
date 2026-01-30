"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Mail,
    Lock,
    ChevronRight,
    Loader2,
    AlertCircle,
    LayoutGrid,
    UserRound,
    CheckCircle2,
    Zap,
    Activity,
    Brain,
    Sparkles,
    Dna,
    Stethoscope,
    Heart,
    Eye,
    EyeOff
} from "lucide-react";
import { toast } from "sonner";
import ParticleBackground from "@/components/ui/ParticleBackground";



// Initial registration is always for SYSTEM_ADMIN (Clinic Owner)

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("SYSTEM_ADMIN");
    const [verificationCode, setVerificationCode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { requestVerification, verifyCode } = useAuth();
    const router = useRouter();

    const handleRequestVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Auto-detect user's timezone
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await requestVerification({ email, name, password, role, timezone });
            setStep(2);
            toast.success("Verification code sent to your email.");
        } catch (err: any) {
            console.error("Signup error:", err);
            const msg = err.response?.data?.message || "Registration failed";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await verifyCode(email, verificationCode);
            toast.success("Identity confirmed. Account initialized.");
            router.push("/");
        } catch (err: any) {
            console.error("Verification error:", err);
            setError("Invalid code. Please check and retry.");
            toast.error("Verification failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="h-screen relative flex items-center justify-center selection:bg-blue-100 font-sans p-4 overflow-y-auto overflow-x-hidden"
            style={{
                background: 'linear-gradient(90deg, #000000 0%, #050508 20%, #0f172a 50%, #050508 80%, #000000 100%)'
            }}
        >
            {/* Foundational Abstract Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: 'url("/images/auth-bg.png")' }}
            />

            {/* Premium Background Image Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.1] pointer-events-none"
                style={{ backgroundImage: 'url("/hero-auth.png")' }}
            />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Futuristic Flying Dots */}
            <ParticleBackground />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[480px] relative z-10"
            >
                <div className="relative flex flex-col">
                    <div className="absolute -inset-6 bg-blue-500/10 blur-3xl rounded-full" />

                    <div className="relative flex flex-col bg-white rounded-[var(--radius-auth-card)] border border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1),0_0_60px_-15px_rgba(59,130,246,0.1)] max-h-[calc(100vh-32px)] overflow-hidden">
                        <div className="p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                            {/* Header */}
                            <div className="mb-8 text-center">
                                <div className="flex items-center justify-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                        <Zap className="w-5 h-5 text-[var(--brand-primary)]" />
                                    </div>
                                    <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-[var(--brand-text-muted)] uppercase">
                                        Registration
                                    </span>
                                </div>
                                <h1 className="text-3xl font-serif text-[var(--brand-text-main)] mb-2">
                                    Join MediFlow
                                </h1>
                                <p className="text-[13px] text-[var(--brand-text-muted)] font-medium">
                                    Please provide your details below to create your account.
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 1 ? (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        <form onSubmit={handleRequestVerification} className="space-y-6">
                                            <div className="space-y-5">
                                                <div className="space-y-4 p-4 rounded-2xl border border-slate-200/40 bg-white/30">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex -space-x-1">
                                                            <Activity className="w-4 h-4 text-emerald-500" />
                                                            <Brain className="w-4 h-4 text-indigo-500" />
                                                            <Stethoscope className="w-4 h-4 text-blue-500" />
                                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[13px] font-bold text-slate-800">Clinic Owner</h4>
                                                            <p className="text-[11px] text-slate-500 font-medium">Full clinical & administrative access.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest px-1">
                                                        Full Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="block w-full px-4 py-3.5 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[14px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400"
                                                        placeholder="e.g. Dr. June Almeida"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest px-1">
                                                        Email Address
                                                    </label>
                                                    <input
                                                        type="email"
                                                        required
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="block w-full px-4 py-3.5 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[14px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400"
                                                        placeholder="email@example.com"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest px-1">
                                                        Create Password
                                                    </label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-text-muted)] opacity-60" />
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            required
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="block w-full pl-11 pr-12 py-3.5 bg-white/40 border border-slate-200/50 text-[var(--brand-text-main)] text-[14px] rounded-[var(--radius-auth-button)] focus:bg-white/80 focus:border-[var(--brand-primary)] outline-none transition-all placeholder:text-slate-400"
                                                            placeholder="Min 8 characters"
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

                                            {error && (
                                                <div className="flex items-center gap-2 text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-[12px] font-medium leading-tight">{error}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-[var(--brand-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-auth-button)] py-4 font-bold text-[14px] tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        CONTINUE
                                                        <ChevronRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                    >
                                        <form onSubmit={handleVerify} className="space-y-6">
                                            <div className="text-center mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                <p className="text-[13px] text-[var(--brand-text-muted)] font-medium">
                                                    Verification code sent to <br />
                                                    <span className="font-bold text-[var(--brand-text-main)] underline decoration-[var(--brand-primary)]/30">{email}</span>
                                                </p>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="font-mono text-[10px] font-bold text-[var(--brand-text-muted)] uppercase tracking-widest px-1 text-center block">
                                                        Enter Verification Code
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={verificationCode}
                                                        onChange={(e) => setVerificationCode(e.target.value)}
                                                        className="block w-full px-4 py-4 bg-white/50 border border-slate-200/50 text-[var(--brand-text-main)] text-[20px] font-mono font-bold text-center tracking-[0.6em] rounded-2xl focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all"
                                                        placeholder="000000"
                                                        maxLength={6}
                                                    />
                                                </div>

                                            </div>

                                            {error && (
                                                <div className="flex items-center gap-2 text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <p className="text-[12px] font-medium leading-tight">{error}</p>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-[var(--brand-primary)] hover:bg-blue-700 text-white py-4 font-bold text-[14px] tracking-wide rounded-[var(--radius-auth-button)] shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                ) : (
                                                    "COMPLETE REGISTRATION"
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="w-full text-[10px] font-bold text-slate-400 hover:text-[var(--brand-primary)] transition-colors uppercase tracking-[0.2em]"
                                            >
                                                ← GO BACK
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-8 text-center">
                                <p className="text-[13px] text-[var(--brand-text-muted)] font-medium">
                                    Already onboarded?{" "}
                                    <Link href="/login" className="text-[var(--brand-primary)] font-bold hover:underline">
                                        Identity Portal
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
