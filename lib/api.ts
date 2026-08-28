const BASE = '/api';

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vtoken') || '';
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function reqForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function catalogQuery(q?: string, category?: string) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (category) qs.set('category', category);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function invoiceQuery(f: InvoiceListFilter) {
  const qs = new URLSearchParams();
  if (f.q) qs.set('q', f.q);
  if (f.status && f.status !== 'all') qs.set('status', f.status);
  if (f.payment && f.payment !== 'all') qs.set('payment', f.payment);
  if (f.from) qs.set('from', f.from);
  if (f.to) qs.set('to', f.to);
  if (f.limit != null) qs.set('limit', String(f.limit));
  if (f.offset) qs.set('offset', String(f.offset));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function productForm(d: Partial<UpsertProductInput>) {
  const form = new FormData();
  if (d.name !== undefined) form.set('name', d.name);
  if (d.category !== undefined) form.set('category', d.category);
  if (d.description !== undefined) form.set('description', d.description);
  if (d.price !== undefined) form.set('price', String(d.price));
  if (d.stock !== undefined) form.set('stock', String(d.stock));
  if (d.unit !== undefined) form.set('unit', d.unit);
  if (d.image) form.set('image', d.image);
  return form;
}

// --- tracking ---------------------------------------------------------------

export interface TrackerProtocolInfo {
  key: string;
  label: string;
  transport: 'tcp' | 'udp' | 'http';
  port: number;
  brands: string[];
  implemented: boolean;
  supportsCommands: boolean;
}

export interface TrackerDevice {
  id: string;
  uniqueId: string;
  name: string | null;
  protocol: string;
  model: string | null;
  simNumber: string | null;
  vehicleId: string | null;
  active: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  lastCourse: number | null;
  lastFixAt: string | null;
  lastSeenAt: string | null;
  lastAddress: string | null;
  attributes: Record<string, any> | null;
}

/** A device plus the online/offline judgement, as the fleet view needs it. */
export interface LiveDevice {
  id: string;
  uniqueId: string;
  name: string | null;
  protocol: string;
  vehicleId: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  course: number | null;
  fixAt: string | null;
  lastSeenAt: string | null;
  address: string | null;
  attributes: Record<string, any> | null;
  status: 'online' | 'offline' | 'unknown';
}

export interface TrackerPosition {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  satellites: number | null;
  valid: boolean;
  ignition: boolean | null;
  protocol: string;
  attributes: Record<string, any> | null;
  fixAt: string;
}

export interface TripSummary {
  points: number;
  distanceKm: number;
  movingMinutes: number;
  maxSpeed: number;
  from: string | null;
  to: string | null;
}

export const api = {
  tracking: {
    protocols: ()                          => req<TrackerProtocolInfo[]>('GET', '/tracking/protocols'),
    devices:   ()                          => req<TrackerDevice[]>('GET', '/tracking/devices'),
    live:      ()                          => req<LiveDevice[]>('GET', '/tracking/live'),
    claim:     (d: { uniqueId: string; name?: string; protocol?: string; vehicleId?: string; simNumber?: string; model?: string }) =>
                                              req<TrackerDevice>('POST', '/tracking/devices', d),
    update:    (id: string, d: Partial<TrackerDevice>) => req<TrackerDevice>('PATCH', `/tracking/devices/${id}`, d),
    remove:    (id: string)                => req<void>('DELETE', `/tracking/devices/${id}`),
    history:   (id: string, from: string, to: string) =>
                                              req<TrackerPosition[]>('GET', `/tracking/devices/${id}/positions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    summary:   (id: string, from: string, to: string) =>
                                              req<TripSummary>('GET', `/tracking/devices/${id}/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    /** EventSource cannot send an Authorization header, so the token rides in the query. */
    streamUrl: ()                          => `/api/tracking/stream?token=${encodeURIComponent(token())}`,
  },
  auth: {
    requestOtp: (phone: string)              => req<{ sent: boolean }>('POST', '/auth/otp/request', { phone }),
    register:   (d: RegisterInput)           => req<AuthRes>('POST', '/auth/register', d),
    login:      (phone: string, code: string) => req<AuthRes>('POST', '/auth/login', { phone, code }),
    me:         ()                           => req<User>('GET', '/auth/me'),
    updateProfile: (d: UpdateProfileInput)   => req<User>('PATCH', '/auth/me', d),
  },
  vehicles: {
    list:   ()                               => req<Vehicle[]>('GET', '/vehicles'),
    get:    (id: string)                     => req<Vehicle>('GET', `/vehicles/${id}`),
    create: (d: Partial<Vehicle>)            => req<Vehicle>('POST', '/vehicles', d),
    update: (id: string, d: Partial<Vehicle>) => req<Vehicle>('PATCH', `/vehicles/${id}`, d),
    remove: (id: string)                     => req<void>('DELETE', `/vehicles/${id}`),
  },
  records: {
    list:   (vid: string)                                => req<ServiceRecord[]>('GET', `/vehicles/${vid}/records`),
    create: (vid: string, d: Partial<ServiceRecord>)     => req<ServiceRecord>('POST', `/vehicles/${vid}/records`, d),
    update: (vid: string, id: string, d: Partial<ServiceRecord>) => req<ServiceRecord>('PATCH', `/vehicles/${vid}/records/${id}`, d),
    remove: (vid: string, id: string)                    => req<void>('DELETE', `/vehicles/${vid}/records/${id}`),
  },
  fuel: {
    list:   (vid: string)                         => req<FuelLog[]>('GET', `/vehicles/${vid}/fuel`),
    stats:  (vid: string)                         => req<FuelStats>('GET', `/vehicles/${vid}/fuel/stats`),
    create: (vid: string, d: Partial<FuelLog>)    => req<FuelLog>('POST', `/vehicles/${vid}/fuel`, d),
    remove: (vid: string, id: string)             => req<void>('DELETE', `/vehicles/${vid}/fuel/${id}`),
  },
  documents: {
    list:   (vid: string)                                    => req<VehicleDoc[]>('GET', `/vehicles/${vid}/documents`),
    create: (vid: string, d: Partial<VehicleDoc>)            => req<VehicleDoc>('POST', `/vehicles/${vid}/documents`, d),
    update: (vid: string, id: string, d: Partial<VehicleDoc>) => req<VehicleDoc>('PATCH', `/vehicles/${vid}/documents/${id}`, d),
    remove: (vid: string, id: string)                        => req<void>('DELETE', `/vehicles/${vid}/documents/${id}`),
  },
  agenda: {
    /** every reminder, expiring document and due service, across all vehicles */
    list: (days = 90) => req<AgendaItem[]>('GET', `/agenda?days=${days}`),
  },
  expenses: {
    summary: (months = 6) => req<ExpenseSummary>('GET', `/expenses?months=${months}`),
  },
  reminders: {
    list:   (vid: string)                       => req<Reminder[]>('GET', `/vehicles/${vid}/reminders`),
    create: (vid: string, d: Partial<Reminder>) => req<Reminder>('POST', `/vehicles/${vid}/reminders`, d),
    toggle: (vid: string, id: string)           => req<Reminder>('PATCH', `/vehicles/${vid}/reminders/${id}/toggle`, {}),
    remove: (vid: string, id: string)           => req<void>('DELETE', `/vehicles/${vid}/reminders/${id}`),
  },
  ai: {
    ask: (vid: string, question: string) => req<{ answer: string }>('POST', `/vehicles/${vid}/ask`, { question }),
  },
  access: {
    list:   (vid: string)             => req<VehicleAccessEntry[]>('GET', `/vehicles/${vid}/access`),
    revoke: (vid: string, id: string) => req<void>('DELETE', `/vehicles/${vid}/access/${id}`),
  },
  invites: {
    create: (vid: string)     => req<Invite>('POST', `/vehicles/${vid}/invites`),
    redeem: (code: string)    => req<{ vehicleId: string; make: string; model: string }>('POST', '/invites/redeem', { code }),
  },
  invoices: {
    upsert: (vid: string, recordId: string, d: UpsertInvoiceInput) =>
      req<Invoice>('POST', `/vehicles/${vid}/records/${recordId}/invoice`, d),
    get:    (vid: string, recordId: string) => req<Invoice>('GET', `/vehicles/${vid}/records/${recordId}/invoice`),
    remove: (vid: string, recordId: string) => req<void>('DELETE', `/vehicles/${vid}/records/${recordId}/invoice`),
    approve: (vid: string, recordId: string) =>
      req<Invoice>('POST', `/vehicles/${vid}/records/${recordId}/invoice/approve`, {}),
    reject: (vid: string, recordId: string, reason: string) =>
      req<Invoice>('POST', `/vehicles/${vid}/records/${recordId}/invoice/reject`, { reason }),
    addPayment: (vid: string, recordId: string, d: AddPaymentInput) =>
      req<Invoice>('POST', `/vehicles/${vid}/records/${recordId}/invoice/payments`, d),
    payments: (vid: string, recordId: string) =>
      req<InvoicePayment[]>('GET', `/vehicles/${vid}/records/${recordId}/invoice/payments`),
    removePayment: (vid: string, recordId: string, paymentId: string) =>
      req<Invoice>('DELETE', `/vehicles/${vid}/records/${recordId}/invoice/payments/${paymentId}`),
  },
  mechanic: {
    stats:        ()                              => req<MechanicStats>('GET', '/mechanic/stats'),
    customers:    ()                              => req<MechanicCustomer[]>('GET', '/mechanic/customers'),
    expenses:           (from?: string, to?: string) =>
      req<WorkshopExpense[]>('GET', `/mechanic/expenses${from && to ? `?from=${from}&to=${to}` : ''}`),
    expenseCategories:  () => req<{ key: ExpenseCategory; label: string }[]>('GET', '/mechanic/expenses/categories'),
    addExpense:         (d: WorkshopExpenseInput) => req<WorkshopExpense>('POST', '/mechanic/expenses', d),
    updateExpense:      (id: string, d: WorkshopExpenseInput) => req<WorkshopExpense>('PATCH', `/mechanic/expenses/${id}`, d),
    removeExpense:      (id: string) => req<void>('DELETE', `/mechanic/expenses/${id}`),
    accounting:   (months = 6)                    => req<MechanicAccounting>('GET', `/mechanic/accounting?months=${months}`),
    invoices:       (f: InvoiceListFilter = {})     => req<MechanicInvoiceList>('GET', `/mechanic/invoices${invoiceQuery(f)}`),
    invoice:        (id: string)                    => req<MechanicInvoiceDetail>('GET', `/mechanic/invoices/${id}`),
    createInvoice:  (d: MechanicInvoiceInput)       => req<MechanicInvoiceDetail>('POST', '/mechanic/invoices', d),
    updateInvoice:  (id: string, d: MechanicInvoiceInput) => req<MechanicInvoiceDetail>('PATCH', `/mechanic/invoices/${id}`, d),
    removeInvoice:  (id: string)                    => req<void>('DELETE', `/mechanic/invoices/${id}`),
    listVehicles: ()                              => req<MechanicVehicle[]>('GET', '/mechanic/vehicles'),
    getVehicle:   (id: string)                    => req<MechanicVehicleDetail>('GET', `/mechanic/vehicles/${id}`),
    createVehicle: (d: CreateMechanicVehicleInput) => req<MechanicVehicleDetail>('POST', '/mechanic/vehicles', d),
  },
  notifications: {
    /** The bell's glance: newest few. */
    list:         ()                 => req<AppNotification[]>('GET', '/notifications'),
    /** The page: filtered and paged, with the counts behind each chip. */
    inbox:        (q: InboxQuery = {}) => {
      const qs = new URLSearchParams();
      if (q.page !== undefined) qs.set('page', String(q.page));
      if (q.pageSize !== undefined) qs.set('pageSize', String(q.pageSize));
      if (q.category && q.category !== 'all') qs.set('category', q.category);
      if (q.unreadOnly) qs.set('unreadOnly', 'true');
      const query = qs.toString();
      return req<NotificationInbox>('GET', `/notifications/inbox${query ? `?${query}` : ''}`);
    },
    unreadCount:  ()                 => req<{ count: number }>('GET', '/notifications/unread-count'),
    /** No id means every unread one. Returns what is left, rather than assuming zero. */
    read:         (id?: string)      => req<{ unread: number }>('POST', '/notifications/read', id ? { id } : {}),
    markRead:     (id: string)       => req<AppNotification>('POST', `/notifications/${id}/read`, {}),
    confirm:      (id: string)       => req<AppNotification>('POST', `/notifications/${id}/confirm`, {}),
    reject:       (id: string)       => req<AppNotification>('POST', `/notifications/${id}/reject`, {}),
    /** EventSource cannot send an Authorization header, so the token rides in the query. */
    streamUrl:    ()                 => `/api/notifications/stream?token=${encodeURIComponent(token())}`,
  },
  reviews: {
    list:    (mechanicId: string)                        => req<MechanicReview[]>('GET', `/mechanics/${mechanicId}/reviews`),
    summary: (mechanicId: string)                        => req<RatingSummary>('GET', `/mechanics/${mechanicId}/reviews/summary`),
    mine:    (mechanicId: string)                         => req<MechanicReview | null>('GET', `/mechanics/${mechanicId}/reviews/mine`),
    upsert:  (mechanicId: string, d: { rating: number; comment?: string }) => req<MechanicReview>('POST', `/mechanics/${mechanicId}/reviews`, d),
  },
  workshops: {
    search: (params: { lat?: number; lng?: number; q?: string; serviceType?: string; mode?: ServiceMode }) => {
      const qs = new URLSearchParams();
      if (params.lat !== undefined) qs.set('lat', String(params.lat));
      if (params.lng !== undefined) qs.set('lng', String(params.lng));
      if (params.q) qs.set('q', params.q);
      if (params.serviceType) qs.set('serviceType', params.serviceType);
      if (params.mode) qs.set('mode', params.mode);
      const query = qs.toString();
      return req<Workshop[]>('GET', `/workshops${query ? `?${query}` : ''}`);
    },
    detail: (id: string) => req<WorkshopDetail>('GET', `/workshops/${id}`),
  },
  mechanicServices: {
    list:   ()                              => req<MechanicServiceOffering[]>('GET', '/mechanic/services'),
    importPresets: (items: ImportServiceItem[]) => req<ImportResult>('POST', '/mechanic/services/import', { items }),
    create: (d: UpsertMechanicServiceInput) => req<MechanicServiceOffering>('POST', '/mechanic/services', d),
    update: (id: string, d: Partial<UpsertMechanicServiceInput>) => req<MechanicServiceOffering>('PATCH', `/mechanic/services/${id}`, d),
    remove: (id: string)                    => req<void>('DELETE', `/mechanic/services/${id}`),
  },
  appointments: {
    mine:    ()                                  => req<Appointment[]>('GET', '/appointments/mine'),
    create:  (d: CreateAppointmentInput)         => req<Appointment>('POST', '/appointments', d),
    respond: (id: string, status: 'confirmed' | 'rejected') => req<Appointment>('POST', `/appointments/${id}/respond`, { status }),
    complete:(id: string)                        => req<Appointment>('POST', `/appointments/${id}/complete`, {}),
    cancel:  (id: string)                        => req<Appointment>('POST', `/appointments/${id}/cancel`, {}),
  },
  messages: {
    listAsOwner:    (vid: string, mechanicId: string) => req<ChatMessage[]>('GET', `/vehicles/${vid}/messages?mechanicId=${mechanicId}`),
    sendAsOwner:    (vid: string, mechanicId: string, body: string) => req<ChatMessage>('POST', `/vehicles/${vid}/messages`, { mechanicId, body }),
    listAsMechanic: (vid: string) => req<ChatMessage[]>('GET', `/mechanic/vehicles/${vid}/messages`),
    sendAsMechanic: (vid: string, body: string) => req<ChatMessage>('POST', `/mechanic/vehicles/${vid}/messages`, { body }),
    unreadCount:    () => req<{ count: number }>('GET', '/messages/unread-count'),
    conversations:  () => req<Conversation[]>('GET', '/messages/conversations'),
  },
  push: {
    vapidKey:   () => req<{ key: string }>('GET', '/push/vapid-public-key'),
    subscribe:  (sub: PushSubscriptionJSON) => req<{ ok: boolean }>('POST', '/push/subscribe', sub),
    unsubscribe:(endpoint: string) => req<{ ok: boolean }>('DELETE', '/push/subscribe', { endpoint }),
  },
  catalog: {
    parts:    (q?: string, category?: string) => req<CatalogPage<PresetPart>>('GET', `/catalog/parts${catalogQuery(q, category)}`),
    products: (q?: string, category?: string) => req<CatalogPage<PresetProduct>>('GET', `/catalog/products${catalogQuery(q, category)}`),
    services: (q?: string, category?: string) => req<CatalogPage<PresetService>>('GET', `/catalog/services${catalogQuery(q, category)}`),
  },
  parts: {
    list:   (q?: string) => req<Part[]>('GET', `/mechanic/parts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    importPresets: (items: ImportPartItem[]) => req<ImportResult>('POST', '/mechanic/parts/import', { items }),
    create: (d: Partial<Part>) => req<Part>('POST', '/mechanic/parts', d),
    update: (id: string, d: Partial<Part>) => req<Part>('PATCH', `/mechanic/parts/${id}`, d),
    remove: (id: string) => req<void>('DELETE', `/mechanic/parts/${id}`),
  },
  organizations: {
    mine:           ()                            => req<OrganizationSummary[]>('GET', '/organizations/mine'),
    create:         (name: string)                => req<OrganizationSummary>('POST', '/organizations', { name }),
    members:        (id: string)                  => req<OrgMember[]>('GET', `/organizations/${id}/members`),
    addMember:      (id: string, phone: string, role?: 'admin' | 'driver') => req<OrgMember>('POST', `/organizations/${id}/members`, { phone, role }),
    removeMember:   (id: string, userId: string)  => req<void>('DELETE', `/organizations/${id}/members/${userId}`),
    vehicles:       (id: string)                  => req<Vehicle[]>('GET', `/organizations/${id}/vehicles`),
    assignVehicle:  (id: string, vehicleId: string)   => req<Vehicle>('POST', `/organizations/${id}/vehicles/${vehicleId}`),
    unassignVehicle:(id: string, vehicleId: string)   => req<void>('DELETE', `/organizations/${id}/vehicles/${vehicleId}`),
  },
  payments: {
    pay: (vid: string, recordId: string) => req<{ paymentUrl: string }>('POST', `/vehicles/${vid}/records/${recordId}/invoice/pay`, {}),
  },
  geocode: {
    reverse: (lat: number, lng: number) => req<{ address: string | null }>('GET', `/geocode/reverse?lat=${lat}&lng=${lng}`),
  },
  products: {
    list:      (q?: string) => req<Product[]>('GET', `/seller/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    importPresets: (items: ImportProductItem[]) => req<ImportResult>('POST', '/seller/products/import', { items }),
    create:    (d: UpsertProductInput) => reqForm<Product>('POST', '/seller/products', productForm(d)),
    update:    (id: string, d: Partial<UpsertProductInput>) => reqForm<Product>('PATCH', `/seller/products/${id}`, productForm(d)),
    setActive: (id: string, active: boolean) => req<Product>('PATCH', `/seller/products/${id}/active`, { active }),
    remove:    (id: string) => req<void>('DELETE', `/seller/products/${id}`),
  },
  sales: {
    list:       ()                        => req<Sale[]>('GET', '/seller/sales'),
    create:     (d: CreateSaleInput)      => req<Sale>('POST', '/seller/sales', d),
    setPaid:    (id: string, paidAmount: number) => req<Sale>('PATCH', `/seller/sales/${id}/paid`, { paidAmount }),
    remove:     (id: string)              => req<void>('DELETE', `/seller/sales/${id}`),
    customers:  ()                        => req<SellerCustomer[]>('GET', '/seller/customers'),
    accounting: (months = 6)              => req<SellerAccounting>('GET', `/seller/accounting?months=${months}`),
  },
};

/* ── agenda / expenses ─────────────────────────────────────────── */
export type AgendaKind = 'reminder' | 'document' | 'service';
export interface AgendaItem {
  id: string; kind: AgendaKind; title: string;
  dueDate: string | null; daysLeft: number | null; dueMileage: number | null;
  priority: 'low' | 'medium' | 'high';
  vehicleId: string; vehicleName: string; plateNumber?: string;
  completable: boolean;
}

export interface ExpenseMonth { month: string; service: number; fuel: number; total: number }
export interface ExpenseSummary {
  monthly: ExpenseMonth[];
  totalService: number; totalFuel: number; total: number;
  byVehicle: { vehicleId: string; label: string; plateNumber: string | null; service: number; fuel: number; total: number }[];
  recent: { date: string; label: string; amount: number; kind: 'service' | 'fuel'; vehicleId: string; vehicleName: string }[];
}

/* ── provider books ────────────────────────────────────────────── */
export interface MechanicCustomer {
  key: string; name: string; phone: string | null; registered: boolean;
  vehicleCount: number; vehicles: { id: string; label: string; plateNumber: string | null }[];
  serviceCount: number; lastServiceDate: string | null;
  totalInvoiced: number; outstanding: number;
}
export type ExpenseCategory =
  | 'rent' | 'payroll' | 'utilities' | 'parts' | 'tools' | 'maintenance'
  | 'transport' | 'marketing' | 'tax' | 'insurance' | 'other';

export interface WorkshopExpense {
  id: string; category: ExpenseCategory; amount: number; spentAt: string;
  description?: string | null; recurring: boolean; reference?: string | null; createdAt: string;
}
export interface WorkshopExpenseInput {
  amount: number; category?: ExpenseCategory; spentAt?: string;
  description?: string; recurring?: boolean; reference?: string;
}

export interface MechanicAccounting {
  monthly: {
    month: string; invoiced: number; collected: number;
    labor: number; parts: number; discount: number; tax: number;
    awaiting: number; awaitingCount: number;
    expenses: number; profit: number;
  }[];
  /** Workshop costs — what turns revenue into profit. */
  expenses: { lifetime: number; byCategory: { key: ExpenseCategory; label: string; amount: number }[] };
  /** Approved revenue − workshop costs. Negative means a loss. */
  profit: number;
  lifetimeInvoiced: number; lifetimeCollected: number; outstanding: number; unpaidCount: number;
  /** Lifetime split of approved revenue. */
  breakdown: { labor: number; parts: number; discount: number; tax: number };
  /** Billed but not yet accepted by the customer — not counted as revenue. */
  awaitingApproval: { amount: number; count: number };
  rejected: { amount: number; count: number };
  unpaidInvoices: {
    invoiceId: string; vehicleId: string; recordId: string; invoiceNumber: string | null;
    serviceType: string; serviceDate: string;
    vehicle: string; plateNumber: string | null;
    customerName: string; customerPhone: string | null;
    total: number; paid: number; remaining: number;
  }[];
}

/* ── seller books ──────────────────────────────────────────────── */
export interface SaleLine { id?: string; productId?: string | null; name: string; quantity: number; unitPrice: number }
export interface Sale {
  id: string; customerName: string | null; customerPhone: string | null;
  soldAt: string; discount: number; paidAmount: number; notes: string | null;
  items: SaleLine[]; subtotal: number; total: number; remaining: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid'; createdAt: string;
}
export interface CreateSaleInput {
  customerName?: string; customerPhone?: string; soldAt?: string;
  discount?: number; paidAmount?: number; notes?: string;
  items: { productId?: string; name?: string; quantity: number; unitPrice?: number }[];
}
export interface SellerCustomer {
  key: string; name: string; phone: string | null;
  purchaseCount: number; lastPurchase: string | null; totalSpent: number; outstanding: number;
}
export interface SellerAccounting {
  monthly: { month: string; sold: number; collected: number; count: number }[];
  lifetimeSold: number; lifetimeCollected: number; outstanding: number; unpaidCount: number;
  unpaidSales: Sale[];
  lowStock: { id: string; name: string; stock: number; unit: string }[];
}

export function productImageUrl(path?: string | null): string | undefined {
  return path ? `${BASE}${path}` : undefined;
}

export async function downloadPdf(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error('دانلود فایل با خطا مواجه شد');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export type Role = 'owner' | 'mechanic' | 'seller';

export interface RegisterInput {
  phone: string; code: string; name: string; role?: Role; workshopName?: string; workshopAddress?: string;
}

export interface Product {
  id: string; name: string; category?: string; description?: string;
  price: number; stock: number; unit: string; imageUrl?: string; active: boolean; createdAt: string;
}
export interface UpsertProductInput {
  name: string; category?: string; description?: string; price: number; stock?: number; unit?: string; image?: File;
}

export interface AuthRes { access_token: string; user: User }
export interface User {
  id: string; phone: string; name: string; role: Role;
  workshopName?: string | null; workshopAddress?: string | null;
  workshopLat?: number | null; workshopLng?: number | null;
  smsNotifications?: boolean;
}
export interface UpdateProfileInput {
  name?: string;
  workshopName?: string; workshopAddress?: string;
  workshopLat?: number; workshopLng?: number;
  smsNotifications?: boolean;
}

export interface MechanicStats {
  vehicles: number; servicesThisMonth: number; invoicedThisMonth: number; pendingAppointments: number;
}

export interface MechanicReview { id: string; rating: number; comment?: string; createdAt: string; ownerName?: string }
export interface RatingSummary { avg: number; count: number }

export interface Workshop {
  id: string; workshopName?: string; workshopAddress?: string;
  workshopLat?: number | null; workshopLng?: number | null;
  rating: number; reviewCount: number; distanceKm?: number | null;
}

export interface WorkshopDetail extends Workshop {
  phone?: string;
  services: MechanicServiceOffering[];
}

export type ServiceMode = 'in_shop' | 'on_site';
export interface MechanicServiceOffering {
  id: string; serviceType: string; customName?: string; price?: number;
  supportsInShop: boolean; supportsOnSite: boolean; createdAt: string;
}
export interface UpsertMechanicServiceInput {
  serviceType: string; customName?: string; price?: number;
  supportsInShop?: boolean; supportsOnSite?: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
export interface Appointment {
  id: string; vehicleId: string; ownerId: string; mechanicId: string;
  requestedAt: string; serviceType?: string; notes?: string; status: AppointmentStatus; createdAt: string;
  mode: ServiceMode; address?: string; lat?: number; lng?: number;
  vehicle?: { make: string; model: string; year: number; plateNumber?: string };
  mechanic?: { name: string; workshopName?: string; phone: string };
  owner?: { name: string; phone: string };
  /** Set once completed — the service record this booking produced, so the UI can jump to its bill. */
  serviceRecordId?: string | null;
}
export interface CreateAppointmentInput {
  vehicleId: string; mechanicId: string; requestedAt: string; serviceType?: string; notes?: string;
  mode?: ServiceMode; address?: string; lat?: number; lng?: number;
}

export interface ChatMessage {
  id: string; vehicleId: string; mechanicId: string; senderId: string;
  senderRole: 'owner' | 'mechanic'; body: string; read: boolean; createdAt: string;
}

export interface Conversation {
  vehicleId: string; mechanicId: string;
  vehicle: { make: string; model: string; year: number; plateNumber?: string };
  counterpartName: string;
  lastMessage?: string; lastMessageAt?: string;
  unreadCount: number;
}

export interface PushSubscriptionJSON { endpoint: string; keys: { p256dh: string; auth: string } }

export interface Part { id: string; name: string; category?: string; sku?: string; unit: string; unitPrice: number; quantity: number; inStock: boolean; createdAt: string }

/* ── کاتالوگ آماده (لیست‌های مرجع قطعات / خدمات / کالاها) ────────── */
export interface CatalogPage<T> { categories: string[]; items: T[] }
export interface PresetPart {
  key: string; name: string; category: string; unit: string; suggestedPrice: number;
}
export interface PresetProduct {
  key: string; name: string; category: string; unit: string; suggestedPrice: number; description?: string;
}
export interface PresetService {
  key: string; serviceType: string; customName?: string; category: string;
  suggestedPrice: number; supportsInShop: boolean; supportsOnSite: boolean;
}
export interface ImportPartItem    { key: string; unitPrice?: number; quantity?: number }
export interface ImportProductItem { key: string; price?: number; stock?: number }
export interface ImportServiceItem { key: string; price?: number; supportsInShop?: boolean; supportsOnSite?: boolean }
export interface ImportResult { added: number; skipped: number }

export interface OrganizationSummary { id: string; name: string; role: 'admin' | 'driver'; createdAt: string }
export interface OrgMember { id: string; userId: string; name: string; phone: string; role: 'admin' | 'driver' }

export type LinkStatus = 'none' | 'pending' | 'rejected';

export interface Vehicle {
  id: string; make: string; model: string; year: number;
  plateNumber?: string; vin?: string; color?: string; currentMileage: number; notes?: string;
  fuelType?: string; engineCapacity?: string; transmission?: string;
  insuranceExpiry?: string; technicalExpiry?: string; registrationExpiry?: string;
  createdAt: string; serviceRecords?: ServiceRecord[];
  linkStatus?: LinkStatus; customerName?: string;
}

export type InvoiceStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque';

export interface InvoicePayment {
  id: string; amount: number; method: PaymentMethod;
  reference?: string | null; note?: string | null; dueDate?: string | null; createdAt: string;
}
export interface AddPaymentInput {
  amount: number; method?: PaymentMethod; reference?: string; note?: string; dueDate?: string;
}

export interface InvoiceSummary {
  subtotal: number; discount: number; tax: number; total: number;
  paidAmount: number; remaining: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid'; itemCount: number;
  /** Where the bill stands with the customer — drives whether the UI warns before editing. */
  status: InvoiceStatus;
  rejectionReason?: string | null;
}

export interface ServiceRecord {
  id: string; vehicleId: string; serviceType: string; serviceDate: string;
  mileage: number; description?: string; cost?: number; workshop?: string;
  nextServiceMileage?: number; nextServiceDate?: string; createdAt: string;
  createdByUserId?: string | null; createdByRole?: Role | null; createdByName?: string;
  invoice?: InvoiceSummary;
}

export interface InvoiceItem { id?: string; type: 'part' | 'labor'; name: string; quantity: number; unitPrice: number }
export interface UpsertInvoiceInput { discount?: number; taxPercent?: number; paidAmount?: number; notes?: string; items: InvoiceItem[] }
export interface Invoice {
  id: string; serviceRecordId: string; createdByUserId?: string; discount: number; paidAmount: number;
  notes?: string; createdAt: string; items: InvoiceItem[]; subtotal: number; total: number;
  taxPercent?: number; tax?: number; laborTotal?: number; partsTotal?: number; remaining?: number;
  status?: InvoiceStatus; approvedAt?: string | null; rejectedAt?: string | null; rejectionReason?: string | null;
  number?: string | null; payments?: InvoicePayment[];
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

/* ── دفتر فاکتورهای تعمیرگاه (بخش حسابداری) ─────────────────────── */
export type InvoiceStatusFilter = 'all' | InvoiceStatus;
export type PaymentFilter = 'all' | 'unpaid' | 'partial' | 'paid';

export interface InvoiceListFilter {
  q?: string; status?: InvoiceStatusFilter; payment?: PaymentFilter;
  from?: string; to?: string; limit?: number; offset?: number;
}

export interface MechanicInvoiceRow {
  id: string; number: string | null;
  vehicleId: string; recordId: string;
  serviceType: string; serviceDate: string;
  vehicle: string; plateNumber: string | null;
  customerName: string; customerPhone: string | null;
  subtotal: number; discount: number; taxPercent: number; tax: number;
  labor: number; parts: number;
  total: number; paid: number; remaining: number;
  status: InvoiceStatus;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  itemCount: number; notes: string | null; createdAt: string;
}

export interface MechanicInvoiceList {
  rows: MechanicInvoiceRow[];
  count: number;
  hasMore: boolean;
  /** Totals over everything matching the filter, not just the loaded page. */
  summary: { count: number; total: number; paid: number; remaining: number };
}

/** The bill plus the service and customer it belongs to. */
export interface MechanicInvoiceDetail extends Invoice {
  vehicleId: string; recordId: string;
  serviceType: string; serviceDate: string; mileage: number; description: string | null;
  vehicle: string; plateNumber: string | null;
  customerName: string; customerPhone: string | null;
}

export interface MechanicInvoiceInput {
  /** Only when creating — an existing bill stays on its own service record. */
  vehicleId?: string;
  serviceType?: string; serviceDate?: string; mileage?: number; description?: string;
  discount?: number; taxPercent?: number; notes?: string;
  items: InvoiceItem[];
}

export interface Invite { id: string; code: string; expiresAt: string; vehicleId: string }
export interface VehicleAccessEntry {
  id: string; mechanicId: string; workshopName?: string; workshopAddress?: string; mechanicPhone?: string; grantedAt: string;
}

export interface MechanicVehicle {
  accessId: string; vehicleId: string; make: string; model: string; year: number;
  plateNumber?: string; currentMileage: number; ownerName?: string; grantedAt: string;
  linkStatus?: LinkStatus; customerName?: string;
}
export interface MechanicVehicleDetail {
  id: string; make: string; model: string; year: number; plateNumber?: string; color?: string;
  currentMileage: number; fuelType?: string; engineCapacity?: string; transmission?: string;
  ownerName?: string; serviceRecords: ServiceRecord[];
  linkStatus?: LinkStatus; customerName?: string;
}
export interface CreateMechanicVehicleInput {
  make: string; model: string; year: number;
  plateNumber?: string; customerName?: string; color?: string; currentMileage?: number; notes?: string;
}

/**
 * The subject a notification is about. The API derives it from the type, so
 * the filter chips stay stable while new event types keep being added.
 */
export type NotificationCategory =
  | 'link' | 'appointment' | 'invoice' | 'message' | 'tracker' | 'reminder' | 'other';

export interface AppNotification {
  id: string; type: string; category: NotificationCategory;
  status: 'pending' | 'confirmed' | 'rejected';
  title: string; body: string; read: boolean; createdAt: string;
  /** Where tapping it goes. Decided by the sender, null when it is answered in place. */
  url: string | null;
  /** Shape depends on the type; every id the destination screen might need. */
  data?: Record<string, string | number | undefined> | null;
}

export interface NotificationInbox {
  items: AppNotification[];
  total: number;
  unread: number;
  /** Keyed by category, plus `all`. Missing means none of that kind. */
  counts: Record<string, number>;
}

export interface InboxQuery {
  page?: number;
  pageSize?: number;
  category?: NotificationCategory | 'all';
  unreadOnly?: boolean;
}

export interface FuelLog {
  id: string; vehicleId: string; date: string; liters: number;
  cost?: number; mileage: number; isFullTank: boolean; station?: string; notes?: string; createdAt: string;
}
export interface FuelStats { avgConsumption: number | null; totalCost: number; totalLiters: number }

export interface VehicleDoc {
  id: string; vehicleId: string; type: string; title: string;
  issueDate?: string; expiryDate?: string; notes?: string; createdAt: string;
}

export interface Reminder {
  id: string; vehicleId: string; title: string; description?: string;
  dueMileage?: number; dueDate?: string; isCompleted: boolean; priority: string; createdAt: string;
}

export const SERVICE_TYPES = [
  'چکاپ قبل سفر', 'تعویض روغن موتور', 'تعویض لاستیک', 'تعمیر ترمز', 'تعویض فیلتر هوا',
  'تعویض شمع', 'سرویس گیربکس', 'تعویض تایمینگ', 'تعویض باتری',
  'تنظیم موتور', 'سرویس کولر', 'صافکاری و رنگ', 'سرویس جلوبندی', 'سایر',
];

export const DOC_TYPES = [
  { value: 'insurance',    label: 'بیمه شخص ثالث', icon: '🛡️' },
  { value: 'technical',    label: 'معاینه فنی',    icon: '🔍' },
  { value: 'registration', label: 'کارت خودرو',    icon: '📄' },
  { value: 'warranty',     label: 'ضمانت‌نامه',    icon: '✅' },
  { value: 'other',        label: 'سایر',           icon: '📎' },
];

export const FUEL_TYPES = ['بنزین', 'گازوئیل', 'گاز (CNG)', 'دوگانه‌سوز', 'هیبرید', 'برقی'];
export const COLORS     = ['سفید', 'مشکی', 'نقره‌ای', 'خاکستری', 'قرمز', 'آبی', 'سبز', 'زرد', 'سرمه‌ای'];
export const COLORS_HEX: Record<string, string> = {
  سفید: '#f4f4f5', مشکی: '#27272a', 'نقره‌ای': '#a1a1aa', خاکستری: '#6b7280',
  قرمز: '#ef4444', آبی: '#3b82f6', سبز: '#22c55e', زرد: '#eab308', 'سرمه‌ای': '#1e3a5f',
};

export function toJalali(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function expiryStatus(days: number | null): 'ok' | 'warn' | 'danger' | 'expired' {
  if (days === null) return 'ok';
  if (days < 0)  return 'expired';
  if (days < 14) return 'danger';
  if (days < 30) return 'warn';
  return 'ok';
}
