'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { svcMeta } from '@/components/serviceMeta';
import CatalogImportSheet, { serviceIdentity } from '@/components/CatalogImportSheet';
import { api, MechanicServiceOffering, SERVICE_TYPES } from '@/lib/api';
import { C, Card, IconBadge, Button, IconButton, FormField, Input, ChipGroup, Sheet, EmptyState, Spinner, alpha} from '@/components/ui';
import { ChevronRightIcon, WrenchIcon, PlusIcon, TrashIcon, StoreIcon, NavigationIcon, SparklesIcon } from '@/components/icons';

export default function MechanicServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<MechanicServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MechanicServiceOffering | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    api.mechanicServices.list().then(setServices).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    load();
  }, []);

  function afterImport(added: number, skipped: number) {
    setShowCatalog(false);
    setNotice(added ? `${added} خدمت اضافه شد${skipped ? ` · ${skipped} مورد از قبل ثبت شده بود` : ''}` : 'همه‌ی موارد انتخابی از قبل ثبت شده بودند');
    load();
  }

  async function del(id: string) {
    if (!confirm('این خدمت از فهرست خدمات شما حذف شود؟')) return;
    await api.mechanicServices.remove(id);
    load();
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="خدمات من" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>افزودن خدمت</Button>
        </div>

        <button
          onClick={() => setShowCatalog(true)}
          style={{
            width: '100%', marginBottom: 14, padding: '11px 14px', borderRadius: 14,
            background: alpha(C.green, 8), border: `1px dashed ${alpha(C.green, 34)}`,
            color: C.green, fontSize: 12.5, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <SparklesIcon size={15} /> افزودن از لیست آماده خدمات
        </button>

        {notice && (
          <div style={{
            marginBottom: 12, padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            color: C.green, background: alpha(C.green, 10), border: `1px solid ${alpha(C.green, 22)}`,
          }}>
            {notice}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : services.length === 0 ? (
          <EmptyState
            icon={<WrenchIcon size={26} />}
            title="هنوز خدمتی ثبت نکردی"
            sub="خدماتی که ارائه می‌دی رو ثبت کن تا مشتری‌ها توی جستجو پیدات کنن — یا از لیست آماده‌ی بالا یکجا اضافه کن"
            onAdd={() => setShowAdd(true)}
            btnLabel="افزودن اولین خدمت"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {services.map(s => {
              const meta = svcMeta(s.serviceType);
              const Icon = meta.icon;
              return (
                <Card key={s.id} padding="13px 15px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <IconBadge color={meta.color}><Icon size={19} /></IconBadge>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(s)}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>
                        {s.serviceType === 'سایر' && s.customName ? s.customName : s.serviceType}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                        {s.price != null && (
                          <span style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>از {s.price.toLocaleString()} ت</span>
                        )}
                        {s.supportsInShop && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '2px 8px' }}>
                            <StoreIcon size={11} /> حضوری
                          </span>
                        )}
                        {s.supportsOnSite && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '2px 8px' }}>
                            <NavigationIcon size={11} /> در محل
                          </span>
                        )}
                      </div>
                    </div>
                    <IconButton label="حذف" onClick={() => del(s.id)} size={28}><TrashIcon size={13} /></IconButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {(showAdd || editing) && (
        <ServiceEditSheet
          existing={editing}
          takenTypes={services.filter(s => s.id !== editing?.id).map(s => s.serviceType)}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}
      {showCatalog && (
        <CatalogImportSheet
          kind="services"
          existing={services.map(s => serviceIdentity(s.serviceType, s.customName))}
          onClose={() => setShowCatalog(false)}
          onImported={afterImport}
        />
      )}
      <BottomNav />
    </div>
  );
}

function ServiceEditSheet({ existing, takenTypes, onClose, onSaved }: {
  existing: MechanicServiceOffering | null; takenTypes: string[]; onClose: () => void; onSaved: () => void;
}) {
  const available = SERVICE_TYPES.filter(t => t === 'سایر' || t === existing?.serviceType || !takenTypes.includes(t));
  const [serviceType, setServiceType] = useState(existing?.serviceType || available[0]);
  const [customName, setCustomName] = useState(existing?.customName || '');
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '');
  const [supportsInShop, setSupportsInShop] = useState(existing?.supportsInShop ?? true);
  const [supportsOnSite, setSupportsOnSite] = useState(existing?.supportsOnSite ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dto = {
        serviceType,
        customName: serviceType === 'سایر' ? (customName || undefined) : undefined,
        price: price ? Number(price) : undefined,
        supportsInShop,
        supportsOnSite,
      };
      if (existing) await api.mechanicServices.update(existing.id, dto);
      else await api.mechanicServices.create(dto);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={existing ? 'ویرایش خدمت' : 'افزودن خدمت'} icon={<WrenchIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="نوع خدمت">
          <ChipGroup options={available} value={serviceType} onChange={setServiceType} />
        </FormField>

        {serviceType === 'سایر' && (
          <FormField label="نام خدمت" required>
            <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="مثلاً واش و پولیش" required />
          </FormField>
        )}

        <FormField label="قیمت شروع (تومان، اختیاری)">
          <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="مثلاً ۵۰۰۰۰۰" />
        </FormField>

        <FormField label="نحوه ارائه">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: C.fill1, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <input type="checkbox" checked={supportsInShop} onChange={e => setSupportsInShop(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.green }} />
              <StoreIcon size={15} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>حضوری در تعمیرگاه</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: C.fill1, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <input type="checkbox" checked={supportsOnSite} onChange={e => setSupportsOnSite(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.green }} />
              <NavigationIcon size={15} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>در محل مشتری (سیار)</span>
            </label>
          </div>
        </FormField>

        {error && (
          <div style={{ fontSize: 12, color: C.statusExpired, background: alpha(C.statusExpired, 10), border: `1px solid ${alpha(C.statusExpired, 20)}`, borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">{existing ? 'ذخیره تغییرات' : 'افزودن خدمت'}</Button>
      </form>
    </Sheet>
  );
}
