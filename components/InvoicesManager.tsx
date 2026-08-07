'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  api, toJalali, downloadPdf, SERVICE_TYPES,
  InvoiceItem, InvoiceStatus, MechanicInvoiceRow, MechanicInvoiceDetail,
  MechanicVehicle, Part, PaymentMethod, InvoiceStatusFilter, PaymentFilter,
} from '@/lib/api';
import PersianDatePicker from './PersianDatePicker';
import PartsCatalogPicker from './PartsCatalogPicker';
import {
  C, alpha, Card, Button, IconButton, FormField, Input, Select, Sheet, Spinner, Money, toman,
} from './ui';
import {
  WalletIcon, PlusIcon, XIcon, BoxIcon, TrashIcon, PhoneIcon, CarIcon,
  CheckIcon, AlertTriangleIcon, SearchIcon, DownloadIcon, WrenchIcon,
} from './icons';

/**
 * The workshop's invoice book.
 *
 * Accounting used to show only unpaid approved bills, so a settled or still-pending invoice
 * could not be found from there at all — the mechanic had to remember which car it belonged
 * to. This lists every bill, and lets one be issued, corrected, paid against or deleted
 * without leaving the screen.
 */

const PAGE = 20;

const STATUS_META: Record<InvoiceStatus, { label: string; color: string }> = {
  pending:  { label: 'در انتظار تأیید', color: C.statusWarn },
  approved: { label: 'تأییدشده',        color: C.green },
  rejected: { label: 'ردشده',           color: C.statusExpired },
};

const PAYMENT_META: Record<'unpaid' | 'partial' | 'paid', { label: string; color: string }> = {
  unpaid:  { label: 'پرداخت‌نشده', color: C.statusExpired },
  partial: { label: 'نیمه‌پرداخت', color: C.statusWarn },
  paid:    { label: 'تسویه‌شده',   color: C.green },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'نقدی', card: 'کارتخوان', transfer: 'کارت به کارت', cheque: 'چک',
};

const STATUS_FILTERS: { key: InvoiceStatusFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'pending', label: 'در انتظار تأیید' },
  { key: 'approved', label: 'تأییدشده' },
  { key: 'rejected', label: 'ردشده' },
];

const PAYMENT_FILTERS: { key: PaymentFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'unpaid', label: 'پرداخت‌نشده' },
  { key: 'partial', label: 'نیمه‌پرداخت' },
  { key: 'paid', label: 'تسویه‌شده' },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Chips<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              flexShrink: 0, padding: '6px 13px', borderRadius: 11,
              fontSize: 11.5, fontWeight: on ? 800 : 600, whiteSpace: 'nowrap',
              background: on ? alpha(C.green, 14) : C.fill1,
              border: `1px solid ${on ? alpha(C.green, 34) : C.border}`,
              color: on ? C.green : C.muted,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 7, whiteSpace: 'nowrap',
      color, background: alpha(color, 12), border: `1px solid ${alpha(color, 22)}`,
    }}>
      {label}
    </span>
  );
}

export default function InvoicesManager({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<MechanicInvoiceRow[]>([]);
  const [summary, setSummary] = useState({ count: 0, total: 0, paid: 0, remaining: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InvoiceStatusFilter>('all');
  const [payment, setPayment] = useState<PaymentFilter>('all');

  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MechanicInvoiceDetail | null>(null);
  const [creating, setCreating] = useState(false);

  const filter = useMemo(() => ({ q, status, payment }), [q, status, payment]);
  const reqId = useRef(0);

  const load = useCallback(async (offset = 0) => {
    const mine = ++reqId.current;
    offset === 0 ? setLoading(true) : setPaging(true);
    try {
      const res = await api.mechanic.invoices({ ...filter, limit: PAGE, offset });
      if (mine !== reqId.current) return;   // a newer filter already went out
      setRows(prev => (offset === 0 ? res.rows : [...prev, ...res.rows]));
      setSummary(res.summary);
      setHasMore(res.hasMore);
      setError('');
    } catch (err: any) {
      if (mine === reqId.current) setError(err.message);
    } finally {
      if (mine === reqId.current) { setLoading(false); setPaging(false); }
    }
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(() => load(0), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  function refresh() {
    load(0);
    onChanged?.();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h2 style={{ color: C.text2, fontSize: 13, fontWeight: 700, margin: 0 }}>
          همه فاکتورها <span style={{ color: C.subtle, fontWeight: 600 }}>({summary.count.toLocaleString('fa-IR')})</span>
        </h2>
        <Button size="sm" onClick={() => setCreating(true)} icon={<PlusIcon size={14} />}>فاکتور جدید</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 11 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو: نام مشتری، پلاک، شماره فاکتور..." />
        <Chips options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <Chips options={PAYMENT_FILTERS} value={payment} onChange={setPayment} />
      </div>

      {/* Totals for the filter, not the page — otherwise "این فیلتر چقدر می‌شود" has no answer. */}
      {summary.count > 0 && (
        <Card padding="10px 13px" style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            {([
              ['جمع فاکتورها', summary.total, C.text],
              ['دریافت‌شده', summary.paid, C.statusMint],
              ['مانده', summary.remaining, summary.remaining > 0 ? C.statusWarn : C.muted],
            ] as [string, number, string][]).map(([label, value, color]) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: C.subtle, margin: 0 }}>{label}</p>
                <Money amount={value} color={color} size={13} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div style={{
          fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10),
          border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px', marginBottom: 10,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card padding="26px 18px" style={{ textAlign: 'center' }}>
          <SearchIcon size={22} />
          <p style={{ fontSize: 12.5, color: C.muted, margin: '9px 0 0' }}>
            {q || status !== 'all' || payment !== 'all' ? 'فاکتوری با این فیلتر پیدا نشد' : 'هنوز فاکتوری صادر نکرده‌ای'}
          </p>
          {!q && status === 'all' && payment === 'all' && (
            <Button size="sm" onClick={() => setCreating(true)} icon={<PlusIcon size={14} />} style={{ marginTop: 12 }}>
              صدور اولین فاکتور
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(inv => {
            const st = STATUS_META[inv.status];
            const pay = PAYMENT_META[inv.paymentStatus];
            return (
              <Card
                key={inv.id}
                padding="12px 14px"
                onClick={() => setOpenId(inv.id)}
                ariaLabel={`فاکتور ${inv.number ?? ''} — ${inv.customerName}`}
                style={{ cursor: 'pointer', borderInlineStart: `3px solid ${st.color}` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                    background: alpha(st.color, 12), border: `1px solid ${alpha(st.color, 25)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color,
                  }}><WalletIcon size={16} /></div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: 0 }}>{inv.customerName}</p>
                      <Badge label={st.label} color={st.color} />
                      <Badge label={pay.label} color={pay.color} />
                    </div>
                    <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0' }}>
                      {inv.serviceType} · {inv.vehicle}{inv.plateNumber ? ` · ${inv.plateNumber}` : ''}
                    </p>
                    <p style={{ fontSize: 10, color: C.subtle, margin: '2px 0 0' }}>
                      {inv.number ? `فاکتور ${inv.number} · ` : ''}{toJalali(inv.serviceDate)} · {inv.itemCount.toLocaleString('fa-IR')} قلم
                    </p>
                  </div>

                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <Money amount={inv.total} size={13} />
                    {inv.remaining > 0 && (
                      <p style={{ fontSize: 10, color: C.statusWarn, margin: '3px 0 0', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        مانده {toman(inv.remaining)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {hasMore && (
            <Button variant="secondary" fullWidth loading={paging} onClick={() => load(rows.length)}>
              نمایش فاکتورهای بیشتر
            </Button>
          )}
        </div>
      )}

      {openId && (
        <InvoiceDetailSheet
          invoiceId={openId}
          onClose={() => setOpenId(null)}
          onEdit={inv => { setOpenId(null); setEditing(inv); }}
          onChanged={refresh}
        />
      )}

      {(creating || editing) && (
        <InvoiceEditorSheet
          existing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ── نمایش کامل یک فاکتور ───────────────────────────────────────── */

function InvoiceDetailSheet({ invoiceId, onClose, onEdit, onChanged }: {
  invoiceId: string;
  onClose: () => void;
  onEdit: (inv: MechanicInvoiceDetail) => void;
  onChanged: () => void;
}) {
  const [inv, setInv] = useState<MechanicInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');

  const reload = useCallback(async () => {
    try {
      setInv(await api.mechanic.invoice(invoiceId));
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { reload(); }, [reload]);

  async function addPayment() {
    if (!inv) return;
    const value = Number(amount);
    if (!value || value <= 0) { setError('مبلغ دریافتی را وارد کنید'); return; }
    setBusy(true);
    setError('');
    try {
      await api.invoices.addPayment(inv.vehicleId, inv.recordId, {
        amount: value, method, reference: reference.trim() || undefined,
      });
      setAmount(''); setReference(''); setPayOpen(false);
      await reload();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function dropPayment(paymentId: string) {
    if (!inv || !confirm('این دریافت حذف شود؟')) return;
    setBusy(true);
    try {
      await api.invoices.removePayment(inv.vehicleId, inv.recordId, paymentId);
      await reload();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeInvoice() {
    if (!inv || !confirm('این فاکتور برای همیشه حذف شود؟')) return;
    setBusy(true);
    try {
      await api.mechanic.removeInvoice(inv.id);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  const st = inv ? STATUS_META[inv.status ?? 'pending'] : null;
  const remaining = inv ? (inv.remaining ?? Math.max(0, inv.total - inv.paidAmount)) : 0;

  return (
    <Sheet title={inv?.number ? `فاکتور ${inv.number}` : 'فاکتور'} icon={<WalletIcon size={16} />} onClose={onClose}>
      {loading ? (
        <Spinner />
      ) : !inv ? (
        <p style={{ fontSize: 12.5, color: C.statusExpired, textAlign: 'center' }}>{error || 'فاکتور پیدا نشد'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {st && <Badge label={st.label} color={st.color} />}
            <Badge label={PAYMENT_META[inv.paymentStatus].label} color={PAYMENT_META[inv.paymentStatus].color} />
          </div>

          <Card padding="11px 13px">
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>{inv.customerName}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <CarIcon size={12} /> {inv.vehicle}{inv.plateNumber ? ` · ${inv.plateNumber}` : ''}
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
              {inv.serviceType} · {toJalali(inv.serviceDate)}
              {inv.mileage ? ` · ${inv.mileage.toLocaleString('fa-IR')} km` : ''}
            </p>
            {inv.customerPhone && (
              <a href={`tel:${inv.customerPhone}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
                fontSize: 11, fontWeight: 700, color: C.green, textDecoration: 'none', direction: 'ltr',
              }}>
                <PhoneIcon size={11} /> {inv.customerPhone}
              </a>
            )}
          </Card>

          {inv.status === 'rejected' && inv.rejectionReason && (
            <div style={{
              fontSize: 11.5, color: C.statusExpired, background: alpha(C.statusExpired, 10),
              border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 13px',
            }}>
              <AlertTriangleIcon size={13} /> دلیل رد مشتری: {inv.rejectionReason}
            </div>
          )}

          <div>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: C.text2, margin: '0 0 7px' }}>اقلام</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inv.items.map((it, i) => (
                <div key={it.id ?? i} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 10,
                  fontSize: 12, color: C.text2, background: C.fill1,
                  border: `1px solid ${C.border}`, borderRadius: 11, padding: '8px 12px',
                }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 700 }}>{it.name}</span>
                    <span style={{ color: C.subtle, fontSize: 10.5 }}>
                      {' '}· {it.type === 'labor' ? 'دستمزد' : 'قطعه'} · {it.quantity.toLocaleString('fa-IR')} ×{' '}
                      {toman(it.unitPrice)}
                    </span>
                  </span>
                  <Money amount={it.quantity * it.unitPrice} size={12} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.text2 }}>
            <Row label="جمع اقلام" value={toman(inv.subtotal)} />
            {inv.discount > 0 && <Row label="تخفیف" value={`${toman(inv.discount)}−`} color={C.statusMint} />}
            {!!inv.tax && inv.tax > 0 && <Row label={`ارزش افزوده ${(inv.taxPercent ?? 0).toLocaleString('fa-IR')}٪`} value={toman(inv.tax)} />}
            <Row label="قابل پرداخت" value={toman(inv.total)} bold />
            <Row label="دریافت‌شده" value={toman(inv.paidAmount)} color={C.statusMint} />
            <Row label="مانده" value={toman(remaining)} color={remaining > 0 ? C.statusWarn : C.muted} bold />
          </div>

          {inv.notes && (
            <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.8 }}>یادداشت: {inv.notes}</p>
          )}

          {!!inv.payments?.length && (
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: C.text2, margin: '0 0 7px' }}>دریافت‌ها</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inv.payments.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    fontSize: 11.5, color: C.text2, background: C.fill1,
                    border: `1px solid ${C.border}`, borderRadius: 11, padding: '8px 12px',
                  }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 700 }}>{toman(p.amount)} ت</span>
                      <span style={{ color: C.subtle, fontSize: 10.5 }}>
                        {' '}· {METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}
                      </span>
                    </span>
                    <IconButton label="حذف دریافت" onClick={() => dropPayment(p.id)} size={26}>
                      <TrashIcon size={12} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remaining > 0 && !payOpen && (
            <Button variant="secondary" fullWidth onClick={() => { setPayOpen(true); setAmount(String(remaining)); }} icon={<CheckIcon size={15} />}>
              ثبت دریافت وجه
            </Button>
          )}

          {payOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.fill1, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
              <FormField label={`مبلغ دریافتی (مانده ${toman(remaining)} تومان)`}>
                <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="روش">
                  <Select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map(m => (
                      <option key={m} value={m}>{METHOD_LABEL[m]}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="شماره پیگیری">
                  <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="اختیاری" />
                </FormField>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={addPayment} loading={busy} style={{ flex: 1 }}>ثبت دریافت</Button>
                <Button variant="secondary" onClick={() => setPayOpen(false)}>انصراف</Button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10),
              border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          {/* Editing re-opens the bill for the customer's approval — said outright, because the
              status silently flipping back to pending is otherwise a surprise. */}
          {inv.status === 'approved' && (
            <p style={{ fontSize: 10.5, color: C.subtle, margin: 0, lineHeight: 1.7 }}>
              این فاکتور تأیید شده؛ با ویرایش، دوباره برای تأیید مشتری ارسال می‌شود.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => onEdit(inv)} style={{ flex: 1, minWidth: 120 }} icon={<WrenchIcon size={14} />}>
              ویرایش فاکتور
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadPdf(
                `/vehicles/${inv.vehicleId}/records/${inv.recordId}/invoice/pdf`,
                `invoice-${inv.number ?? inv.recordId}.pdf`,
              ).catch(err => setError(err.message))}
              icon={<DownloadIcon size={14} />}
            >
              PDF
            </Button>
            <Button variant="danger" onClick={removeInvoice} loading={busy} icon={<TrashIcon size={14} />}>
              حذف
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 700, color: color ?? C.text, whiteSpace: 'nowrap' }}>{value} ت</span>
    </div>
  );
}

/* ── صدور و ویرایش فاکتور ───────────────────────────────────────── */

function InvoiceEditorSheet({ existing, onClose, onSaved }: {
  existing: MechanicInvoiceDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existing;
  const [vehicles, setVehicles] = useState<MechanicVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState(existing?.vehicleId ?? '');
  const [serviceType, setServiceType] = useState(existing?.serviceType ?? SERVICE_TYPES[0]);
  const [serviceDate, setServiceDate] = useState(existing?.serviceDate ?? today());
  const [mileage, setMileage] = useState(existing?.mileage ? String(existing.mileage) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [items, setItems] = useState<InvoiceItem[]>(
    existing?.items?.length
      ? existing.items.map(i => ({ type: i.type, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }))
      : [{ type: 'part', name: '', quantity: 1, unitPrice: 0 }],
  );
  const [discount, setDiscount] = useState(String(existing?.discount ?? 0));
  const [taxPercent, setTaxPercent] = useState(String(existing?.taxPercent ?? 0));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showCatalog, setShowCatalog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) return;
    api.mechanic.listVehicles().then(list => {
      setVehicles(list);
      setVehicleId(prev => prev || list[0]?.vehicleId || '');
    }).catch(() => {});
  }, [isEdit]);

  function updateItem(i: number, patch: Partial<InvoiceItem>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems(prev => [...prev, { type: 'part', name: '', quantity: 1, unitPrice: 0 }]); }
  function removeItem(i: number) { setItems(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i))); }
  function pickFromCatalog(part: Part) {
    setItems(prev => {
      const blank = prev.findIndex(it => !it.name.trim());
      const next: InvoiceItem = { type: 'part', name: part.name, quantity: 1, unitPrice: part.unitPrice };
      return blank >= 0 ? prev.map((it, idx) => (idx === blank ? next : it)) : [...prev, next];
    });
    setShowCatalog(false);
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const net = Math.max(0, subtotal - (Number(discount) || 0));
  const total = Math.round(net + net * ((Number(taxPercent) || 0) / 100));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = items.filter(i => i.name.trim() && Number(i.quantity) > 0);
    if (!valid.length) { setError('حداقل یک قلم با نام و تعداد وارد کنید'); return; }
    if (!isEdit && !vehicleId) { setError('خودرو را انتخاب کنید'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = {
        serviceType, serviceDate,
        mileage: mileage ? Number(mileage) : undefined,
        description: description || undefined,
        discount: Number(discount) || 0,
        taxPercent: Number(taxPercent) || 0,
        notes: notes || undefined,
        items: valid.map(i => ({ type: i.type, name: i.name.trim(), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) || 0 })),
      };
      if (isEdit) await api.mechanic.updateInvoice(existing!.id, payload);
      else await api.mechanic.createInvoice({ ...payload, vehicleId });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={isEdit ? 'ویرایش فاکتور' : 'فاکتور جدید'} icon={<WalletIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isEdit ? (
          <Card padding="10px 13px">
            <p style={{ fontSize: 12, fontWeight: 800, color: C.text, margin: 0 }}>{existing!.customerName}</p>
            <p style={{ fontSize: 10.5, color: C.muted, margin: '3px 0 0' }}>
              {existing!.vehicle}{existing!.plateNumber ? ` · ${existing!.plateNumber}` : ''}
            </p>
          </Card>
        ) : (
          <FormField label="خودرو" required>
            <Select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
              {vehicles.length === 0 && <option value="">خودرویی ثبت نشده</option>}
              {vehicles.map(v => (
                <option key={v.vehicleId} value={v.vehicleId}>
                  {v.make} {v.model}{v.plateNumber ? ` — ${v.plateNumber}` : ''}
                  {v.ownerName || v.customerName ? ` (${v.ownerName || v.customerName})` : ''}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="نوع سرویس">
          <Select value={serviceType} onChange={e => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ سرویس">
            <PersianDatePicker value={serviceDate} onChange={setServiceDate} />
          </FormField>
          <FormField label="کارکرد (km)">
            <Input value={mileage} onChange={e => setMileage(e.target.value)} type="number" />
          </FormField>
        </div>

        <FormField label="شرح کار">
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="جزئیات سرویس..." />
        </FormField>

        <div>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: C.text2, margin: '0 0 8px' }}>اقلام فاکتور</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Select
                  value={item.type}
                  onChange={e => updateItem(i, { type: e.target.value as 'part' | 'labor' })}
                  style={{ borderRadius: 10, padding: '9px 6px 9px 24px', fontSize: 11, flexShrink: 0, width: 80 }}
                >
                  <option value="part">قطعه</option>
                  <option value="labor">دستمزد</option>
                </Select>
                <Input value={item.name} onChange={e => updateItem(i, { name: e.target.value })} placeholder="نام" style={{ flex: 2, minWidth: 0 }} />
                <Input value={String(item.quantity)} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} type="number" placeholder="تعداد" style={{ flex: 1, minWidth: 0, textAlign: 'center' }} />
                <Input value={String(item.unitPrice)} onChange={e => updateItem(i, { unitPrice: Number(e.target.value) })} type="number" placeholder="قیمت" style={{ flex: 1.3, minWidth: 0, textAlign: 'center' }} />
                <IconButton label="حذف قلم" onClick={() => removeItem(i)} size={30}><XIcon size={13} /></IconButton>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <Button type="button" variant="secondary" size="sm" onClick={addItem} icon={<PlusIcon size={13} />}>افزودن قلم</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCatalog(true)} icon={<BoxIcon size={13} />}>از کاتالوگ</Button>
          </div>
          {showCatalog && <PartsCatalogPicker onPick={pickFromCatalog} onClose={() => setShowCatalog(false)} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تخفیف (تومان)">
            <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" />
          </FormField>
          <FormField label="ارزش افزوده (٪)">
            <Input value={taxPercent} onChange={e => setTaxPercent(e.target.value)} type="number" />
          </FormField>
        </div>

        <FormField label="یادداشت">
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختیاری — روی فاکتور چاپ می‌شود" />
        </FormField>

        {/* Payments are a separate ledger: an edit here must never silently change what the
            customer actually handed over. */}
        {isEdit && (existing!.paidAmount ?? 0) > 0 && (
          <p style={{ fontSize: 10.5, color: C.subtle, margin: 0, lineHeight: 1.7 }}>
            دریافتی‌های ثبت‌شده ({toman(existing!.paidAmount)} تومان) با ویرایش فاکتور تغییر نمی‌کنند.
          </p>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: alpha(C.green, 8), border: `1px solid ${alpha(C.green, 19)}`, borderRadius: 14, padding: '12px 16px',
        }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>مبلغ نهایی</span>
          <Money amount={total} color={C.green} size={16} />
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10),
            border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px',
          }}>
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>
          {isEdit ? 'ذخیره تغییرات' : 'صدور فاکتور'}
        </Button>
      </form>
    </Sheet>
  );
}
