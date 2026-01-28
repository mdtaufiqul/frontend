import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { Calendar, Clock, Video, MoreVertical, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MeetingCardProps {
    meeting: any;
    onJoin: (id: string) => void;
    onCancel: (id: string) => void;
    timezone?: string;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onJoin, onCancel, timezone = 'UTC' }) => {
    const router = useRouter();

    const getProviderBadge = (provider: string) => {
        switch (provider) {
            case 'GOOGLE_MEET':
                return <Badge variant="neutral" className="bg-white text-slate-700 border-slate-200 gap-1"><Video size={12} className="text-green-600" /> Google Meet</Badge>;
            case 'ZOOM':
                return <Badge variant="neutral" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Video size={12} /> Zoom</Badge>;
            default:
                return <Badge variant="neutral" className="gap-1"><Video size={12} /> Internal</Badge>;
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            SCHEDULED: "bg-blue-100 text-blue-700",
            IN_PROGRESS: "bg-green-100 text-green-700 animate-pulse",
            COMPLETED: "bg-slate-100 text-slate-700",
            CANCELLED: "bg-red-50 text-red-600",
        };
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${styles[status as keyof typeof styles] || styles.SCHEDULED}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <Card className="hover:shadow-md transition-all border-slate-200 group">
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <StatusBadge status={meeting.status} />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Calendar size={12} />
                            {formatInTimeZone(new Date(meeting.startTime), timezone, 'MMM d, yyyy')}
                        </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{meeting.title}</h3>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400">
                            <MoreVertical size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/meetings/${meeting.id}`)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => onCancel(meeting.id)}>
                            <Trash2 size={16} className="mr-2" /> Delete Meeting
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
                <div className="flex items-center text-sm text-slate-600 gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span>
                        {formatInTimeZone(new Date(meeting.startTime), timezone, 'h:mm a')} - {formatInTimeZone(new Date(meeting.endTime), timezone, 'h:mm a')}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                        {meeting.participants?.map((p: any, i: number) => {
                            const image = p.user?.image || p.patient?.image;
                            const name = p.user?.name || p.patient?.name || '?';
                            return (
                                <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 overflow-hidden" title={name}>
                                    {image ? (
                                        <img
                                            src={image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_API_URL || ''}${image}`}
                                            alt={name}
                                            className="h-full w-full object-cover"
                                            onError={(e: any) => {
                                                e.target.onerror = null;
                                                e.target.src = ''; // Force fallback to initials
                                                e.target.className = 'hidden';
                                            }}
                                        />
                                    ) : null}
                                    <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-slate-500 bg-slate-100">
                                        {name[0].toUpperCase()}
                                    </div>
                                </div>
                            );
                        })}
                        {meeting.participants?.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[10px] font-medium text-slate-500">
                                +{meeting.participants.length - 3}
                            </div>
                        )}
                    </div>
                    {getProviderBadge(meeting.provider)}
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                {meeting.status !== 'CANCELLED' && (
                    <Button
                        className="w-full gap-2"
                        size="sm"
                        onClick={() => onJoin(meeting.id)}
                        disabled={meeting.status === 'COMPLETED'}
                        variant={meeting.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                    >
                        {meeting.status === 'IN_PROGRESS' ? 'Join Now' : 'Start Meeting'}
                        <ExternalLink size={14} />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default MeetingCard;
