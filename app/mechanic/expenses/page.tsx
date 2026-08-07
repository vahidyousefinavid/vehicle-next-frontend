'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PersianDatePicker from '@/components/PersianDatePicker';
import { api, WorkshopExpense, ExpenseCategory, toJalali } from '@/lib/api';
import {
  C, Card, Button, IconButton, FormField, Input, Sheet, EmptyState, Spinner, alpha,
} from '@/components/ui';
import {
  ChevronRightIcon, PlusIcon, WalletIcon, TrashIcon, SettingsIcon, CheckIcon,
} from '@/components/icons';

function today() { return new Date().toISOString().slice(0, 10); }
const money = (n: number) => Math.round(n).toLocaleString('fa-IR');

/**
 * Where the workshop's own costs are recorded.
 *
 * Until this existed the system could only report revenue: rent, wages and stock purchases
 * were invisible, so the one number a workshop owner actually cares about — whether the
 * month made money — could not be produced at all.
 */
export default function WorkshopExpensesPage() {
  const router = useRouter();
  const [items, setItems] = useState<WorkshopExpense[]>([]);
  const [categories, setCategories] = useState<{ key: ExpenseCategory; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorkshopExpense | null>(null);

  function load() {
    api.mechanic.expenses().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    api.mechanic.expenseCategories().then(setCategories).catch(() => {});
    load();
  }, [router]);

  const labelOf = (k: ExpenseCategory) => categories.find(c => c.key === k)?.label ?? k;

  // Grouped by month so the list reads the way the question is asked — "این ماه چقدر خرج شد".
  const byMonth = items.reduce<Record<string, WorkshopExpense[]>>((acc, e) => {
    const key = e.spentAt.slice(0, 7);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const months = Object.keys(byMonth).sort().reverse();
  const total = items.reduce((s, e) => s + e.amount, 0);

  async function remove(e: WorkshopExpense) {
    if (!confirm(`«${e.description || labelOf(e.category)}» حذف شود؟`)) return;
    await api.mechanic.removeExpense(e.id);
    load();
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 90 }}>
      <Navbar title="هزینه‌های تعمیرگاه" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 0, color: C.muted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronRightIcon size={14} /> بازگشت
        </button>

        <Card padding="14px 16px" style={{ marginBottom: 14, borderInlineStart: `3px solid ${C.statusExpired}` }}>
          <p style={{ fontSize: 11.5, color: C.muted, margin: 0, fontWeight: 600 }}>مجموع هزینه‌های ثبت‌شده</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: C.statusExpired, margin: '4px 0 0' }}>
            {money(total)} <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>تومان</span>
          </p>
          <p style={{ fontSize: 10.5, color: C.subtle, margin: '5px 0 0', lineHeight: 1.7 }}>
            این مبلغ از درآمد تأییدشده کم می‌شود تا سود واقعی در صفحه حسابداری نمایش داده شود.
          </p>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>فهرست هزینه‌ها</h2>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>ثبت هزینه</Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={26} />}
            title="هنوز هزینه‌ای ثبت نشده"
            sub="اجاره، حقوق، برق و خرید قطعه را وارد کنید تا سود واقعی محاسبه شود"
            onAdd={() => setShowAdd(true)}
            btnLabel="ثبت هزینه"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {months.map(m => {
              const rows = byMonth[m];
              const monthTotal = rows.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={m}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.text2 }}>{toJalali(`${m}-01`).slice(0, 7)}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: C.statusExpired }}>{money(monthTotal)} ت</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {rows.map(e => (
                      <Card key={e.id} padding="11px 13px">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>
                              {e.description || labelOf(e.category)}
                            </p>
                            <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                              <span>{labelOf(e.category)}</span>
                              <span>{toJalali(e.spentAt)}</span>
                              {e.recurring && <span style={{ color: C.statusInfo, fontWeight: 700 }}>ماهانه</span>}
                              {e.reference && <span>#{e.reference}</span>}
                            </p>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.statusExpired, whiteSpace: 'nowrap' }}>
                            {money(e.amount)}
                          </span>
                          <IconButton label="ویرایش" onClick={() => setEditing(e)} size={28}><SettingsIcon size={13} /></IconButton>
                          <IconButton label="حذف" onClick={() => remove(e)} size={28}><TrashIcon size={13} /></IconButton>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {(showAdd || editing) && (
        <ExpenseSheet
          expense={editing}
          categories={categories}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}

      <BottomNav />
    </div>
  );
}

function ExpenseSheet({
  expense, categories, onClose, onSaved,
}: {
  expense: WorkshopExpense | null;
  categories: { key: ExpenseCategory; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!expense;
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'other');
  const [spentAt, setSpentAt] = useState(expense?.spentAt ?? today());
  const [description, setDescription] = useState(expense?.description ?? '');
  const [recurring, setRecurring] = useState(expense?.recurring ?? false);
  const [reference, setReference] = useState(expense?.reference ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) { setError('مبلغ را وارد کنید'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        amount: value, category, spentAt,
        description: description.trim() || undefined,
        recurring,
        reference: reference.trim() || undefined,
      };
      if (isEdit) await api.mechanic.updateExpense(expense!.id, payload);
      else await api.mechanic.addExpense(payload);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'ثبت هزینه انجام نشد');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={isEdit ? 'ویرایش هزینه' : 'ثبت هزینه جدید'} icon={<WalletIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <FormField label="مبلغ (تومان)">
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="مثلاً ۱۲۰۰۰۰۰۰" />
        </FormField>

        <FormField label="دسته‌بندی">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                style={{
                  padding: '6px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${category === c.key ? C.green : alpha(C.text2, 22)}`,
                  background: category === c.key ? alpha(C.green, 12) : 'transparent',
                  color: category === c.key ? C.green : C.muted,
                }}
              >{c.label}</button>
            ))}
          </div>
        </FormField>

        <FormField label="تاریخ هزینه">
          <PersianDatePicker value={spentAt} onChange={setSpentAt} />
        </FormField>

        <FormField label="توضیح (اختیاری)">
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="مثلاً اجاره مرداد" />
        </FormField>

        <FormField label="شماره فاکتور یا رسید (اختیاری)">
          <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="اختیاری" />
        </FormField>

        <button
          type="button"
          onClick={() => setRecurring(!recurring)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', cursor: 'pointer',
            border: `1px solid ${recurring ? C.green : alpha(C.text2, 22)}`, borderRadius: 10,
            padding: '9px 12px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
            color: recurring ? C.green : C.muted, textAlign: 'right',
          }}
        >
          <span style={{
            width: 17, height: 17, borderRadius: 5, flexShrink: 0,
            border: `1px solid ${recurring ? C.green : alpha(C.text2, 30)}`,
            background: recurring ? C.green : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>{recurring && <CheckIcon size={11} />}</span>
          هزینه ماهانه تکرارشونده (اجاره، حقوق و مشابه)
        </button>

        {error && <p style={{ fontSize: 12, color: C.statusExpired, margin: 0 }}>{error}</p>}

        <Button type="submit" fullWidth loading={saving}>{isEdit ? 'ذخیره تغییرات' : 'ثبت هزینه'}</Button>
      </form>
    </Sheet>
  );
}
