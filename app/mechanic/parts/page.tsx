'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import VoiceAgentWidget from '@/components/VoiceAgentWidget';
import CatalogImportSheet from '@/components/CatalogImportSheet';
import { api, Part } from '@/lib/api';
import { C, alpha, Button, EmptyState, Skeleton, FormField, Input, Sheet } from '@/components/ui';
import { Screen, ScreenHeader, Glance, Row, RowList, Chip, Filters, SearchBar, SCREEN_CSS, fa, money, shortMoney } from '@/components/ScreenKit';
import { BoxIcon, PlusIcon, TrashIcon, SparklesIcon } from '@/components/icons';

export default function PartsCatalogPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useUrlFilter('stock', ['all', 'low', 'out'] as const, 'all');
  const [editing, setEditing] = useState<Part | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [ownedNames, setOwnedNames] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  function load() {
    setLoading(true);
    api.parts.list(q).then(setParts).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [q]);

  async function openCatalog() {
    setShowCatalog(true);
    try { setOwnedNames((await api.parts.list()).map(p => p.name)); } catch { setOwnedNames([]); }
  }

  function afterImport(added: number, skipped: number) {
    setShowCatalog(false);
    setNotice(added ? `${added} قطعه به کاتالوگ اضافه شد${skipped ? ` · ${skipped} مورد تکراری بود` : ''}` : 'همه‌ی موارد انتخابی از قبل در کاتالوگ بودند');
    load();
  }

  async function del(id: string) {
    if (!confirm('این قطعه از کاتالوگ حذف شود؟')) return;
    await api.parts.remove(id);
    load();
  }

  const inStock = parts.filter((x) => x.inStock && x.quantity > 0);
  const out = parts.filter((x) => !x.inStock || x.quantity <= 0);
  const low = parts.filter((x) => x.inStock && x.quantity > 0 && x.quantity <= 2);
  const value = parts.reduce((n, x) => n + (x.inStock ? x.quantity * x.unitPrice : 0), 0);
  const shown = filter === 'out' ? out : filter === 'low' ? low : parts;

  return (
    <Screen dense>
      <ScreenHeader
        eyebrow="انبار تعمیرگاه"
        title="قطعات"
        subtitle={out.length ? `${fa(out.length)} قلم ناموجود است` : low.length ? `${fa(low.length)} قلم رو به اتمام` : 'موجودی سالم است'}
        back="/mechanic"
        action={<Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>افزودن</Button>}
      />

      {!loading && parts.length > 0 && (
        <Glance items={[
          { label: 'قلم کالا', value: fa(parts.length) },
          { label: 'ارزش انبار', value: shortMoney(value), hint: 'تومان', tone: C.statusOk },
          { label: 'رو به اتمام', value: fa(low.length), tone: low.length ? C.statusWarn : undefined, alert: low.length > 0 },
          { label: 'ناموجود', value: fa(out.length), tone: out.length ? C.statusExpired : undefined, alert: out.length > 0 },
        ]} />
      )}

      <SearchBar value={q} onChange={setQ} placeholder="جستجوی قطعه..." />

      {parts.length > 0 && (
        <Filters
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'همه', count: parts.length },
            { key: 'low', label: 'رو به اتمام', count: low.length },
            { key: 'out', label: 'ناموجود', count: out.length },
          ]}
        />
      )}

      <button onClick={openCatalog} className="pt-import" style={{ background: alpha(C.green, 8), color: C.green }}>
        <SparklesIcon size={15} /> افزودن از لیست آماده قطعات
      </button>

      {notice && <div className="pt-note" style={{ color: C.green, background: alpha(C.green, 10) }}>{notice}</div>}

      {loading ? (
        <RowList>{[0, 1, 2].map((i) => <Skeleton key={i} height={72} radius={18} />)}</RowList>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<BoxIcon size={26} />}
          title={parts.length ? 'در این دسته چیزی نیست' : 'کاتالوگی نداری'}
          sub={parts.length ? 'فیلتر دیگری را امتحان کن' : 'قطعات پرکاربردت را با قیمت ثبت کن تا موقع صدور فاکتور سریع انتخابشان کنی'}
          onAdd={parts.length ? undefined : () => setShowAdd(true)}
          btnLabel="افزودن اولین قطعه"
        />
      ) : (
        <RowList>
          {shown.map((x) => {
            const stock = x.inStock ? x.quantity : 0;
            const hue = stock <= 0 ? C.statusExpired : stock <= 2 ? C.statusWarn : C.statusOk;
            return (
              <Row
                key={x.id}
                hue={hue}
                icon={<BoxIcon size={20} />}
                title={x.name}
                meta={<>{x.category || 'بدون دسته'}{x.sku ? ` · ${x.sku}` : ''}</>}
                onClick={() => setEditing(x)}
                chips={<>
                  <Chip tone={hue}>{stock > 0 ? `${fa(stock)} ${x.unit}` : 'ناموجود'}</Chip>
                  <Chip tone={C.muted}>{money(x.unitPrice)}</Chip>
                </>}
                trailing={<>
                  <b className="sk-fig" style={{ color: C.textStrong, fontSize: 13.5, fontWeight: 900 }}>{shortMoney(stock * x.unitPrice)}</b>
                  <small style={{ color: C.subtle, fontSize: 10 }}>ارزش</small>
                </>}
                actions={<Button size="sm" variant="danger" onClick={() => del(x.id)} icon={<TrashIcon size={13} />}>حذف</Button>}
              />
            );
          })}
        </RowList>
      )}

      {showAdd && <PartEditSheet part={null} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <PartEditSheet part={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {showCatalog && (
        <CatalogImportSheet kind="parts" existing={ownedNames} onClose={() => setShowCatalog(false)} onImported={afterImport} />
      )}

      <BottomNav />
      <style>{SCREEN_CSS + `
.pt-import{width:100%;border:0;border-radius:15px;padding:12px 14px;margin-bottom:12px;font:900 12.5px var(--font-sans);display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:transform .16s ease}
.pt-import:active{transform:scale(.99)}
.pt-note{border-radius:13px;padding:10px 14px;font:800 12px var(--font-sans);margin-bottom:12px}
      `}</style>
    </Screen>
  );
}

function PartEditSheet({ part, onClose, onSaved }: { part: Part | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(part?.name || '');
  const [category, setCategory] = useState(part?.category || '');
  const [sku, setSku] = useState(part?.sku || '');
  const [unit, setUnit] = useState(part?.unit || 'عدد');
  const [unitPrice, setUnitPrice] = useState(part ? String(part.unitPrice) : '');
  const [quantity, setQuantity] = useState(part ? String(part.quantity) : '0');
  const [inStock, setInStock] = useState(part ? part.inStock : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dto = { name, category: category || undefined, sku: sku || undefined, unit, unitPrice: Number(unitPrice) || 0, quantity: Number(quantity) || 0, inStock };
      if (part) await api.parts.update(part.id, dto);
      else await api.parts.create(dto);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={part ? 'ویرایش قطعه' : 'افزودن قطعه'} icon={<BoxIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="نام قطعه" required><Input value={name} onChange={e => setName(e.target.value)} required /></FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="دسته‌بندی"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً روغن و فیلتر" /></FormField>
          <FormField label="کد فنی"><Input value={sku} onChange={e => setSku(e.target.value)} dir="ltr" /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="واحد"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="عدد / لیتر / متر" /></FormField>
          <FormField label="قیمت (تومان)" required><Input value={unitPrice} onChange={e => setUnitPrice(e.target.value)} type="number" required /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تعداد موجودی"><Input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" /></FormField>
          <FormField label="وضعیت">
            <Button variant={inStock ? 'primary' : 'danger'} fullWidth onClick={() => setInStock(v => !v)}>
              {inStock ? 'موجود' : 'ناموجود'}
            </Button>
          </FormField>
        </div>
        {error && (
          <div role="alert" style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">{part ? 'ذخیره تغییرات' : 'افزودن به کاتالوگ'}</Button>
      </form>
    </Sheet>
  );
}
