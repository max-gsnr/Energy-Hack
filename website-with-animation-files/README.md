# TwinSight Animated Website

Animated Lovable/TanStack frontend for the solar plant digital twin demo.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

## Build check

```bash
npm run build
```

## Key files

- `src/routes/index.tsx` - overview dashboard
- `src/routes/map.tsx` - inverter map
- `src/routes/events.tsx` - events and trend page
- `src/routes/inverter.$id.tsx` - inverter detail page
- `src/components/twin/Motion.tsx` - shared animation wrappers
- `src/components/twin/ReconBar.tsx` - animated energy reconciliation bar
- `src/data/twinsight/` - bundled JSON data used by the demo frontend

Generated folders such as `node_modules/` and `dist/` are intentionally ignored.

