import { fetchApi } from './api';
import type { Lead } from '../types';

export type VehicleInfo = { rego?: string; vin?: string; make?: string; model?: string; year?: number };
export type PPSR = { status: 'clear' | 'encumbered' | 'error'; vin: string; checkedAt: string; reference?: string; error?: string };
export type Deal = VehicleInfo & {
  _id: string; status: 'registered' | 'completed' | 'cancelled'; stockNumber: string;
  ppsr?: PPSR; appraisal_ppsr?: PPSR; export_reference?: string;
  sale_price_cents?: number; gross_cents?: number;
};
export type Appraisal = VehicleInfo & {
  _id: string; notes?: string; ppsr?: PPSR;
  inspection?: { section: string; condition: string; notes?: string; photos: { id: string; name: string }[] }[];
  licence?: { id: string; name: string }[];
  loanCar?: { signer: string; signedAt: string };
  internalDrive?: { when: string; driver: string };
};
export type Delivery = {
  _id: string; lead_id?: string; dealership: string; customer_name?: string; vehicle?: string; when: string; status: string;
  accessories: { id: string; title: string; completedAt?: string; contractor_name?: string }[];
  follow_up?: { dueAt: string; draft: string };
};
export type Task = { _id: string; title: string; due_at: string; assignee_name: string; status: string; lead_id: string };
export type Pulse = {
  currentActive: number; unactioned: number; appointments: number; overdue: number; completed: number;
  conversion: number; videos: number; monthlyTarget: number; signals: { followUp: string; conversion: string };
  periodLeads: number; periodSold: number; walkIns: number;
  attention: { id: string; name: string; dealership: string; owner: string }[];
  team: { id: string; name: string; leads: number; sales: number }[];
  sites: { name: string; leads: number; sales: number }[];
  models: { name: string; sales: number }[];
};

const body = (method: 'POST' | 'PATCH', payload: unknown) => ({ method, body: JSON.stringify(payload) });
const leadPath = (id: string) => `/leads/${encodeURIComponent(id)}`;
const query = (value: string) => encodeURIComponent(value);

export const workflows = {
  lookup: (rego: string, rooftop: string, state = 'VIC') => fetchApi<VehicleInfo>(`/vehicle-lookup?rego=${query(rego)}&rooftop=${query(rooftop)}&state=${query(state)}`),
  related: (id: string) => fetchApi<{ contacts: Lead[]; duplicates: Lead[]; merged: Lead[] }>(`${leadPath(id)}/related`),
  merge: (id: string, duplicateId: string) => fetchApi(`${leadPath(id)}/merge`, body('POST', { duplicateId })),
  customer: (id: string) => fetchApi<{ deals: Deal[]; appraisals: Appraisal[]; deliveries: Delivery[] }>(`${leadPath(id)}/workflows`),
  appraisal: (id: string, data: unknown) => fetchApi<Appraisal>(`${leadPath(id)}/appraisals`, body('POST', data)),
  suggestDamage: (id: string, photoId: string) => fetchApi<{ condition: string; notes: string }>(`${leadPath(id)}/appraisals/damage-suggestion`, body('POST', { photoId })),
  deal: (id: string, data: unknown) => fetchApi<Deal>(`${leadPath(id)}/deals`, body('POST', data)),
  dealStatus: (id: string, status: string) => fetchApi<Deal>(`/deals/${query(id)}/status`, body('PATCH', { status })),
  exportDeal: (id: string) => fetchApi<{ exportedAt: string; reference: string }>(`/deals/${query(id)}/export`, body('POST', {})),
  ppsr: (id: string, data: { appraisalId?: string; dealId?: string }) => fetchApi<PPSR>(`${leadPath(id)}/ppsr`, body('POST', data)),
  bookDelivery: (id: string, dealId: string, when: string, notes: string) => fetchApi<Delivery>(`${leadPath(id)}/deliveries`, body('POST', { dealId, when, notes })),
  deliveries: (rooftop: string, page: number, status: string, date = '') =>
    fetchApi<Delivery[]>(`/deliveries?rooftop=${query(rooftop)}&page=${page}&status=${query(status)}&date=${query(date)}&sortOrder=asc`),
  deliveryUpdate: (id: string, data: unknown) => fetchApi<Delivery>(`/deliveries/${query(id)}`, body('PATCH', data)),
  deliveryJourney: (data: { dealership: string; days: number; message: string }) => fetchApi('/delivery-journeys', body('PATCH', data)),
  contractors: (id: string) => fetchApi<{ id: string; name: string }[]>(`/deliveries/${query(id)}/contractors`),
  pulse: (rooftop: string, period: string, staff: string) => fetchApi<Pulse>(`/pulse?rooftop=${query(rooftop)}&period=${query(period)}&staff=${query(staff)}`),
  pulseSettings: (data: unknown) => fetchApi('/pulse/settings', body('PATCH', data)),
  tasks: (rooftop: string, date = '', consultant = '') => fetchApi<Task[]>(
    `/sales-tasks?rooftop=${query(rooftop)}&status=open&sortOrder=asc&limit=10&date=${query(date)}&consultant=${query(consultant)}`,
  ),
  task: (id: string, data: unknown) => fetchApi<Task>(`${leadPath(id)}/tasks`, body('POST', data)),
  completeTask: (id: string) => fetchApi<Task>(`/sales-tasks/${query(id)}`, body('PATCH', { status: 'completed' })),
  presence: (rooftop: string) => fetchApi<{ _id: string; name: string; dealership: string; on_site: boolean }[]>(`/attendance?rooftop=${query(rooftop)}`),
  checkIn: (dealership: string, point: { latitude: number; longitude: number; accuracy: number | null }) =>
    fetchApi<{ on_site: boolean }>('/attendance', body('POST', { dealership, ...point })),
  saveFence: (data: unknown) => fetchApi('/site-geofences', body('PATCH', data)),
};
