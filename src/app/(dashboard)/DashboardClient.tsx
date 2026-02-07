"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Clock,
  Video,
  DollarSign,
  Calendar,
  Activity,
  Sparkles,
  FileText,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import WaitingRoomWidget from '@/components/dashboard/WaitingRoomWidget';
import clsx from 'clsx';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { useSocket } from '@/hooks/useSocket';
import { normalizeTimezone } from '@/utils/timezones';

const DashboardClient: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { get, can } = usePermissionApi();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    patientCount: 0,
    appointmentCount: 0,
    doctorCount: 0,
    recentClinics: [] as any[],
    aiInsights: [] as any[],
    nextAppointment: null as any,
    recentScribes: [] as any[]
  });
  const [schedule, setSchedule] = useState<any[]>([]);

  const fetchDashboardData = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[Dashboard] Fetching summary for:', user.role);

      const summaryRes = await get(null, '/dashboard/summary');
      if (summaryRes) {
        setStats({
          revenue: summaryRes.data.revenue || 0,
          patientCount: summaryRes.data.patientCount || 0,
          appointmentCount: summaryRes.data.appointmentCount || 0,
          doctorCount: summaryRes.data.doctorCount || 0,
          recentClinics: summaryRes.data.recentClinics || [],
          aiInsights: summaryRes.data.aiInsights || [],
          nextAppointment: summaryRes.data.nextAppointment || null,
          recentScribes: summaryRes.data.recentScribes || []
        } as any);
      }

      let newSchedule: any[] = [];
      if (can('view_appointments')) {
        const today = new Date().toISOString().split('T')[0];
        const doctorParam = user.role === 'DOCTOR' ? `&doctorId=${user.id}` : '';
        const apptRes = await get('view_appointments', `/appointments?start=${today}${doctorParam}`);

        if (apptRes) {
          const appointments = apptRes.data || [];
          const userTimezone = normalizeTimezone(user?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

          newSchedule = appointments.map((appt: any) => {
            const startTime = new Date(appt.date);
            const timeString = startTime.toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: userTimezone
            });

            return {
              id: appt.id,
              name: appt.patient?.name || appt.guestName || 'Unknown Patient',
              time: timeString,
              type: appt.type === 'video' ? 'Telehealth' : 'Office',
              title: appt.service?.name || 'Consultation',
              duration: appt.service?.duration ? `${appt.service.duration} min` : '30 min',
              status: appt.status,
              patientId: appt.patientId,
              rawDate: appt.date.split('T')[0]
            };
          }).sort((a: any, b: any) => new Date('1970/01/01 ' + a.time).getTime() - new Date('1970/01/01 ' + b.time).getTime());
        }
      }
      setSchedule(newSchedule);

    } catch (error) {
      console.error("[Dashboard] Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, [user, get, can]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchDashboardData();
    };

    socket.on('appointmentUpdated', handleUpdate);
    return () => {
      socket.off('appointmentUpdated', handleUpdate);
    };
  }, [socket, fetchDashboardData]);

  const activeSlot = schedule.find(s => s.status === 'scheduled') || schedule[0];
  const upcomingSlots = schedule.filter(s => s.id !== activeSlot?.id);

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-2 overflow-hidden pb-1">
      <div className="grid grid-cols-12 gap-3 shrink-0 h-20">
        <div className="col-span-4 bg-white pl-5 py-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 overflow-hidden">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Activity size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">Good Morning, Admin</h1>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Calendar size={10} /> {todayDate}
            </p>
          </div>
        </div>

        <div className="col-span-2">
          <Card
            className="h-full pl-5 flex flex-col justify-center !bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer"
            onClick={() => router.push('/staff')}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 bg-indigo-50 rounded text-indigo-600">
                <Users size={12} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Doctors</span>
            </div>
            <span className="text-lg font-black text-slate-900 block">{stats.doctorCount} <span className="text-[10px] text-slate-400 font-bold">Active</span></span>
          </Card>
        </div>

        <div className="col-span-2">
          <Card
            className="h-full pl-5 flex flex-col justify-center !bg-white border border-slate-200 shadow-sm hover:border-primary-200 transition-colors cursor-pointer"
            onClick={() => router.push('/schedule')}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 bg-primary-50 rounded text-primary-600">
                <Calendar size={12} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
            </div>
            <span className="text-lg font-black text-slate-900 block">{stats.appointmentCount} <span className="text-[10px] text-slate-400 font-bold">Today</span></span>
          </Card>
        </div>

        <div className="col-span-2">
          <Card
            className="h-full pl-5 flex flex-col justify-center !bg-white border border-slate-200 shadow-sm hover:border-green-200 transition-colors cursor-pointer"
            onClick={() => router.push('/billing')}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 bg-green-50 rounded text-green-600">
                <DollarSign size={12} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
            </div>
            <span className="text-lg font-black text-slate-900 block">${stats.revenue.toLocaleString()}</span>
          </Card>
        </div>

        <div className="col-span-2">
          <Card
            className="h-full pl-5 flex flex-col justify-center !bg-white border border-slate-200 shadow-sm hover:border-blue-200 transition-colors cursor-pointer"
            onClick={() => router.push('/patients')}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 bg-blue-50 rounded text-blue-600">
                <Users size={12} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patients</span>
            </div>
            <span className="text-lg font-black text-slate-900 block">{stats.patientCount} <span className="text-[10px] text-slate-400 font-bold">Total</span></span>
          </Card>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        <div className="col-span-8 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Clock size={14} className="text-primary-600" /> Today's Schedule
              </h3>
              <Button variant="ghost" size="sm" className="text-[10px] h-7 px-3 border border-slate-200 bg-white" onClick={() => router.push('/schedule')}>View Calendar</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading schedule...</div>
              ) : schedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  {stats.nextAppointment ? (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center max-w-sm">
                      <Calendar size={48} className="mx-auto mb-3 opacity-20 text-indigo-500" />
                      <h4 className="text-sm font-bold text-slate-700">No Appointments Today</h4>
                      <p className="text-xs text-slate-500 mt-1">Your next appointment is with <strong>{stats.nextAppointment.patientName}</strong> on {new Date(stats.nextAppointment.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <Button variant="outline" size="sm" onClick={() => router.push('/schedule')} className="mt-4 text-[10px] font-bold">Go to Schedule</Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Calendar size={48} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-medium">Your schedule is completely clear.</p>
                      <Button variant="link" onClick={() => router.push('/schedule')} className="text-primary-600 text-xs">Check Calendar</Button>
                    </div>
                  )}

                  {user?.role === 'SYSTEM_ADMIN' && (
                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Platform Health</h4>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                          <Activity size={20} /> Excellent
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">All services are operational across 13 regions.</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Recent Clinics</h4>
                        <div className="space-y-2">
                          {stats.recentClinics?.length > 0 ? stats.recentClinics.map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                              <span className="text-[10px] font-bold text-slate-700 truncate">{c.name}</span>
                              <span className="text-[9px] text-slate-400">{c.address.split(',')[0]}</span>
                            </div>
                          )) : (
                            <p className="text-[10px] text-slate-500 italic">No clinics registered yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[4.5rem] top-4 bottom-4 w-px bg-slate-100 border-l border-dashed border-slate-300 hidden sm:block"></div>

                  {activeSlot && (
                    <div className="relative flex sm:gap-6 mb-6 group">
                      <div className="hidden sm:flex flex-col items-end w-14 shrink-0 pt-2">
                        <span className="text-sm font-black text-slate-900">{activeSlot.time.split(' ')[0]}</span>
                        <span className="text-[10px] font-bold text-slate-400">{activeSlot.time.split(' ')[1]}</span>
                      </div>

                      <div className="hidden sm:flex absolute left-[4.5rem] top-3 -translate-x-1/2 w-4 h-4 bg-primary-100 rounded-full border-[3px] border-white ring-1 ring-primary-500 z-10 items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-pulse"></div>
                      </div>

                      <div className="flex-1 bg-white rounded-2xl border border-primary-200 shadow-lg shadow-primary-50/50 p-4 relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 group-hover:border-primary-300">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                          <Video size={120} />
                        </div>

                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Image
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeSlot.name)}`}
                                alt={activeSlot.name}
                                width={48} height={48}
                                className="rounded-full bg-slate-100 ring-4 ring-primary-50"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1 rounded-full ring-2 ring-white">
                                <Video size={10} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4
                                  className="font-bold text-slate-900 text-base cursor-pointer hover:text-primary-600 hover:underline decoration-dotted transition-colors"
                                  onClick={() => router.push(`/schedule?view=day&date=${activeSlot.rawDate}&time=${activeSlot.time}`)}
                                >
                                  {activeSlot.name}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                <span>{activeSlot.title}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{activeSlot.duration}</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-primary-600 text-white shadow-md shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all text-xs font-bold"
                            onClick={() => router.push(`/meeting/${activeSlot.id}`)}
                          >
                            Join Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {upcomingSlots.map((slot, i) => (
                    <div key={i} className="relative flex sm:gap-4 mb-3 group last:mb-0">
                      <div className="hidden sm:flex flex-col items-end w-14 shrink-0 pt-1">
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{slot.time.split(' ')[0]}</span>
                        <span className="text-[9px] font-bold text-slate-300">{slot.time.split(' ')[1]}</span>
                      </div>

                      <div className="hidden sm:flex absolute left-[4.5rem] top-2.5 -translate-x-1/2 w-3 h-3 bg-slate-100 rounded-full border-2 border-white ring-1 ring-slate-200 z-10 group-hover:bg-slate-200 group-hover:ring-slate-300 transition-all"></div>

                      <div
                        className={clsx(
                          "flex-1 rounded-xl border p-3 flex items-center gap-3 transition-all cursor-pointer",
                          "bg-white border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5"
                        )}
                        onClick={() => router.push(`/schedule?view=day&date=${slot.rawDate}&time=${slot.time}`)}
                      >
                        <div className="relative">
                          <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(slot.name)}`} alt={slot.name} width={40} height={40} className="rounded-full bg-slate-50" />
                          {slot.type === 'Telehealth' && (
                            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                              <div className="bg-primary-50 text-primary-600 p-0.5 rounded-full">
                                <Video size={8} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold truncate text-slate-900">{slot.name}</h4>
                            <span className={clsx("text-[9px] font-bold px-2 py-0.5 rounded-md",
                              slot.type === 'Telehealth' ? "bg-primary-50 text-primary-600" :
                                slot.type === 'Office' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                            )}>
                              {slot.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                            <span>{slot.title}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span>{slot.duration}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-indigo-100/50">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Sparkles size={12} className="text-indigo-500" /> AI Insights
              </h3>
              <Badge variant="neutral" className="bg-white/50 text-[9px] px-1.5">New</Badge>
            </div>
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {stats.aiInsights?.length > 0 ? stats.aiInsights.map((insight: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{insight.title}</span>
                      {insight.trend === 'up' && <Badge variant="success" className="h-4 px-1 text-[8px]">+12%</Badge>}
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-snug">
                      {insight.content}
                    </p>
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-400 text-center italic mt-10">Syncing live signals...</p>
                )}
              </div>
            </div>
          </div>

          <div className=" h-[30%] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <WaitingRoomWidget />
          </div>

          {(user?.role === 'DOCTOR' || user?.role === 'CLINIC_ADMIN' || user?.role === 'STAFF') && (
            <div className="h-[25%] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <FileText size={12} className="text-primary-600" /> Recent Scribes
                </h3>
                <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => router.push('/notes')}>View All</Button>
              </div>
              <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5">
                  {stats.recentScribes?.length > 0 ? stats.recentScribes.map((scribe: any) => (
                    <div
                      key={scribe.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all group"
                      onClick={() => router.push(`/patients/${scribe.patientId}?tab=history`)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                          <CheckCircle size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-700 truncate">{scribe.patientName}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{new Date(scribe.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400">
                      <p className="text-[10px] italic">No finalized scribes yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
