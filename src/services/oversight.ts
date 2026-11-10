import { fetchApi } from './api';
import type { Lead } from '../types';

export type DailyLead = Lead & { kind: 'walk_in' | 'internet'; actioned: boolean; videoRecorded: boolean; videoSent: boolean; videos: { id: string; name: string; views: number; reviews: number; status?: string }[] };
export type DailyTask = { _id: string; title: string; notes?: string; lead_id: string; status: string; due_at: string; overdue: boolean; assignee_name?: string };
export type DailyMember = {
  id: string; name: string; site: string; logged: number; expected: number; videosDone: number; videoSent: number; nextActions: number;
  tasksCompleted: number; tasksTotal: number; tasksRemaining: number; overdueTasks: number; overdueProspects: number; carryOvers: number;
  unactioned: number; mtdSales: number; monthlyNorthStar: number; allGreen: boolean;
  signals: { activity: string; videos: string; nextActions: string; tasks: string }; leads: DailyLead[]; tasks: DailyTask[];
};
export type DailyOversight = {
  date: string; timezone: string; refreshedAt: string; members: DailyMember[]; unassigned: Lead[]; losses: Lead[];
  summary: { tasksCompleted: number; tasksTotal: number; tasksRemaining: number; overdueTasks: number; overdueProspects: number; carryOvers: number; unactioned: number; unassigned: number; pendingLosses: number; lossesApprovedToday: number; videosRemaining: number; mtdSales: number; allGreen: boolean };
  report: { available: boolean; scheduledTime: string; description: string; generatedAt: string };
};
export type FollowupPolicy = { today: string; maxDate: string | null; maxDays: number | null; consecutiveDays: number; stage: string };
export type LossAction = 'approve' | 'call' | 'return' | 'reassign';
export type IntakeSource = 'connex' | 'drive' | 'socket' | 'website' | 'sms';
export type IntakeLead = { externalId: string; dealership: string; name: string; phone: string; email: string; vehicle: string; opportunityStatus: string; notes: string };
const leadPath = (id: string) => `/leads/${encodeURIComponent(id)}`;
const post = (value: unknown) => ({ method: 'POST', body: JSON.stringify(value) });
export const oversightApi = {
  daily: (rooftop: string, signal?: AbortSignal) => fetchApi<DailyOversight>(`/daily-oversight?rooftop=${encodeURIComponent(rooftop)}`, { signal }),
  policy: (id: string) => fetchApi<FollowupPolicy & { afterContact: FollowupPolicy }>(`${leadPath(id)}/follow-up-policy`),
  nextAction: (id: string, data: { title: string; note: string; dueAt: string }) => fetchApi<Lead>(`${leadPath(id)}/next-action`, post(data)),
  requestLoss: (id: string, reason: string) => fetchApi<Lead>(`${leadPath(id)}/loss-request`, post({ reason })),
  reviewLoss: (id: string, data: { reviewId: string; action: LossAction; notes: string; assigneeId?: string }) => fetchApi<Lead>(`${leadPath(id)}/loss-review`, post(data)),
  intake: (source: IntakeSource, data: IntakeLead) => fetchApi<Lead>(`/lead-ingestion/${source}`, post(data)),
};

// Interpret form values in dealership time even when the device is overseas.
export function melbourneDateTime(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a valid date and time.');
  const target = `${date}T${time}:00`;
  const wall = Date.parse(target + 'Z');
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 19) !== target) throw new Error('Enter a valid calendar date.');
  const formatter = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const local = (stamp: number) => {
    const p = Object.fromEntries(formatter.formatToParts(new Date(stamp)).map(part => [part.type, part.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  };
  let stamp = wall;
  for (let i = 0; i < 3; i++) stamp = wall - (Date.parse(local(stamp) + 'Z') - stamp);
  if (local(stamp) !== target) throw new Error('This time is unavailable because of daylight saving. Choose another time.');
  return new Date(stamp).toISOString();
}
