export type PartStatus = 'preferred' | 'neutral' | 'not recommended';
export type VehicleStatus = 'active' | 'sold';
export type ServiceType = 'maintenance' | 'repair' | 'upgrade' | 'inspection' | 'other';
export type LineItemKind = 'part' | 'labour' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';
export type IssueSource = 'observed' | 'workshop';

export type Plan = 'free' | 'pro' | 'fleet' | 'workshop';
export type PaymentPlan = Exclude<Plan, 'free'> | 'other';
export type PaymentMethod = 'duitnow' | 'bank' | 'cash' | 'ewallet' | 'other';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastActiveAt?: string;
  // Only the admin can change these
  plan?: Plan;
  planExpiresAt?: string;
  adminNotes?: string;
}

export interface Payment {
  id: string;
  uid: string;
  email: string;
  plan: PaymentPlan;
  amount: number;
  // Months of subscription this payment buys; 0 for one-off purchases
  periodMonths: number;
  method: PaymentMethod;
  paidDate: string;
  reference?: string;
  notes?: string;
  recordedAt: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  name: string;
  plateNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  engineNumber?: string;
  purchaseDate?: string;
  purchaseMileage?: number;
  currentMileage?: number;
  mileageUpdatedAt?: string;
  roadTaxExpiry?: string;
  insuranceExpiry?: string;
  status?: VehicleStatus;
  soldDate?: string;
  notes?: string;
  createdAt: string;
}

export interface LineItem {
  description: string;
  kind: LineItemKind;
  quantity: number;
  unitPrice: number;
  warrantyUntil?: string;
}

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  ownerId: string;
  date: string;
  mileage: number;
  description: string;
  cost: number;
  serviceType?: ServiceType;
  scheduleIds?: string[];
  lineItems?: LineItem[];
  workshop?: string;
  workshopPhone?: string;
  workshopLocation?: string;
  invoiceNumber?: string;
  notes?: string;
  // Older records keep a single receipt here; new records use attachments
  receiptUrl?: string;
  attachments?: Attachment[];
  partIds?: string[];
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  ownerId: string;
  vehicleId: string;
  name: string;
  category?: string;
  intervalKm?: number;
  intervalMonths?: number;
  // Baseline for work done before it was logged in Pistyn (e.g. from the paper service book)
  lastDoneDate?: string;
  lastDoneMileage?: number;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  ownerId: string;
  vehicleId: string;
  title: string;
  details?: string;
  source: IssueSource;
  severity: IssueSeverity;
  status: IssueStatus;
  reportedDate: string;
  reportedMileage?: number;
  dueDate?: string;
  dueMileage?: number;
  resolvedDate?: string;
  createdAt: string;
}

export interface Part {
  id: string;
  ownerId: string;
  name: string;
  category?: string;
  purchaseLink?: string;
  notes?: string;
  price?: number;
  status: PartStatus;
  createdAt: string;
}

export type CollectionName = 'vehicles' | 'services' | 'parts' | 'schedules' | 'issues';
