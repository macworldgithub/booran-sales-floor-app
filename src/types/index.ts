export interface CustomerMedia {
  id: string;
  name: string;
  content_type: string;
  size: number;
  url: string;
  created_at: string;
}

export interface CustomerMessage {
  id: string;
  body: string;
  phone: string;
  author: string;
  created_at: string;
  status: 'pending' | 'queued' | 'scheduled' | 'sent' | 'delivered' | 'received' | 'failed' | 'cancelled' | 'unknown' | string;
  direction?: 'inbound' | 'outbound';
  source?: string;
  dealership?: string;
  error?: string;
  attachments: CustomerMedia[];
}

export interface CustomerMessageHistory {
  messages: CustomerMessage[];
  sms_available: boolean;
  ai_enabled?: boolean;
  ai_resume_hours?: number;
  media_available: boolean;
  media_unavailable_reason?: string;
  history_warning?: string;
}

export interface Lead {
  _id: string;
  id?: string;
  deal_id?: string;
  name: string;
  customer_name?: string;
  initials?: string;
  vehicle?: string;
  make?: string;
  model?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  status: 'new_lead' | 'following_up' | 'sold' | 'lost' | 'returned' | string;
  dealership: string;
  dealership_name?: string;
  dealer_code?: string;
  owner_name?: string;
  owner_id?: string | null;
  business_name?: string;
  business_id?: string;
  source_channel?: string;
  source_stage?: string;
  source_comments?: string;
  ai_enabled?: boolean;
  ai_resume_hours?: number;
  assignedTo?: string;
  phone?: string;
  customer_phone?: string;
  email?: string;
  customer_email?: string;
  notes?: string;
  source?: string;
  created_at?: string;
  first_contact_at?: string;
  minutes_to_first_contact?: number;
  first_followup_due_at?: string;
  had_contact_opportunity?: boolean;
  follow_ups_sent?: number;
  priority?: boolean;
  testDrive?: {
    testDriveDate?: string | null;
    location?: string;
    status?: string;
    confirmed?: boolean;
  };
  tradeIn?: {
    make?: string;
    model?: string;
    year?: number;
    rego?: string;
    vin?: string;
    estimatedValue?: number;
  };
  diary_entries?: {
    author: string;
    date: string;
    note: string;
  }[];
  post_sales_followup?: any;
}

export interface Vehicle {
  _id: string;
  stockNumber: string;
  vin: string;
  make: string;
  model: string;
  variant?: string;
  year?: number;
  colour?: string;
  body?: string;
  transmission?: string;
  fuel?: string;
  odometer?: number;
  category: 'New' | 'Used' | 'Demo' | 'Loaner' | string;
  status: 'In Stock' | 'Soft Hold' | 'Sold' | string;
  advertisedPrice?: number;
  vehicleCost?: number;
  totalStockCost?: number;
  potentialGross?: number;
  accumulatedHoldingCost?: number;
  holdingCostPerDay?: number;
  dateInStock?: string;
  daysInStock: number;
  agingBucket: '0-30' | '31-45' | '46-60' | '61-90' | '90+' | string;
  rooftopId?: string;
  rooftopName: string;
  branchCode?: string;
  frontlineReady?: boolean;
  isLiveOnWebsite?: boolean;
  isPriceReviewRequired?: boolean;
  photos?: string[];
  heroPhoto?: string;
  listingUrl?: string;
  salesperson?: string;
  actionReason?: string;
  recommendedAction?: string;
  rego?: string;
  softHold?: {
    holdId?: string;
    held: boolean;
    prospectName: string;
    notes?: string;
    consultant?: string;
    heldAt?: string;
    expiresAt?: string;
  };
}

export interface ActionItem {
  _id: string;
  actionType: 'PRICE' | 'WHOLESALE' | 'TRANSFER' | string;
  vin: string;
  stockNumber: string;
  vehicleTitle: string;
  rooftopId: string;
  rooftopName: string;
  targetRooftopName?: string;
  reason: string;
  impactMetric: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt?: string;
  resolvedNotes?: string;
}

export interface Rooftop {
  _id?: string;
  id?: string;
  rooftopId?: string;
  name: string;
  location?: string;
  brand?: string;
  dealerPrincipal?: string;
  generalManager?: string;
  dailyHoldingCostRate?: number;
  pentanaBranchCodes?: string[];
  active?: boolean;
}

export interface FeedLog {
  _id: string;
  feedType: string;
  scheduledWindow: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  totalPentanaRows: number;
  totalWebsiteRows: number;
  reconciledCount: number;
  quarantinedCount: number;
  newArrivalsCount?: number;
  soldExitsCount?: number;
  priceChangesCount?: number;
  durationMs: number;
  notes: string;
  createdAt: string;
}

export interface CsvSyncResult {
  success: boolean;
  filesProcessed: number;
  vehiclesProcessed: number;
  inserted: number;
  updated: number;
  totalInDb: number;
  actionsSynced: number;
  durationMs: number;
}

export interface Appointment {
  dealership?: string;
  _id: string;
  leadId?: string;
  prospectName: string;
  consultantName?: string;
  vehicle?: string;
  type: 'Test Drive' | 'Showroom Visit' | 'Delivery Handover' | 'Callback' | 'Walk-in' | 'Lunch';
  when: string;
  duration?: number;
  notes?: string;
  status: 'Booked' | 'Completed' | 'No Show' | 'Cancelled';
  createdAt?: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  role: string;
  position?: string;
  site: string;
  active: boolean;
  totalLeads: number;
  soldCount: number;
  followingUpCount: number;
  conversionRate: string;
  loadCapacity: number;
  initials: string;
}

export interface UnifiedSummary {
  crm: {
    totalLeads: number;
    followingUp: number;
    newLeads: number;
  };
  inventory: {
    totalVehicles: number;
    agingOver90Days: number;
    openActionItems: number;
  };
  system: {
    rooftopGroup: string;
    activeRooftops: number;
    lastSync: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'dealer_principal' | 'general_manager' | 'sales_manager' | 'manager' | 'sales_consultant' | 'super_admin' | 'contractor';
  canAllocate?: boolean;
  viewCost?: boolean;
  site: string;
  allowedSites: string[];
  avatar?: string;
  title?: string;
}

export interface PageMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

