'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PersianDatePicker from '@/components/PersianDatePicker';
import { api, Sale, Product, toJalali } from '@/lib/api';
import { getToken, getUser, homeHref } from '@/lib/session';
import {
  C, alpha, Card, Button, IconButton, EmptyState, Spinner, FormField, Input, TextArea, Sheet, Money,
} from '@/components/ui';
import {
  ChevronRightIcon, PlusIcon, TrashIcon, BoxIcon, PhoneIcon, CheckIcon, XIcon, WalletIcon,
} from '@/components/icons';

const STATUS = {
  paid:    { label: 'تسویه شده', color: C.statusMint },
  partial: { label: 'پرداخت جزئی', color: C.statusWarn },
  unpaid:  { label: 'پرداخت نشده', color: C.statusExpired },
} as const;

export default function SellerSalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [settling, setSettling] = useState<Sale | null>(null);

  function load() {
    api.sales.list().then(setSales).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    const u = getUser();
    if (u && u.role !== 'seller') { router.replace(homeHref(u.role)); return; }
    load();
  }, [router]);

  async function del(sale: Sale) {
    if (!confirm('این فروش حذف شود؟ موجودی کالاها برگردانده می‌شود.')) return;
    await api.sales.remove(sale.id);
    load();
  }

  const outstanding = sales.reduce((s, x) => s + x.remaining, 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="فروش‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>هر فروش رو ثبت کن تا حساب و مشتری‌هات جمع بشه</p>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>ثبت فروش</Button>
        </div>

        {outstanding > 0 && (
          <Card style={{ marginBottom: 14 }} accentColor={C.statusWarn}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>طلب وصول‌نشده</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                  {sales.filter(s => s.remaining > 0).length} فروش تسویه نشده
                </p>
              </div>
              <Money amount={outstanding} color={C.statusWarn} size={16} />
            </div>
          </Card>
        )}

        {loading ? (
          <Spinner />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="هنوز فروشی ثبت نکردی"
            sub="با ثبت هر فروش، موجودی انبار به‌روز می‌شه و سابقه مشتری و حسابت ساخته می‌شه"
            onAdd={() => setShowAdd(true)}
            btnLabel="ثبت اولین فروش"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sales.map(sale => {
              const st = STATUS[sale.paymentStatus];
              return (
                <Card key={sale.id} padding="13px 15px">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>
                        {sale.customerName || 'مشتری بدون نام'}
                      </p>
                      <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0' }}>
                        {toJalali(sale.soldAt)} · {sale.items.length} قلم
                      </p>
                      {sale.customerPhone && (
                        <a href={`tel:${sale.customerPhone}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5,
                          fontSize: 10.5, fontWeight: 700, color: C.green, textDecoration: 'none', direction: 'ltr',
                        }}>
                          <PhoneIcon size={11} /> {sale.customerPhone}
                        </a>
                      )}
                    </div>
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <Money amount={sale.total} size={14} />
                      <span style={{
                        display: 'inline-block', marginTop: 5,
                        fontSize: 9.5, fontWeight: 800, color: st.color,
                        background: alpha(st.color, 12), padding: '2px 8px', borderRadius: 7,
                      }}>{st.label}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    {sale.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted, padding: '2px 0' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span>{Math.round(item.quantity * item.unitPrice).toLocaleString('fa-IR')} ت</span>
                      </div>
                    ))}
                    {sale.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.statusMint, padding: '2px 0' }}>
                        <span>تخفیف</span>
                        <span>−{Math.round(sale.discount).toLocaleString('fa-IR')} ت</span>
                      </div>
                    )}
                    {sale.remaining > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: C.statusWarn, padding: '4px 0 0' }}>
                        <span>مانده</span>
                        <span>{Math.round(sale.remaining).toLocaleString('fa-IR')} ت</span>
                      </div>
                    )}
                  </div>

                  {sale.notes && (
                    <p style={{ fontSize: 11.5, color: C.muted, margin: '9px 0 0', lineHeight: 1.7 }}>{sale.notes}</p>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                    {sale.remaining > 0 && (
                      <Button size="sm" fullWidth onClick={() => setSettling(sale)} icon={<CheckIcon size={13} />}>
                        ثبت پرداخت
                      </Button>
                    )}
                    <IconButton label="حذف فروش" onClick={() => del(sale)} size={30}><TrashIcon size={13} /></IconButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {showAdd && <RecordSaleSheet onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {settling && (
        <SettleSheet
          sale={settling}
          onClose={() => setSettling(null)}
          onSaved={() => { setSettling(null); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

interface Line { productId?: string; name: string; quantity: string; unitPrice: string }

function RecordSaleSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [soldAt, setSoldAt] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.products.list().then(list => setProducts(list.filter(p => p.active))).catch(() => {});
  }, []);

  function setLine(i: number, patch: Partial<Line>) {
    setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  /* Picking a catalogue product fills in its name and price, but both stay
     editable — a haggled price is still a real sale. */
  function pickProduct(i: number, productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) { setLine(i, { productId: undefined }); return; }
    setLine(i, { productId, name: p.name, unitPrice: String(p.price) });
  }

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = lines
      .filter(l => l.name.trim() && Number(l.quantity) > 0)
      .map(l => ({
        productId: l.productId,
        name: l.name.trim(),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (items.length === 0) { setError('حداقل یک قلم کالا با نام و تعداد وارد کن'); return; }

    setSaving(true);
    setError('');
    try {
      await api.sales.create({
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        soldAt: soldAt || undefined,
        discount: discount ? Number(discount) : undefined,
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
        notes: notes || undefined,
        items,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="ثبت فروش" icon={<BoxIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="نام مشتری">
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="مثلاً آقای رضایی" />
          </FormField>
          <FormField label="شماره تماس">
            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" placeholder="09123456789" />
          </FormField>
        </div>

        <FormField label="تاریخ فروش">
          <PersianDatePicker value={soldAt} onChange={setSoldAt} />
        </FormField>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text2 }}>اقلام</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => setLines(ls => [...ls, { name: '', quantity: '1', unitPrice: '' }])} icon={<PlusIcon size={13} />}>
              افزودن قلم
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ background: C.fill1, border: `1px solid ${C.border}`, borderRadius: 14, padding: '11px 12px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select
                    value={line.productId ?? ''}
                    onChange={e => pickProduct(i, e.target.value)}
                    style={{
                      flex: 1, background: C.fill2, border: `1px solid ${C.border}`, borderRadius: 11,
                      padding: '9px 11px', fontSize: 12, color: C.text, fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <option value="">کالای خارج از فهرست…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</option>
                    ))}
                  </select>
                  {lines.length > 1 && (
                    <IconButton label="حذف قلم" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} size={34}>
                      <XIcon size={13} />
                    </IconButton>
                  )}
                </div>

                <Input
                  value={line.name}
                  onChange={e => setLine(i, { name: e.target.value })}
                  placeholder="نام کالا"
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
                  <Input value={line.quantity} onChange={e => setLine(i, { quantity: e.target.value })} type="number" placeholder="تعداد" />
                  <Input value={line.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} type="number" placeholder="قیمت واحد" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تخفیف (تومان)">
            <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" placeholder="۰" />
          </FormField>
          <FormField label="پرداخت‌شده (تومان)">
            <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} type="number" placeholder="۰" />
          </FormField>
        </div>

        <div style={{
          background: alpha(C.green, 8), border: `1px solid ${alpha(C.green, 20)}`,
          borderRadius: 13, padding: '11px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>مبلغ نهایی</span>
          <Money amount={total} size={16} color={C.green} />
        </div>

        <FormField label="یادداشت (اختیاری)">
          <TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </FormField>

        {error && (
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={saving} fullWidth size="lg">ثبت فروش</Button>
      </form>
    </Sheet>
  );
}

function SettleSheet({ sale, onClose, onSaved }: { sale: Sale; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.round(sale.total)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.sales.setPaid(sale.id, Number(amount) || 0);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="ثبت پرداخت" icon={<WalletIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.muted }}>
          <span>مبلغ کل</span><Money amount={sale.total} size={13} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.statusWarn }}>
          <span>مانده فعلی</span><Money amount={sale.remaining} size={13} color={C.statusWarn} />
        </div>

        <FormField label="مجموع پرداخت‌شده (تومان)" required>
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" required />
        </FormField>
        <p style={{ fontSize: 11, color: C.subtle, margin: 0, lineHeight: 1.7 }}>
          عدد کل پرداختی رو وارد کن، نه مبلغ این قسط.
        </p>

        {error && (
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={saving} fullWidth size="lg">ذخیره</Button>
      </form>
    </Sheet>
  );
}
