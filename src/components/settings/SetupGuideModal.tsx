
import { X, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SetupGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
    if (!isOpen) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Google Meet Setup Guide</h2>
                        <p className="text-sm text-slate-500">Follow these steps to generate your credentials</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        {/* Step 1 */}
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">1</span>
                                Create Google Cloud Project
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 ml-9">
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 marker:text-slate-400">
                                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink size={12} /></a></li>
                                    <li>Click <strong>New Project</strong> from the dropdown menu</li>
                                    <li>Name it "MediFlow Integration" and click Create</li>
                                </ul>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">2</span>
                                Enable Calendar API
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 ml-9">
                                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 marker:text-slate-400">
                                    <li>Go to <strong>APIs & Services {'>'} Library</strong></li>
                                    <li>Search for "Google Calendar API"</li>
                                    <li>Click <strong>Enable</strong></li>
                                </ol>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">3</span>
                                Configure OAuth Screen
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 ml-9">
                                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 marker:text-slate-400">
                                    <li>Go to <strong>OAuth consent screen</strong></li>
                                    <li>Select <strong>External</strong> and click Create</li>
                                    <li>Enter "MediFlow" as the App Name</li>
                                    <li>Add your email for support and developer contact</li>
                                    <li>Click Save and Continue</li>
                                    <li className="font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block mt-1">
                                        CRITICAL: Go to "Test Users" step and click "+ ADD USERS". Add your email address there.
                                    </li>
                                    <li>If you don't do this, Google will block your access!</li>
                                </ol>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">4</span>
                                Create Credentials
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 ml-9">
                                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 marker:text-slate-400">
                                    <li>Go to <strong>Credentials {'>'} Create Credentials {'>'} OAuth client ID</strong></li>
                                    <li>Select <strong>Web application</strong></li>
                                    <li>Add this URL to <strong>Authorized redirect URIs</strong>:</li>
                                </ol>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 max-w-full overflow-hidden">
                                    <code className="text-xs text-slate-600 font-mono truncate flex-1 block">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/settings/google-callback` : '/settings/google-callback'}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(window.location.origin + '/settings/google-callback')}
                                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 shrink-0"
                                        title="Copy URL"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Step 5 */}
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">5</span>
                                Connect
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 ml-9">
                                <p className="text-sm text-slate-600">
                                    Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from Google and paste them into the form behind this popup. Then click "Generate Authorization Link".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors shadow-sm shadow-slate-200"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
