import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import Badge from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';

export interface Participant {
    id: string;
    name: string;
    image?: string;
    type: 'USER' | 'PATIENT';
    role?: string;
    email?: string;
}

interface ParticipantSelectorProps {
    selected: Participant[];
    onChange: (participants: Participant[]) => void;
    clinicId?: string;
}

const getImageUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${apiUrl}${path}`;
};

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({ selected, onChange, clinicId }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced search
    useEffect(() => {
        const search = async () => {
            if (!query) return;
            setLoading(true);
            try {
                // Fetch doctors/staff
                const usersRes = await api.get('/users', { params: { search: query, clinicId } });

                let patients: any[] = [];
                try {
                    const patientsRes = await api.get('/patients', { params: { search: query, clinicId } });
                    patients = patientsRes.data;
                } catch (e) {
                    console.warn("Patient search api missing or failed", e);
                }

                const userOptions = usersRes.data.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    image: u.image,
                    type: 'USER',
                    role: u.role,
                    email: u.email
                }));

                const patientOptions = patients.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    image: null,
                    type: 'PATIENT',
                    role: 'Patient',
                    email: p.email
                }));

                setOptions([...userOptions, ...patientOptions]);
            } catch (error) {
                console.error("Failed to search participants", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [query, clinicId]);

    const handleSelect = (participant: Participant) => {
        if (selected.some(p => p.id === participant.id)) return;
        onChange([...selected, participant]);
        setOpen(false);
        setQuery('');
    };

    const handleRemove = (id: string) => {
        onChange(selected.filter(p => p.id !== id));
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {selected.map(participant => (
                    <Badge key={participant.id} variant="neutral" className="pl-1 pr-2 py-1 flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                            {participant.image ? (
                                <img src={getImageUrl(participant.image)} alt={participant.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-slate-500">
                                    {participant.name[0]}
                                </div>
                            )}
                        </div>
                        <span>{participant.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase ml-1">
                            {participant.type === 'USER' ? participant.role : 'Patient'}
                        </span>
                        <button onClick={() => handleRemove(participant.id)} className="ml-1 hover:text-red-500">
                            <X size={12} />
                        </button>
                    </Badge>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between text-slate-500 font-normal"
                        onClick={() => setOpen(!open)}
                    >
                        Add participants...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="p-2 border-b border-slate-100">
                        <Input
                            ref={inputRef}
                            placeholder="Search doctors, staff, or patients..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="border-none focus-visible:ring-0 px-2 h-8"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {loading && <div className="p-2 text-sm text-slate-500 text-center">Searching...</div>}
                        {!loading && options.length === 0 && query && (
                            <div className="p-2 text-sm text-slate-500 text-center">No results found.</div>
                        )}
                        {!loading && options.length === 0 && !query && (
                            <div className="p-2 text-sm text-slate-400 text-center">Type to search people</div>
                        )}

                        {options.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors",
                                    selected.some(p => p.id === option.id) && "opacity-50 cursor-default"
                                )}
                            >
                                <Check
                                    className={cn(
                                        "h-4 w-4 text-primary-600",
                                        selected.some(p => p.id === option.id) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                    {option.image ? (
                                        <img src={getImageUrl(option.image)} alt={option.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-500">
                                            {option.name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{option.name}</span>
                                    <span className="text-xs text-slate-500">
                                        {option.type === 'PATIENT' ? 'Patient' : option.role} • {option.email}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default ParticipantSelector;
