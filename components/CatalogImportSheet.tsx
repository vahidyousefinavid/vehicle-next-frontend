'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  api, CatalogPage, PresetPart, PresetProduct, PresetService,
  ImportPartItem, ImportProductItem, ImportServiceItem,
} from '@/lib/api';
import { C, alpha, Button, Input, Sheet, Spinner } from './ui';
import { BoxIcon, WrenchIcon, CheckIcon, SearchIcon } from './icons';

export type CatalogKind = 'parts' | 'products' | 'services';

/** یک ردیف یکنواخت که هر سه نوع کاتالوگ به آن نگاشت می‌شوند */
interface Row {
  key: string;
  title: string;
  category: string;
  meta: string;
  price: number;
  identity: string;   // برای تشخیص مواردی که قبلاً اضافه شده‌اند
}

const COPY: Record<CatalogKind, { title: string; hint: string; cta: string; icon: React.ReactNode }> = {
  parts: {
    title: 'افزودن از لیست آماده قطعات',
    hint: 'قطعات پرکاربرد را انتخاب کن تا یکجا به کاتالوگ تعمیرگاهت اضافه شوند. قیمت‌ها پیشنهادی‌اند و بعداً قابل ویرایش.',
    cta: 'افزودن به کاتالوگ من',
    icon: <BoxIcon size={16} />,
  },
  products: {
    title: 'افزودن از لیست آماده کالاها',
    hint: 'کالاهای پرفروش را انتخاب کن تا یکجا به فروشگاهت اضافه شوند. قیمت‌ها پیشنهادی‌اند و بعداً قابل ویرایش.',
    cta: 'افزودن به فروشگاه من',
    icon: <BoxIcon size={16} />,
  },
  services: {
    title: 'افزودن از لیست آماده خدمات',
    hint: 'خدماتی که ارائه می‌دهی را انتخاب کن تا یکجا ثبت شوند. قیمت‌ها پیشنهادی‌اند و بعداً قابل ویرایش.',
    cta: 'افزودن به خدمات من',
    icon: <WrenchIcon size={16} />,
  },
};

export function serviceIdentity(serviceType: string, customName?: string) {
  return serviceType === 'سایر' ? `سایر:${customName ?? ''}` : serviceType;
}

export default function CatalogImportSheet({
  kind, existing, onClose, onImported,
}: {
  kind: CatalogKind;
  /** شناسه‌ی مواردی که کاربر از قبل دارد (نام قطعه/کالا یا شناسه‌ی خدمت) */
  existing: string[];
  onClose: () => void;
  onImported: (added: number, skipped: number) => void;
}) {
  const [q, setQ]                 = useState('');
  const [category, setCategory]   = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [rows, setRows]           = useState<Row[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Record<string, number>>({}); // key → قیمت
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const copy = COPY[kind];
  const owned = useMemo(() => new Set(existing.map(e => e.trim())), [existing]);

  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await fetchPage(kind, q, category);
        if (!alive) return;
        setCategories(page.categories);
        setRows(page.rows);
      } catch (err: any) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }, 220);
    return () => { alive = false; clearTimeout(id); };
  }, [kind, q, category]);

  const selectable = rows.filter(r => !owned.has(r.identity));
  const selectedKeys = Object.keys(selected);
  const allSelected = selectable.length > 0 && selectable.every(r => r.key in selected);

  function toggle(row: Row) {
    setSelected(prev => {
      const next = { ...prev };
      if (row.key in next) delete next[row.key];
      else next[row.key] = row.price;
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = { ...prev };
        selectable.forEach(r => delete next[r.key]);
        return next;
      });
    } else {
      setSelected(prev => {
        const next = { ...prev };
        selectable.forEach(r => { next[r.key] = next[r.key] ?? r.price; });
        return next;
      });
    }
  }

  async function submit() {
    if (!selectedKeys.length) return;
    setSaving(true);
    setError('');
    try {
      const res = await importSelection(kind, selected);
      onImported(res.added, res.skipped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={copy.title} icon={copy.icon} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>{copy.hint}</p>

        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در لیست آماده..." />

        {/* دسته‌بندی‌ها — روی موبایل به‌صورت افقی اسکرول می‌شود */}
        <div style={{
          display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2,
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        }}>
          {['همه', ...categories].map(cat => {
            const val = cat === 'همه' ? '' : cat;
            const on = category === val;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(val)}
                style={{
                  flexShrink: 0, padding: '6px 13px', borderRadius: 11,
                  fontSize: 11.5, fontWeight: on ? 800 : 600,
                  background: on ? alpha(C.green, 14) : C.fill1,
                  border: `1px solid ${on ? alpha(C.green, 34) : C.border}`,
                  color: on ? C.green : C.muted,
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {!loading && selectable.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            style={{
              alignSelf: 'flex-start', background: 'none', border: 'none',
              color: C.green, fontSize: 11.5, fontWeight: 800, padding: 0,
            }}
          >
            {allSelected ? 'برداشتن انتخاب همه' : `انتخاب همه (${selectable.length} مورد)`}
          </button>
        )}

        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 12.5, padding: '26px 0' }}>
            <SearchIcon size={22} />
            <p style={{ margin: '8px 0 0' }}>موردی با این جستجو پیدا نشد</p>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 7,
            maxHeight: '46vh', overflowY: 'auto', overscrollBehavior: 'contain',
          }}>
            {rows.map(row => {
              const already = owned.has(row.identity);
              const on = row.key in selected;
              return (
                <div
                  key={row.key}
                  style={{
                    borderRadius: 14, padding: '10px 12px',
                    border: `1px solid ${on ? alpha(C.green, 40) : C.border}`,
                    background: on ? alpha(C.green, 8) : C.surface2,
                    opacity: already ? 0.55 : 1,
                  }}
                >
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => toggle(row)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      background: 'none', border: 'none', padding: 0, textAlign: 'right',
                      cursor: already ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 7, flexShrink: 0,
                      border: `1.5px solid ${on ? C.green : C.border}`,
                      background: on ? C.green : 'transparent',
                      color: C.onAccent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <CheckIcon size={12} />}
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'block', fontSize: 13, fontWeight: 700, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                        {already ? 'قبلاً اضافه شده' : row.meta}
                      </span>
                    </span>

                    <span style={{ fontSize: 12, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                      {row.price.toLocaleString()} ت
                    </span>
                  </button>

                  {on && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, flexShrink: 0 }}>قیمت خودت:</span>
                      <input
                        type="number"
                        value={selected[row.key]}
                        onChange={e => setSelected(prev => ({ ...prev, [row.key]: Number(e.target.value) || 0 }))}
                        style={{
                          flex: 1, minWidth: 0, boxSizing: 'border-box',
                          background: C.fill2, border: `1px solid ${C.border}`, borderRadius: 10,
                          padding: '7px 11px', fontSize: 12.5, color: C.text,
                          fontFamily: 'Vazirmatn, sans-serif', direction: 'ltr', textAlign: 'right',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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

        <Button onClick={submit} loading={saving} disabled={!selectedKeys.length} fullWidth size="lg">
          {selectedKeys.length ? `${copy.cta} (${selectedKeys.length} مورد)` : copy.cta}
        </Button>
      </div>
    </Sheet>
  );
}

/* ── نگاشت هر کاتالوگ به ردیف‌های یکنواخت ──────────────────────── */

async function fetchPage(kind: CatalogKind, q: string, category: string): Promise<{ categories: string[]; rows: Row[] }> {
  if (kind === 'parts') {
    const page: CatalogPage<PresetPart> = await api.catalog.parts(q, category);
    return {
      categories: page.categories,
      rows: page.items.map(p => ({
        key: p.key, title: p.name, category: p.category,
        meta: `${p.category} · ${p.unit}`, price: p.suggestedPrice, identity: p.name,
      })),
    };
  }
  if (kind === 'products') {
    const page: CatalogPage<PresetProduct> = await api.catalog.products(q, category);
    return {
      categories: page.categories,
      rows: page.items.map(p => ({
        key: p.key, title: p.name, category: p.category,
        meta: `${p.category} · ${p.unit}`, price: p.suggestedPrice, identity: p.name,
      })),
    };
  }
  const page: CatalogPage<PresetService> = await api.catalog.services(q, category);
  return {
    categories: page.categories,
    rows: page.items.map(s => ({
      key: s.key,
      title: s.customName || s.serviceType,
      category: s.category,
      meta: [s.category, s.supportsInShop ? 'حضوری' : null, s.supportsOnSite ? 'در محل' : null]
        .filter(Boolean).join(' · '),
      price: s.suggestedPrice,
      identity: serviceIdentity(s.serviceType, s.customName),
    })),
  };
}

function importSelection(kind: CatalogKind, selected: Record<string, number>) {
  const keys = Object.keys(selected);
  if (kind === 'parts') {
    const items: ImportPartItem[] = keys.map(key => ({ key, unitPrice: selected[key] }));
    return api.parts.importPresets(items);
  }
  if (kind === 'products') {
    const items: ImportProductItem[] = keys.map(key => ({ key, price: selected[key] }));
    return api.products.importPresets(items);
  }
  const items: ImportServiceItem[] = keys.map(key => ({ key, price: selected[key] }));
  return api.mechanicServices.importPresets(items);
}
