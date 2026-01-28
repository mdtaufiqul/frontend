import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';

interface ChangePasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Current Password
    const [currentPassword, setCurrentPassword] = useState('');

    // Step 2: New Password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const resetState = () => {
        setStep(1);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleVerifyCurrent = async () => {
        if (!currentPassword) {
            toast.error("Please enter your current password");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post('/auth/verify-password', { password: currentPassword });
            if (res.data.isValid) {
                setStep(2);
            } else {
                toast.error("Incorrect password. Please try again.");
            }
        } catch (error) {
            toast.error("Failed to verify password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/change-password', { newPassword });
            toast.success("Password changed successfully", {
                icon: <CheckCircle2 className="text-emerald-500" />,
            });
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!user?.email) return;

        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: user.email });
            toast.success("Reset link sent", {
                description: `Check ${user.email} for instructions.`
            });
            handleClose();
        } catch (error) {
            toast.error("Failed to send reset link");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "For security, please enter your current password first."
                            : "Create a new strong password."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {step === 1 ? (
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyCurrent()}
                                />
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleForgotPassword}
                                    className="text-sm text-primary-600 hover:underline"
                                    disabled={isLoading}
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {step === 1 ? (
                        <Button onClick={handleVerifyCurrent} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next
                        </Button>
                    ) : (
                        <Button onClick={handleChangePassword} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
