# SolarTwin Frontend

Next.js 14 dashboard for the SolarTwin O&M agent console. Runs on port **3001** and proxies all `/api/*` requests to the backend on `:8088`.

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS custom properties |
| Animation | GSAP 3 |
| Charts | Recharts |
| Language | TypeScript |

## Getting started

```bash
cd frontend/solartwin
npm install
npm run dev      # http://localhost:3001
```

The Next.js config proxies `/api` → `http://localhost:8088`, so the backend must be running (see `start.sh`).

---

## Directory layout

```
frontend/solartwin/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, sets dark class
│   │   ├── page.tsx            # Entry — mounts <Dashboard />
│   │   └── globals.css         # CSS custom properties + utility classes
│   ├── components/
│   │   ├── Dashboard.tsx       # Root shell, tab state, modal gate
│   │   ├── TopBar.tsx          # Header with KPIs and LLM status
│   │   ├── OverviewTab.tsx     # Summary cards + trend chart + top findings
│   │   ├── InverterHeatmap.tsx # Grid-based inverter health map
│   │   ├── FindingsList.tsx    # Scrollable ranked findings list
│   │   ├── TimelinePanel.tsx   # Per-inverter narrative + milestone timeline
│   │   ├── DispatchTab.tsx     # Sent emails + pending criticals view
│   │   ├── DispatchModal.tsx   # 3-step dispatch flow (recipients → draft → send)
│   │   └── ChatPanel.tsx       # AI chat sidebar
│   ├── hooks/
│   │   └── useAsync.ts         # Generic async data fetcher hook
│   └── lib/
│       └── api.ts              # Typed API client + all TypeScript interfaces
```

---

## Component overview

### `Dashboard`
The root client component. Owns all top-level state:

- `tab` — active tab (`overview | inverters | dispatch`)
- `selectedInverter` — inverter ID currently focused in the heatmap
- `selectedFinding` — finding row highlighted in `FindingsList`
- `dispatchTarget` — finding that triggers the dispatch modal
- `sentEmails` — in-memory log of dispatched `EmailDraft` objects

Fetches `health`, `plant`, `map`, and `findings` once on mount via `useAsync`. Applies GSAP reveal animations on load and on tab switch.

---

### `TopBar`
Sticky header showing four KPI cards pulled from `/api/plant`:

- **Modeled loss** — total lost kWh (excl. curtailment)
- **Est. value lost** — loss × tariff in EUR
- **Curtailment** — curtailment kWh
- **Inverters** — total count + critical count

The sun logo spins continuously via GSAP. The LLM status indicator pulses green when the AI backend is reachable.

---

### `OverviewTab`
Three sections rendered in the `overview` tab:

1. **Summary cards** — critical / warning / total findings counts + total loss kWh
2. **Degradation trend chart** — `Recharts` `AreaChart` of `lost_kwh` per year, sourced from `plant.context.degradation_trend_summary`
3. **Top 10 findings table** — ranked list with severity chips, primary reason, kWh loss, EUR estimate, and a quick-dispatch button

Clicking a finding row navigates to the `inverters` tab with that inverter pre-selected.

---

### `InverterHeatmap`
Visual grid of every inverter laid out by `row` / `column` from `/api/map`.

Color mapping:

| Color | Meaning |
|---|---|
| Red `#ff4757` | Critical |
| Orange `#ffa502` | Warning |
| Yellow `#f9ca24` | Moderate |
| Green `#2ed573` | Normal |
| Grey `#4a5270` | Excluded from baseline |

Cells animate in with a staggered scale-up on data load. Clicking a cell selects the inverter, which opens the `TimelinePanel` beside the heatmap.

---

### `FindingsList`
Scrollable `<ul>` of all findings ranked by `priority`. Each row shows:

- Priority rank
- Inverter ID (strips `INV ` prefix)
- Severity chip
- Primary reason (truncated)
- kWh loss + EUR estimate
- Envelope button to open `DispatchModal`

Clicking a row cross-links the heatmap selection.

---

### `TimelinePanel`
Appears beside the heatmap when an inverter is selected. Calls `/api/timeline/{id}` and displays:

- Total loss kWh
- LLM-generated narrative paragraph
- Chronological milestones with colour-coded dots (critical / warning / moderate / brand)

A `pre-existing` chip is shown when the inverter was excluded from the baseline.

---

### `DispatchTab`
Three-panel layout within the `dispatch` tab:

- **Status sidebar** — counts for Sent / Draft / Pending
- **Recipients sidebar** — unique contact names from sent emails
- **Main area** — list of sent dispatches + pending critical findings not yet dispatched, each with a "Draft ✉" button

---

### `DispatchModal`
Full-screen overlay, three steps:

1. **Recipients** — contact cards auto-populated from `finding.routing`; toggle to include/exclude; calls `/api/dispatch` to generate the email draft via the LLM
2. **Draft** — displays the generated subject + body for review; "Send dispatch" triggers a simulated send
3. **Done** — confetti burst via GSAP, then closes and fires `onSent(draft)` back to `Dashboard`

---

### `ChatPanel`
Fixed right-side chat sidebar (320 px wide). Features:

- Online/offline indicator tied to `health.llm`
- Suggestion chips for first-time users
- Streaming-style animated typing indicator (bouncing dots)
- Message history passed with each request to `/api/chat` for context
- `Enter` to send, `Shift+Enter` for newline

---

## API client (`src/lib/api.ts`)

All requests go through `/api` which Next.js proxies to the backend.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | LLM connectivity check |
| `GET` | `/api/plant` | Plant summary, tariff, metadata |
| `GET` | `/api/map` | Inverter grid positions + health status |
| `GET` | `/api/findings` | Ranked findings list |
| `GET` | `/api/timeline/{id}` | Per-inverter narrative + milestones |
| `POST` | `/api/dispatch` | Generate LLM email draft for a finding |
| `POST` | `/api/chat` | Send message to the plant analyst agent |

All interfaces are defined and exported from `api.ts` (`PlantData`, `Finding`, `InverterMapItem`, `EmailDraft`, `ChatMessage`, etc.).

---

## `useAsync` hook

```ts
const { data, loading, error, refetch } = useAsync(() => api.plant(), []);
```

Generic hook that runs an async factory on mount (and when deps change), exposing `data | null`, `loading`, `error`, and a `refetch` callback.

---

## Theming

All colours are CSS custom properties defined in `globals.css` and referenced throughout as `var(--brand)`, `var(--critical)`, `var(--warning)`, etc. The `<html>` element carries `class="dark"`. Glassmorphism panels use the `.glass` utility class.

| Variable | Role |
|---|---|
| `--bg` | Page background |
| `--bg1` / `--bg2` / `--bg3` | Surface levels |
| `--brand` | Amber accent |
| `--critical` | Red |
| `--warning` | Orange |
| `--moderate` | Yellow |
| `--normal` | Green |
| `--muted` | Dimmed text / borders |
| `--border` | Panel borders |
| `--text` | Primary text |
