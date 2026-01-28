"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, Video, Users, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/utils/api';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MeetingDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    useEffect(() => {
        if (params?.id) {
            fetchMeeting(params.id as string);
        }
    }, [params?.id]);

    const fetchMeeting = async (id: string) => {
        try {
            setLoading(true);
            const res = await api.get(`/meetings/${id}`);
            setMeeting(res.data);
        } catch (error) {
            toast.error("Failed to load meeting details");
            router.push('/meetings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        try {
            await api.delete(`/meetings/${meeting.id}`);
            toast.success("Meeting deleted");
            fetchMeeting(meeting.id);
        } catch (error) {
            toast.error("Failed to delete meeting");
        } finally {
            setIsCancelDialogOpen(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-500">Loading details...</div>;
    }

    if (!meeting) return null;

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

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Meeting Details</h1>
                    <p className="text-slate-500 text-sm">View and manage meeting information</p>
                </div>
                <div className="ml-auto flex gap-2">
                    {meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-red-600" onClick={() => setIsCancelDialogOpen(true)}>
                                    <Trash2 size={16} className="mr-2" /> Delete Meeting
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={meeting.status === 'SCHEDULED' ? 'primary' : 'neutral'}>
                                        {meeting.status.replace('_', ' ')}
                                    </Badge>
                                    {getProviderBadge(meeting.provider)}
                                </div>
                                <CardTitle className="text-2xl">{meeting.title}</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {meeting.description && (
                            <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm">
                                {meeting.description}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Date</div>
                                    <div className="font-medium">{format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Time</div>
                                    <div className="font-medium">
                                        {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {meeting.meetingLink && meeting.status !== 'CANCELLED' && (
                            <div className="pt-4">
                                <Button className="w-full gap-2 py-6 text-lg" onClick={() => window.open(meeting.meetingLink, '_blank')}>
                                    Join Meeting <ExternalLink size={20} />
                                </Button>
                                <p className="text-center text-xs text-slate-400 mt-2">
                                    Link: {meeting.meetingLink}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users size={18} /> Participants
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {meeting.participants?.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                        {p.user?.image ? (
                                            <img src={p.user.image} alt={p.user.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-500">
                                                {(p.user?.name?.[0] || p.patient?.name?.[0] || '?')}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">
                                            {p.user?.name || p.patient?.name}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            {p.role}
                                            {p.status === 'JOINED' || p.status === 'ACCEPTED' ? (
                                                <span className="text-green-600 font-bold">• Accepted</span>
                                            ) : (
                                                <span className="text-slate-400">• Invited</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this meeting? This action cannot be undone and all participants will be notified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Meeting
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
