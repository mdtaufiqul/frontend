"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import MeetingCard from '@/components/meetings/MeetingCard';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { toast } from 'sonner';
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

export default function MeetingsPage() {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [meetingIdToCancel, setMeetingIdToCancel] = useState<string | null>(null);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/meetings');
            setMeetings(res.data);
        } catch (error) {
            console.error('Failed to fetch meetings:', error);
            // Don't show toast on initial load error to avoid spam if just empty
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (id: string) => {
        // In real implementation, this would call /meetings/:id/join to get token/url
        // For now, simple redirect mock or find meeting
        const meeting = meetings.find(m => m.id === id);
        if (meeting?.meetingLink) {
            window.open(meeting.meetingLink, '_blank');
        } else {
            toast.error("Meeting link not available");
        }
    };

    const handleCancel = (id: string) => {
        setMeetingIdToCancel(id);
        setIsCancelDialogOpen(true);
    };

    const confirmCancel = async () => {
        if (!meetingIdToCancel) return;
        try {
            await api.delete(`/meetings/${meetingIdToCancel}`);
            toast.success("Meeting deleted");
            fetchMeetings();
        } catch (error) {
            toast.error("Failed to delete meeting");
        } finally {
            setIsCancelDialogOpen(false);
            setMeetingIdToCancel(null);
        }
    };

    const filteredMeetings = meetings.filter(m =>
        m.title.toLowerCase().includes(filter.toLowerCase()) ||
        m.description?.toLowerCase().includes(filter.toLowerCase())
    );

    const now = new Date();
    const upcomingMeetings = filteredMeetings.filter(m => {
        const endTime = new Date(m.endTime);
        const isCancelledOrCompleted = m.status === 'CANCELLED' || m.status === 'COMPLETED';
        return endTime > now && !isCancelledOrCompleted;
    });

    const pastMeetings = filteredMeetings.filter(m => {
        const endTime = new Date(m.endTime);
        const isCancelledOrCompleted = m.status === 'CANCELLED' || m.status === 'COMPLETED';
        return endTime <= now || isCancelledOrCompleted;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meetings</h1>
                    <p className="text-slate-500">Manage your virtual consultations and internal meetings.</p>
                </div>
                <Link href="/meetings/new">
                    <Button className="gap-2 shadow-lg shadow-primary-500/20">
                        <Plus size={18} />
                        New Meeting
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Search meetings..."
                        className="pl-10 bg-slate-50 border-slate-200"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2 text-slate-600">
                    <Filter size={16} /> Filters
                </Button>
                <div className="h-6 w-px bg-slate-200 mx-2" />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                    <CalendarIcon size={20} />
                </Button>
            </div>

            <Tabs defaultValue="upcoming" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="upcoming" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Upcoming</TabsTrigger>
                    <TabsTrigger value="past" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Past & Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading meetings...</div>
                    ) : upcomingMeetings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingMeetings.map(meeting => (
                                <MeetingCard
                                    key={meeting.id}
                                    meeting={meeting}
                                    onJoin={handleJoin}
                                    onCancel={handleCancel}
                                    timezone={user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <CalendarIcon size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No Upcoming Meetings</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mt-1 mb-6">You don't have any scheduled meetings coming up. Create one to get started.</p>
                            <Link href="/meetings/new">
                                <Button variant="outline">Schedule Meeting</Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pastMeetings.map(meeting => (
                            <MeetingCard
                                key={meeting.id}
                                meeting={meeting}
                                onJoin={handleJoin}
                                onCancel={handleCancel}
                                timezone={user?.timezone || 'UTC'}
                            />
                        ))}
                    </div>
                    {pastMeetings.length === 0 && !loading && (
                        <div className="text-center py-12 text-slate-400 italic">No past meetings found.</div>
                    )}
                </TabsContent>
            </Tabs>

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
                            onClick={confirmCancel}
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
