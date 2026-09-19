# دستیار خودرو — Design System (MASTER)

Source of truth for every screen. A page-specific file under `design-system/pages/`
overrides this one; otherwise this applies.

Derived with `ui-ux-pro-max`, then corrected against what this product actually is:
a tool three different people use daily, in Persian, on a phone.

---

## 1. What this app is

Not a marketing site and not a consumer marketplace. Three audiences share one codebase:

| Role | Uses it | Density |
|---|---|---|
| Car owner | occasionally, to request a service | **airy** — one decision per screen |
| Mechanic | all day, to run a workshop | **dense** — maximum information per screen |
| Seller | all day, to run a parts shop | **dense** |

This split is the core rule. The owner's screens sell; the provider's screens work.
Same components, two spacing densities.

## 2. Colour

Violet is the single accent — the direction the product owner pinned from a reference
kit. Everything else is a violet-biased neutral. Semantic hues carry data meaning only
and are never decoration.

| Token | Light | Role |
|---|---|---|
| `--brand` | `#6C4CF0` | the one accent. Active state, primary action, the figure being edited |
| `--bg` | `#F4F2FE` | page ground |
| `--surface-solid` | `#FFFFFF` | cards |
| `--brand-ink` | `#241F86` | card titles (indigo, not black) |
| `--status-ok` | `#047857` | money in, healthy |
| `--status-warn` | `#B45309` | due soon, low stock |
| `--status-expired` | `#B91C1C` | overdue, unpaid, out of stock |

### Text ladder — all steps verified ≥ 4.5:1

Measured against white, the lavender page, and the tint fill. Eye-matching a mockup is
what put the previous values at 3.44:1 and 2.25:1; these are computed.

| Token | Hex | white | lavender | tint |
|---|---|---|---|---|
| `--text-2` | `#4A4770` | 8.65 | 7.82 | 7.29 |
| `--muted` | `#5F5C7D` | 6.34 | 5.73 | 5.34 |
| `--text-4` | `#666287` | 5.73 | 5.18 | 4.83 |
| `--subtle` | `#6A6786` | 5.39 | 4.87 | 4.54 |

## 3. Spacing — 8px base

Swiss modular spacing. Every gap and pad is a step on this scale; no arbitrary values.

`--sp-1: 4px · --sp-2: 8px · --sp-3: 12px · --sp-4: 16px · --sp-5: 24px · --sp-6: 32px · --sp-7: 48px`

Provider screens drop one step: what is `--sp-4` on an owner screen is `--sp-3` on a
mechanic or seller screen. That is the whole density mechanism.

## 4. Radius ladder

Radius shrinks with the element, so a nested plate always reads tighter than its parent.

`sheet 26 · card 20 · row 18 · plate 13 · stepper 11 · pill 999`

## 5. Type

IRANSans, self-hosted, four weights. Latin display faces are not an option — they have
no Persian glyphs. Hierarchy comes from **weight and colour, not size**: four sizes only.

| Role | Size | Weight |
|---|---|---|
| Screen title | 20px | 950 |
| Section head | 17px | 950 |
| Row title / body | 14px | 900 / 400 |
| Meta, chips | 11–12px | 700–900 |

Every figure uses `font-variant-numeric: tabular-nums` so columns of money align.
Persian digits everywhere (`toLocaleString('fa-IR')`); a year is `useGrouping: false`.

## 6. Screen skeleton

Every list screen, all three roles:

1. `ScreenHeader` — back target, eyebrow, title, one-line state summary
2. `Glance` — 2–4 **derived** figures answering the screen's question before the list
3. `Filters` — URL-synced, with counts
4. `RowList` of `Row` — leading colour rail carries state, so a list is triaged without reading

Home screens use the `RoleHome` spine instead: greeting → hero figure → work queue → tools → list.

## 7. Non-negotiables

- Touch targets ≥ 44px on coarse pointers — use `.tap44` to pad the hit area rather than inflate the paint
- Errors carry `role="alert"`; visual-only errors do not exist
- Filters live in the URL; a filtered view must be shareable
- No borders on cards — depth is a violet-tinted shadow
- `prefers-reduced-motion` respected; transitions 150–300ms on `transform`/`opacity` only
- RTL: `→` is not mirrored by bidi — never use it for direction; use logical properties

## 8. Anti-patterns for this product

- A provider screen that leads with a form instead of their numbers
- Raw counts in a Glance strip — it must show something derived, or it is just a label
- A second accent hue; semantic colours are not accents
- Latin digits or `toLocaleString()` without an explicit `fa-IR`
- Adding UI for a capability the backend does not have (e.g. a payment-method picker when billing happens after invoice approval)
