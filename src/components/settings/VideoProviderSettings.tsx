"use client";

import { useState, useEffect } from 'react';
import { X, Video, Check, AlertCircle, Loader2, ExternalLink, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import SetupGuideModal from './SetupGuideModal';

interface VideoProviderSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

type VideoProvider = 'daily' | 'zoom' | 'google-meet';

export default function VideoProviderSettings({ isOpen, onClose }: VideoProviderSettingsProps) {
    const { user } = useAuth();
    const [selectedProvider, setSelectedProvider] = useState<VideoProvider>('daily');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Zoom credentials
    const [zoomClientId, setZoomClientId] = useState('');
    const [zoomClientSecret, setZoomClientSecret] = useState('');
    const [zoomAccountId, setZoomAccountId] = useState('');
    const [hasZoomCredentials, setHasZoomCredentials] = useState(false);

    // Google Meet credentials
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleClientSecret, setGoogleClientSecret] = useState('');
    const [hasGoogleCredentials, setHasGoogleCredentials] = useState(false);
    const [googleAuthUrl, setGoogleAuthUrl] = useState('');
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            fetchVideoSettings();
        }
    }, [isOpen, user]);

    const fetchVideoSettings = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const response = await api.get(`/users/${user.id}/video-settings`);
            setSelectedProvider(response.data.videoProvider || 'daily');
            setHasZoomCredentials(response.data.hasZoomCredentials || false);
            setHasGoogleCredentials(response.data.hasGoogleCredentials || false);
        } catch (error) {
            console.error('Failed to fetch video settings:', error);
            toast.error('Failed to load video settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProvider = async () => {
        if (!user?.id) return;

        setSaving(true);
        try {
            await api.patch(`/users/${user.id}/video-provider`, { provider: selectedProvider });
            toast.success(`Video provider updated to ${getProviderName(selectedProvider)}`);
            onClose();
        } catch (error) {
            console.error('Failed to update provider:', error);
            toast.error('Failed to update video provider');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveZoomCredentials = async () => {
        if (!user?.id || !zoomClientId || !zoomClientSecret || !zoomAccountId) {
            toast.error('Please fill in all Zoom credentials');
            return;
        }

        setSaving(true);
        try {
            const response = await api.patch(`/users/${user.id}/zoom-credentials`, {
                clientId: zoomClientId,
                clientSecret: zoomClientSecret,
                accountId: zoomAccountId,
            });

            if (response.data.credentialsValid) {
                toast.success('Zoom credentials saved and verified!');
                setHasZoomCredentials(true);
                // Clear form
                setZoomClientId('');
                setZoomClientSecret('');
                setZoomAccountId('');
            } else {
                toast.warning('Credentials saved but could not be verified. Please check them.');
            }
        } catch (error) {
            console.error('Failed to save Zoom credentials:', error);
            toast.error('Failed to save Zoom credentials');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateGoogleAuthUrl = async () => {
        if (!user?.id || !googleClientId || !googleClientSecret) {
            toast.error('Please enter Google Client ID and Client Secret');
            return;
        }

        setSaving(true);
        try {
            // First, save the credentials (without refresh token) so the backend has them for the callback
            try {
                await api.patch(`/users/${user.id}/google-credentials`, {
                    clientId: googleClientId,
                    clientSecret: googleClientSecret,
                });
            } catch (saveError) {
                console.warn('Failed to save pre-auth credentials', saveError);
                // Continue anyway, as the next step might work if params are passed (legacy)
                // or it will fail later, but we tried.
            }

            const response = await api.post(`/users/${user.id}/google-auth-url`, {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            });

            setGoogleAuthUrl(response.data.authUrl);
            toast.success('Authorization URL generated! Click the link to connect.');
        } catch (error) {
            console.error('Failed to generate auth URL:', error);
            toast.error('Failed to generate authorization URL');
        } finally {
            setSaving(false);
        }
    };

    const getProviderName = (provider: VideoProvider) => {
        switch (provider) {
            case 'daily': return 'Daily.co (Own Service)';
            case 'zoom': return 'Zoom';
            case 'google-meet': return 'Google Meet';
        }
    };

    const getProviderDescription = (provider: VideoProvider) => {
        switch (provider) {
            case 'daily': return 'Secure, reliable video calls with our built-in service. No additional setup required.';
            case 'zoom': return 'Use your Zoom account for video consultations. Requires Zoom API credentials.';
            case 'google-meet': return 'Integrate with Google Meet for video calls. Requires Google OAuth2 setup.';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Online Portal Settings</h2>
                        <p className="text-sm text-slate-500 mt-1">Choose your video consultation provider</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Provider Selection */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-slate-900">Select Video Provider</h3>

                                {/* Daily.co Option */}
                                <ProviderCard
                                    provider="daily"
                                    selected={selectedProvider === 'daily'}
                                    onSelect={() => setSelectedProvider('daily')}
                                    name={getProviderName('daily')}
                                    description={getProviderDescription('daily')}
                                    configured={true}
                                />

                                {/* Zoom Option */}
                                <ProviderCard
                                    provider="zoom"
                                    selected={selectedProvider === 'zoom'}
                                    onSelect={() => setSelectedProvider('zoom')}
                                    name={getProviderName('zoom')}
                                    description={getProviderDescription('zoom')}
                                    configured={hasZoomCredentials}
                                />

                                {/* Google Meet Option */}
                                <ProviderCard
                                    provider="google-meet"
                                    selected={selectedProvider === 'google-meet'}
                                    onSelect={() => setSelectedProvider('google-meet')}
                                    name={getProviderName('google-meet')}
                                    description={getProviderDescription('google-meet')}
                                    configured={hasGoogleCredentials}
                                />
                            </div>

                            {/* Zoom Credentials Form */}
                            {selectedProvider === 'zoom' && !hasZoomCredentials && (
                                <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-1">Zoom API Credentials Required</h4>
                                            <p className="text-sm text-slate-600">
                                                To use Zoom, you need to create a Server-to-Server OAuth app in your Zoom Marketplace account.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
                                            <input
                                                type="text"
                                                value={zoomClientId}
                                                onChange={(e) => setZoomClientId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                                placeholder="Enter Zoom Client ID"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
                                            <input
                                                type="password"
                                                value={zoomClientSecret}
                                                onChange={(e) => setZoomClientSecret(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                                placeholder="Enter Zoom Client Secret"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Account ID</label>
                                            <input
                                                type="text"
                                                value={zoomAccountId}
                                                onChange={(e) => setZoomAccountId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                                placeholder="Enter Zoom Account ID"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveZoomCredentials}
                                            disabled={saving}
                                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                            Save Zoom Credentials
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Google Meet OAuth Flow */}
                            {selectedProvider === 'google-meet' && !hasGoogleCredentials && (
                                <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-200">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-1">Google OAuth2 Setup Required</h4>
                                            <p className="text-sm text-slate-600">
                                                To use Google Meet, you need to create OAuth2 credentials in Google Cloud Console.
                                            </p>
                                            <button
                                                onClick={() => setShowSetupGuide(true)}
                                                className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1 mt-1 hover:underline"
                                            >
                                                <HelpCircle size={14} />
                                                View Setup Guide
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
                                            <input
                                                type="text"
                                                value={googleClientId}
                                                onChange={(e) => setGoogleClientId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                                placeholder="Enter Google Client ID"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
                                            <input
                                                type="password"
                                                value={googleClientSecret}
                                                onChange={(e) => setGoogleClientSecret(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                                placeholder="Enter Google Client Secret"
                                            />
                                        </div>
                                        <button
                                            onClick={handleGenerateGoogleAuthUrl}
                                            disabled={saving}
                                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : <ExternalLink size={16} />}
                                            Generate Authorization Link
                                        </button>

                                        {googleAuthUrl && (
                                            <div className="bg-white border border-primary-200 rounded-lg p-4">
                                                <p className="text-sm font-medium text-slate-900 mb-2">Click to authorize:</p>
                                                <a
                                                    href={googleAuthUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary-600 hover:text-primary-700 text-sm break-all underline"
                                                >
                                                    {googleAuthUrl}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveProvider}
                        disabled={saving || loading}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        Save Settings
                    </button>
                </div>
                <SetupGuideModal isOpen={showSetupGuide} onClose={() => setShowSetupGuide(false)} />
            </div>
        </div>
    );
}

// Provider Card Component
interface ProviderCardProps {
    provider: VideoProvider;
    selected: boolean;
    onSelect: () => void;
    name: string;
    description: string;
    configured: boolean;
}

function ProviderCard({ provider, selected, onSelect, name, description, configured }: ProviderCardProps) {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg shrink-0 ${selected ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                    <Video size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{name}</h4>
                        {configured && (
                            <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                <Check size={12} />
                                Configured
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-600">{description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                    {selected && <Check size={14} className="text-white" />}
                </div>
            </div>
        </button>
    );
}
