import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AIPanel } from "./AIPanel";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/map", label: "Inverter Map" },
  { to: "/events", label: "Events" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const { location } = useRouterState();
  const path = location.pathname;
  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hairline-b bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 grid place-items-center">
              <motion.div
                className="w-3 h-3 bg-foreground rotate-45"
                animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.12, 1] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold tracking-[0.22em] uppercase">TwinSight</div>
              <div className="text-[10.5px] mono text-muted-foreground tracking-tight">PLANT_A&nbsp;//&nbsp;65_INVERTERS</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-0">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} className={`relative px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${isActive(n.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {n.label}
                {isActive(n.to) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-4 right-4 -bottom-px h-[2px] bg-foreground"
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  />
                )}
              </Link>
            ))}
          </nav>
          <motion.button
            onClick={() => setAiOpen(true)}
            className="text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-2 border border-foreground hover:bg-foreground hover:text-background transition-colors"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            Ask Analyst
          </motion.button>
        </div>
        <div className="md:hidden hairline-t">
          <div className="mx-auto max-w-[1280px] px-5 flex gap-0 overflow-x-auto">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] whitespace-nowrap ${isActive(n.to) ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground border-b-2 border-transparent"}`}>
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="hairline-t mt-16">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-[10px] mono uppercase tracking-[0.18em] text-muted-foreground">
            PLANT_A&nbsp;//&nbsp;ENERPARC&nbsp;//&nbsp;SCORED 2019–2025 VS FROZEN 2017 BASELINE
          </div>
          <div className="text-[10px] mono uppercase tracking-[0.18em] text-muted-foreground">
            MODEL: EXOGENOUS_ONLY&nbsp;//&nbsp;TRAINED 2017&nbsp;//&nbsp;CALIBRATED 2018
          </div>
        </div>
      </footer>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
