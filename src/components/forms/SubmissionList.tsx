
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { toast } from 'sonner';

interface Submission {
    id: string;
    data: any;
    createdAt: string;
}

interface SubmissionListProps {
    formId: string;
}

const SubmissionList: React.FC<SubmissionListProps> = ({ formId }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get(`/forms/${formId}/submissions`);
                setSubmissions(response.data);
            } catch (error) {
                console.error("Failed to load submissions:", error);
                toast.error("Failed to load submissions");
            } finally {
                setIsLoading(false);
            }
        };

        if (formId) fetchSubmissions();
    }, [formId]);

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading submissions...</div>;

    if (submissions.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">No submissions yet.</p>
            </div>
        );
    }

    // Extract headers from first submission data for table columns
    // We try to find common keys, or just use the keys from the first one
    const firstData = submissions[0].data;
    const headers = Object.keys(firstData).filter(k =>
        typeof firstData[k] !== 'object' && k !== 'schedule' && k !== 'appointment'
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                    const csv = [
                        ['Date', ...headers].join(','),
                        ...submissions.map(s => {
                            const row = [
                                format(new Date(s.createdAt), 'yyyy-MM-dd HH:mm'),
                                ...headers.map(h => JSON.stringify(s.data[h] || ''))
                            ];
                            return row.join(',');
                        })
                    ].join('\n');

                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `submissions-${formId}.csv`;
                    a.click();
                }}>
                    <Download size={16} className="mr-2" /> Export CSV
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium text-slate-700">Date</th>
                            {headers.map(h => (
                                <th key={h} className="px-4 py-3 font-medium text-slate-700 capitalize">
                                    {h.replace(/_/g, ' ')}
                                </th>
                            ))}
                            <th className="px-4 py-3 font-medium text-slate-700">Detailed Data</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {submissions.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {format(new Date(s.createdAt), 'MMM d, yyyy HH:mm')}
                                </td>
                                {headers.map(h => (
                                    <td key={h} className="px-4 py-3 text-slate-900">
                                        {typeof s.data[h] === 'boolean'
                                            ? (s.data[h] ? 'Yes' : 'No')
                                            : s.data[h]?.toString() || '-'}
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                    <details>
                                        <summary className="cursor-pointer hover:text-slate-600">View JSON</summary>
                                        <pre className="mt-2 p-2 bg-slate-100 rounded overflow-x-auto max-w-xs">
                                            {JSON.stringify(s.data, null, 2)}
                                        </pre>
                                    </details>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubmissionList;
