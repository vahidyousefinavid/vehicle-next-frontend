'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PersianDatePicker from '@/components/PersianDatePicker';
import PartsCatalogPicker from '@/components/PartsCatalogPicker';
import Chat from '@/components/Chat';
import {
  api, MechanicVehicleDetail, ServiceRecord, SERVICE_TYPES, InvoiceItem, Part, toJalali,
  Invoice, PaymentMethod,
} from '@/lib/api';
import {
  C, Card, IconBadge, Button, IconButton, FormField, Input, Select, ChipGroup, Sheet,
  EmptyState, Spinner, alpha } from '@/components/ui';
import {
  ChevronRightIcon, CarIcon, WrenchIcon, CalendarIcon, RoadIcon, WalletIcon,
  PlusIcon, XIcon, CheckIcon, SettingsIcon, BoxIcon, MessageIcon,
} from '@/components/icons';

function today() { return new Date().toISOString().slice(0, 10); }

export default function MechanicVehiclePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  /** Set when arriving from a completed appointment — opens that record's bill straight away. */
  const focusRecordId = searchParams.get('record');
  const [vehicle, setVehicle] = useState<MechanicVehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [selfId, setSelfId] = useState('');
  /** Guards the deep-link so closing the sheet doesn't immediately reopen it. */
  const [focusHandled, setFocusHandled] = useState(false);

  function load() {
    api.mechanic.getVehicle(id).then(setVehicle).finally(() => setLoading(false));
  }

  // Open the requested record's sheet as soon as the data it needs is present. Runs once:
  // the guard matters because the sheet's own close handler must not be undone by a
  // re-render while the ?record= parameter is still in the URL.
  useEffect(() => {
    if (focusHandled || !focusRecordId || !vehicle) return;
    const target = vehicle.serviceRecords?.find((r) => r.id === focusRecordId);
    setFocusHandled(true);
    if (target) setEditing(target);
  }, [focusHandled, focusRecordId, vehicle]);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      if (u.role !== 'mechanic') { router.replace('/dashboard'); return; }
      setSelfId(u.id);
    } catch {}
    load();
  }, [id, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );
  if (!vehicle) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{
          background: `linear-gradient(145deg, ${C.heroStart} 0%, ${C.heroMid} 45%, ${C.heroEnd} 100%)`,
          borderRadius: 26, padding: '22px 20px', marginBottom: 16,
          boxShadow: C.shadowHero,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 17, background: C.fill4,
              border: `1px solid ${C.borderStrong}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: C.onHero, flexShrink: 0,
            }}><CarIcon size={26} /></div>
            <div>
              <h1 style={{ color: C.onHero, fontSize: 19, fontWeight: 900, margin: 0 }}>{vehicle.make} {vehicle.model}</h1>
              <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, margin: '5px 0 0' }}>
                {vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ''}{vehicle.plateNumber ? ` · ${vehicle.plateNumber}` : ''}
              </p>
              <p style={{ color: C.text4, fontSize: 11, fontWeight: 500, margin: '4px 0 0' }}>
                مالک: {vehicle.ownerName || '—'}
              </p>
              {vehicle.linkStatus !== 'pending' && (
                <button
                  onClick={() => setShowChat(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9,
                    background: C.fill4, border: `1px solid ${C.borderStrong}`,
                    color: C.onHero, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10,
                  }}
                ><MessageIcon size={12} /> پیام به مالک</button>
              )}
              {vehicle.linkStatus === 'pending' && (
                <span style={{
                  display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 800,
                  color: C.statusWarn, background: alpha(C.statusWarn, 16), border: `1px solid ${alpha(C.statusWarn, 30)}`,
                  padding: '3px 11px', borderRadius: 9,
                }}>در انتظار تایید مالک</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {[
              { label: 'کارکرد', value: vehicle.currentMileage.toLocaleString(), sub: 'km' },
              { label: 'سرویس‌ها', value: String(vehicle.serviceRecords.length), sub: 'مورد' },
              ...(vehicle.fuelType ? [{ label: 'سوخت', value: vehicle.fuelType, sub: '' }] : []),
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: C.fill3, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '10px 6px', textAlign: 'center',
              }}>
                <p style={{ color: C.onHero, fontWeight: 900, fontSize: 14, margin: 0 }}>
                  {s.value}{s.sub && <span style={{ fontSize: 9, opacity: 0.6, marginRight: 2 }}>{s.sub}</span>}
                </p>
                <p style={{ color: C.text4, fontSize: 10, fontWeight: 600, margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>تاریخچه سرویس</h2>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>ثبت سرویس</Button>
        </div>

        {vehicle.serviceRecords.length === 0 ? (
          <EmptyState icon={<WrenchIcon size={26} />} title="هنوز سرویسی ثبت نشده" sub="اولین سرویس این خودرو رو ثبت کن" onAdd={() => setShowAdd(true)} btnLabel="ثبت سرویس" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {vehicle.serviceRecords.map(r => (
              <Card key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconBadge color={C.green}><WrenchIcon size={19} /></IconBadge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{r.serviceType}</p>
                    <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '5px 0 0', display: 'flex', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarIcon size={12} /> {toJalali(r.serviceDate)}</span>
                      {r.mileage && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RoadIcon size={12} /> {r.mileage.toLocaleString()} km</span>}
                    </p>
                    {r.createdByName && (
                      <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>ثبت‌شده توسط {r.createdByName}</p>
                    )}
                  </div>
                  {r.invoice && (
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      color: r.invoice.paymentStatus === 'paid' ? C.statusOk : r.invoice.paymentStatus === 'partial' ? C.statusWarn : C.statusExpired,
                      background: r.invoice.paymentStatus === 'paid' ? alpha(C.green, 14) : r.invoice.paymentStatus === 'partial' ? alpha(C.statusWarn, 14) : alpha(C.statusExpired, 14),
                      padding: '3px 10px', borderRadius: 9, flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {(r.invoice.total / 1000).toFixed(0)}K ت
                    </span>
                  )}
                  <IconButton label="ویرایش سرویس" onClick={() => setEditing(r)} size={30}><SettingsIcon size={14} /></IconButton>
                </div>
                {r.invoice && <MechanicInvoicePanel vehicleId={vehicle.id} record={r} onChanged={load} />}
              </Card>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddServiceWithInvoiceSheet
          vehicleId={id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
      {editing && (
        <AddServiceWithInvoiceSheet
          vehicleId={id}
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {showChat && selfId && (
        <Chat vehicleId={id} mechanicId={selfId} role="mechanic" title={`گفتگو · ${vehicle.ownerName || 'مالک'}`} onClose={() => setShowChat(false)} />
      )}
      <BottomNav />
    </div>
  );
}

function AddServiceWithInvoiceSheet({ vehicleId, record, onClose, onSaved }: { vehicleId: string; record?: ServiceRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!record;
  const [f, setF] = useState({
    serviceType: record?.serviceType || SERVICE_TYPES[0],
    serviceDate: record?.serviceDate || today(),
    mileage: record?.mileage ? String(record.mileage) : '',
    description: record?.description || '',
  });
  const [withInvoice, setWithInvoice] = useState(!isEdit || !!record?.invoice);
  const [items, setItems] = useState<InvoiceItem[]>([{ type: 'part', name: '', quantity: 1, unitPrice: 0 }]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hadInvoice = !!record?.invoice;

  useEffect(() => {
    if (!record?.invoice) return;
    api.invoices.get(vehicleId, record.id).then(inv => {
      setItems(inv.items.map(i => ({ type: i.type, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })));
      setDiscount(String(inv.discount));
      setPaidAmount(String(inv.paidAmount));
    }).catch(() => {});
  }, [vehicleId, record?.id, record?.invoice]);

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  function updateItem(i: number, patch: Partial<InvoiceItem>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems(prev => [...prev, { type: 'part', name: '', quantity: 1, unitPrice: 0 }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function pickFromCatalog(part: Part) {
    setItems(prev => {
      const emptyIdx = prev.findIndex(it => !it.name.trim());
      const newItem: InvoiceItem = { type: 'part', name: part.name, quantity: 1, unitPrice: part.unitPrice };
      if (emptyIdx >= 0) return prev.map((it, idx) => (idx === emptyIdx ? newItem : it));
      return [...prev, newItem];
    });
    setShowCatalog(false);
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const base = {
        serviceType: f.serviceType,
        serviceDate: f.serviceDate,
        mileage: f.mileage ? Number(f.mileage) : undefined,
        description: f.description || undefined,
      };
      const saved = isEdit ? await api.records.update(vehicleId, record!.id, base) : await api.records.create(vehicleId, base);

      if (withInvoice) {
        const validItems = items.filter(i => i.name.trim() && i.quantity > 0);
        if (validItems.length > 0) {
          await api.invoices.upsert(vehicleId, saved.id, {
            discount: Number(discount) || 0,
            paidAmount: Number(paidAmount) || 0,
            items: validItems,
          });
        }
      } else if (hadInvoice) {
        await api.invoices.remove(vehicleId, saved.id);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={isEdit ? 'ویرایش سرویس' : 'ثبت سرویس جدید'} icon={<WrenchIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="نوع سرویس">
          <ChipGroup options={SERVICE_TYPES} value={f.serviceType} onChange={v => set('serviceType', v)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ سرویس">
            <PersianDatePicker value={f.serviceDate} onChange={v => set('serviceDate', v)} />
          </FormField>
          <FormField label="کارکرد (km)">
            <Input value={f.mileage} onChange={e => set('mileage', e.target.value)} type="number" />
          </FormField>
        </div>
        <FormField label="توضیحات">
          <Input value={f.description} onChange={e => set('description', e.target.value)} placeholder="جزئیات سرویس..." />
        </FormField>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px',
          background: C.fill1, borderRadius: 14, border: `1px solid ${C.border}`,
        }}>
          <input type="checkbox" checked={withInvoice} onChange={e => setWithInvoice(e.target.checked)} style={{ width: 17, height: 17, accentColor: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <WalletIcon size={15} /> افزودن فاکتور و هزینه‌ها
          </span>
        </label>

        {withInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Select
                  value={item.type}
                  onChange={e => updateItem(i, { type: e.target.value as 'part' | 'labor' })}
                  style={{
                    borderRadius: 10, padding: '9px 6px 9px 24px', fontSize: 11, flexShrink: 0, width: 80,
                  }}
                >
                  <option value="part">قطعه</option>
                  <option value="labor">دستمزد</option>
                </Select>
                <Input value={item.name} onChange={e => updateItem(i, { name: e.target.value })} placeholder="نام" style={{ flex: 2 }} />
                <Input value={String(item.quantity)} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} type="number" placeholder="تعداد" style={{ flex: 1, textAlign: 'center' }} />
                <Input value={String(item.unitPrice)} onChange={e => updateItem(i, { unitPrice: Number(e.target.value) })} type="number" placeholder="قیمت" style={{ flex: 1.3, textAlign: 'center' }} />
                <IconButton label="حذف قلم" onClick={() => removeItem(i)} size={30}><XIcon size={13} /></IconButton>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="secondary" size="sm" onClick={addItem} icon={<PlusIcon size={13} />}>افزودن قلم</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCatalog(true)} icon={<BoxIcon size={13} />}>از کاتالوگ</Button>
            </div>
            {showCatalog && <PartsCatalogPicker onPick={pickFromCatalog} onClose={() => setShowCatalog(false)} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="تخفیف (تومان)">
                <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" />
              </FormField>
              <FormField label="مبلغ پرداخت‌شده">
                <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} type="number" />
              </FormField>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: `${alpha(C.green, 8)}`, border: `1px solid ${alpha(C.green, 19)}`, borderRadius: 14, padding: '12px 16px',
            }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>مبلغ نهایی</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{total.toLocaleString()} ت</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>
          {isEdit ? 'ذخیره تغییرات' : 'ثبت سرویس'}
        </Button>
      </form>
    </Sheet>
  );
}

/**
 * The bill, as the workshop needs to see it.
 *
 * The owner's app has shown an itemised invoice for a long time; the mechanic who *issued*
 * it could only see a rounded total on a badge. Everything here is read from the API's own
 * breakdown rather than recomputed, so this view can never disagree with the receipt or the
 * accounting page.
 */
function MechanicInvoicePanel({
  vehicleId, record, onChanged,
}: { vehicleId: string; record: ServiceRecord; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || invoice) return;
    setLoading(true);
    api.invoices.get(vehicleId, record.id).then(setInvoice).catch(() => {}).finally(() => setLoading(false));
  }, [open, invoice, vehicleId, record.id]);

  const money = (n: number) => Math.round(n).toLocaleString('fa-IR');

  const STATUS: Record<string, { label: string; color: string }> = {
    pending:  { label: 'در انتظار تأیید مشتری', color: C.statusWarn },
    approved: { label: 'تأییدشده توسط مشتری',   color: C.statusMint },
    rejected: { label: 'ردشده توسط مشتری',      color: C.statusExpired },
  };
  const METHOD: Record<string, string> = { cash: 'نقدی', card: 'کارتخوان', transfer: 'انتقال', cheque: 'چک' };

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) { setError('مبلغ را وارد کنید'); return; }
    setSaving(true); setError('');
    try {
      const updated = await api.invoices.addPayment(vehicleId, record.id, {
        amount: value, method, reference: reference.trim() || undefined,
      });
      setInvoice(updated);
      setAmount(''); setReference(''); setPayOpen(false);
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'ثبت دریافت انجام نشد');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 10, width: '100%', background: 'transparent', border: `1px dashed ${alpha(C.text2, 30)}`,
          borderRadius: 9, padding: '7px 10px', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 700, color: C.text2, fontFamily: 'inherit',
        }}
      >
        مشاهده جزئیات صورتحساب
      </button>
    );
  }

  const st = invoice?.status ? STATUS[invoice.status] : null;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${alpha(C.text2, 14)}` }}>
      {loading && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>در حال بارگذاری…</p>}

      {invoice && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>
              فاکتور {invoice.number ? `شماره ${invoice.number}` : ''}
            </span>
            {st && (
              <span style={{
                fontSize: 10.5, fontWeight: 800, color: st.color,
                background: alpha(st.color, 14), padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap',
              }}>{st.label}</span>
            )}
          </div>

          {invoice.status === 'rejected' && invoice.rejectionReason && (
            <p style={{
              fontSize: 11.5, color: C.statusExpired, background: alpha(C.statusExpired, 10),
              padding: '7px 10px', borderRadius: 8, margin: '0 0 10px', lineHeight: 1.7,
            }}>
              دلیل مشتری: {invoice.rejectionReason}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.text2 }}>
            {invoice.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>
                  <span style={{ color: C.subtle, fontSize: 10.5 }}>{it.type === 'labor' ? 'اجرت' : 'قطعه'}</span>{' '}
                  {it.name}{it.quantity > 1 ? ` × ${it.quantity}` : ''}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{money(it.quantity * it.unitPrice)}</span>
              </div>
            ))}

            <div style={{ height: 1, background: alpha(C.text2, 12), margin: '5px 0' }} />

            <Row label="جمع اقلام" value={money(invoice.subtotal)} />
            {invoice.discount > 0 && <Row label="تخفیف" value={`${money(invoice.discount)}−`} color={C.statusMint} />}
            {!!invoice.tax && invoice.tax > 0 && (
              <Row label={`ارزش افزوده ${invoice.taxPercent ?? 0}٪`} value={money(invoice.tax)} />
            )}
            <Row label="قابل پرداخت" value={money(invoice.total)} bold />
            <Row label="دریافت‌شده" value={money(invoice.paidAmount)} color={C.statusMint} />
            <Row
              label="مانده"
              value={money(invoice.remaining ?? Math.max(0, invoice.total - invoice.paidAmount))}
              color={(invoice.remaining ?? 0) > 0 ? C.statusWarn : C.muted}
              bold
            />
          </div>

          {!!invoice.payments?.length && (
            <div style={{ marginTop: 11 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.text2, margin: '0 0 6px' }}>دریافت‌ها</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {invoice.payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: C.muted }}>
                    <span>{METHOD[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(invoice.remaining ?? 0) > 0 && !payOpen && (
            <Button size="sm" fullWidth variant="secondary" onClick={() => setPayOpen(true)} style={{ marginTop: 11 }}>
              ثبت دریافت وجه
            </Button>
          )}

          {payOpen && (
            <form onSubmit={submitPayment} style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                placeholder={`مبلغ دریافتی (مانده ${money(invoice.remaining ?? 0)})`}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['cash', 'card', 'transfer', 'cheque'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 11, fontWeight: 700,
                      border: `1px solid ${method === m ? C.green : alpha(C.text2, 22)}`,
                      background: method === m ? alpha(C.green, 12) : 'transparent',
                      color: method === m ? C.green : C.muted,
                    }}
                  >{METHOD[m]}</button>
                ))}
              </div>
              {(method === 'cheque' || method === 'transfer' || method === 'card') && (
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder={method === 'cheque' ? 'شماره چک' : 'شماره پیگیری'} />
              )}
              {error && <p style={{ fontSize: 11.5, color: C.statusExpired, margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 7 }}>
                <Button size="sm" fullWidth type="submit" loading={saving}>ثبت</Button>
                <Button size="sm" fullWidth type="button" variant="secondary" onClick={() => { setPayOpen(false); setError(''); }}>انصراف</Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: bold ? 800 : 500, color: color ?? undefined }}>
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
