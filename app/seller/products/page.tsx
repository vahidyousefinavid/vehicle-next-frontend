'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import CatalogImportSheet from '@/components/CatalogImportSheet';
import { api, Product, productImageUrl } from '@/lib/api';
import { C, alpha, Button, EmptyState, Skeleton, FormField, Input, TextArea, Sheet } from '@/components/ui';
import { Screen, ScreenHeader, Glance, Row, RowList, Chip, Filters, SearchBar, SCREEN_CSS, fa, shortMoney } from '@/components/ScreenKit';
import { BoxIcon, PlusIcon, TrashIcon, SparklesIcon, ImageIcon } from '@/components/icons';

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useUrlFilter('stock', ['all', 'low', 'out', 'off'] as const, 'all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [ownedNames, setOwnedNames] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  function load() {
    setLoading(true);
    api.products.list(q).then(setProducts).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [q]);

  async function openCatalog() {
    setShowCatalog(true);
    try { setOwnedNames((await api.products.list()).map(p => p.name)); } catch { setOwnedNames([]); }
  }

  function afterImport(added: number, skipped: number) {
    setShowCatalog(false);
    setNotice(added ? `${added} کالا به فروشگاه اضافه شد${skipped ? ` · ${skipped} مورد تکراری بود` : ''}` : 'همه‌ی موارد انتخابی از قبل در فروشگاه بودند');
    load();
  }

  async function del(id: string) {
    if (!confirm('این محصول حذف شود؟')) return;
    await api.products.remove(id);
    load();
  }

  async function toggleActive(p: Product) {
    await api.products.setActive(p.id, !p.active);
    load();
  }

  const active = products.filter((x) => x.active);
  const low = products.filter((x) => x.stock > 0 && x.stock <= 3);
  const out = products.filter((x) => x.stock <= 0);
  const value = products.reduce((n, x) => n + x.price * Math.max(0, x.stock), 0);
  const shown = filter === 'low' ? low : filter === 'out' ? out : filter === 'off' ? products.filter((x) => !x.active) : products;

  return (
    <Screen dense>
      <ScreenHeader
        eyebrow="انبار فروشگاه"
        title="محصولات"
        subtitle={out.length ? `${fa(out.length)} کالا ناموجود است` : low.length ? `${fa(low.length)} کالا رو به اتمام` : 'موجودی سالم است'}
        back="/seller"
        action={<Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>افزودن</Button>}
      />

      {!loading && products.length > 0 && (
        <Glance items={[
          { label: 'کالا', value: fa(products.length), hint: `${fa(active.length)} فعال` },
          { label: 'ارزش انبار', value: shortMoney(value), hint: 'تومان', tone: C.statusOk },
          { label: 'رو به اتمام', value: fa(low.length), tone: low.length ? C.statusWarn : undefined, alert: low.length > 0 },
          { label: 'ناموجود', value: fa(out.length), tone: out.length ? C.statusExpired : undefined, alert: out.length > 0 },
        ]} />
      )}

      <SearchBar value={q} onChange={setQ} placeholder="جستجوی کالا..." />

      {products.length > 0 && (
        <Filters
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'همه', count: products.length },
            { key: 'low', label: 'رو به اتمام', count: low.length },
            { key: 'out', label: 'ناموجود', count: out.length },
            { key: 'off', label: 'غیرفعال', count: products.length - active.length },
          ]}
        />
      )}

      <button onClick={openCatalog} className="pr-import" style={{ background: alpha(C.green, 8), color: C.green }}>
        <SparklesIcon size={15} /> افزودن از کاتالوگ آماده
      </button>

      {notice && <div className="pr-note" style={{ color: C.green, background: alpha(C.green, 10) }}>{notice}</div>}

      {loading ? (
        <RowList>{[0, 1, 2].map((i) => <Skeleton key={i} height={74} radius={18} />)}</RowList>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<BoxIcon size={26} />}
          title={products.length ? 'در این دسته کالایی نیست' : 'هنوز کالایی ثبت نکردی'}
          sub={products.length ? 'فیلتر دیگری را امتحان کن' : 'از کاتالوگ آماده ده‌ها کالای پرفروش را یکجا اضافه کن'}
          onAdd={products.length ? undefined : () => setShowAdd(true)}
          btnLabel="افزودن کالا"
        />
      ) : (
        <RowList>
          {shown.map((x) => {
            const hue = !x.active ? C.statusNeutral : x.stock <= 0 ? C.statusExpired : x.stock <= 3 ? C.statusWarn : C.statusOk;
            return (
              <Row
                key={x.id}
                hue={hue}
                dim={!x.active}
                icon={<BoxIcon size={20} />}
                title={x.name}
                meta={x.category || 'بدون دسته'}
                onClick={() => setEditing(x)}
                chips={<>
                  <Chip tone={hue}>{x.stock > 0 ? `${fa(x.stock)} ${x.unit}` : 'ناموجود'}</Chip>
                  {!x.active && <Chip tone={C.statusNeutral}>غیرفعال</Chip>}
                </>}
                trailing={<>
                  <b className="sk-fig" style={{ color: C.textStrong, fontSize: 13.5, fontWeight: 900 }}>{shortMoney(x.price)}</b>
                  <small style={{ color: C.subtle, fontSize: 10 }}>تومان</small>
                </>}
                actions={<>
                  <Button size="sm" variant="secondary" onClick={() => toggleActive(x)}>{x.active ? 'غیرفعال' : 'فعال'}</Button>
                  <Button size="sm" variant="danger" onClick={() => del(x.id)} icon={<TrashIcon size={13} />}>حذف</Button>
                </>}
              />
            );
          })}
        </RowList>
      )}

      {showAdd && <ProductEditSheet product={null} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <ProductEditSheet product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {showCatalog && (
        <CatalogImportSheet kind="products" existing={ownedNames} onClose={() => setShowCatalog(false)} onImported={afterImport} />
      )}

      <BottomNav />
      <style>{SCREEN_CSS + `
.pr-import{width:100%;border:0;border-radius:15px;padding:12px 14px;margin-bottom:12px;font:900 12.5px var(--font-sans);display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:transform .16s ease}
.pr-import:active{transform:scale(.99)}
.pr-note{border-radius:13px;padding:10px 14px;font:800 12px var(--font-sans);margin-bottom:12px}
      `}</style>
    </Screen>
  );
}

function ProductEditSheet({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [unit, setUnit] = useState(product?.unit || 'عدد');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(productImageUrl(product?.imageUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dto = {
        name, category: category || undefined, description: description || undefined,
        price: Number(price) || 0, stock: Number(stock) || 0, unit,
        image: imageFile || undefined,
      };
      if (product) await api.products.update(product.id, dto);
      else await api.products.create(dto);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={product ? 'ویرایش محصول' : 'افزودن محصول'} icon={<BoxIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 140, borderRadius: 16, cursor: 'pointer', overflow: 'hidden',
            background: C.surface2, border: `1.5px dashed ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
          }}
        >
          {preview ? (
            <img src={preview} alt="پیش‌نمایش" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <ImageIcon size={24} color={C.subtle} />
              <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>افزودن عکس محصول</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />

        <FormField label="نام محصول" required><Input value={name} onChange={e => setName(e.target.value)} required /></FormField>
        <FormField label="توضیحات"><TextArea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="ویژگی‌ها، مشخصات..." /></FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="دسته‌بندی"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً روغن و فیلتر" /></FormField>
          <FormField label="واحد"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="عدد / لیتر / متر" /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="قیمت (تومان)" required><Input value={price} onChange={e => setPrice(e.target.value)} type="number" required /></FormField>
          <FormField label="موجودی"><Input value={stock} onChange={e => setStock(e.target.value)} type="number" /></FormField>
        </div>

        {error && (
          <div role="alert" style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">{product ? 'ذخیره تغییرات' : 'افزودن محصول'}</Button>
      </form>
    </Sheet>
  );
}
