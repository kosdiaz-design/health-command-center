import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import {
  LayoutDashboard, Dumbbell, Flame, UtensilsCrossed,
  Pill, ClipboardList, Mic, Heart, Moon, Sun, Menu, X, Cable, PenLine
} from "lucide-react";
import { useState, useEffect } from "react";
import PerplexityAttribution from "@/components/PerplexityAttribution";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/log", label: "Daily Log", icon: PenLine },
  { path: "/workouts", label: "Workouts", icon: Dumbbell },
  { path: "/recovery", label: "Sauna & Cold Plunge", icon: Flame },
  { path: "/meals", label: "Meal Planner", icon: UtensilsCrossed },
  { path: "/medications", label: "Meds & Supplements", icon: Pill },
  { path: "/health-records", label: "Health Records", icon: ClipboardList },
  { path: "/voice-notes", label: "Voice Notes", icon: Mic },
  { path: "/integrations", label: "Integrations", icon: Cable },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useHashLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Health Command Center">
            <rect width="32" height="32" rx="8" fill="hsl(185 65% 48% / 0.15)" />
            <path d="M16 6 L16 10" stroke="hsl(185,65%,60%)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 16 C8 11.6 11.6 8 16 8 C20.4 8 24 11.6 24 16 C24 20.4 20.4 24 16 24 C11.6 24 8 20.4 8 16Z" stroke="hsl(185,65%,55%)" strokeWidth="1.5" fill="none"/>
            <path d="M6 16 H11 L13 12 L16 22 L18 14 L20 18 L22 16 H26" stroke="hsl(185,65%,60%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground leading-tight">Health Command</div>
            <div className="text-xs text-sidebar-foreground/50">Personal Health OS</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location === path || (path === "/" && location === "");
            return (
              <Link key={path} href={path} onClick={() => setSidebarOpen(false)}>
                <div data-testid={`nav-${label.toLowerCase().replace(/\s+/g,'-')}`} className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }
                `}>
                  <Icon size={16} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40 mb-3">
            <Heart size={12} className="text-red-400" />
            <span>Stay strong, stay healthy</span>
          </div>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-muted"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              {navItems.find(n => n.path === location || (n.path === "/" && location === ""))?.label ?? "Health Command Center"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              data-testid="button-theme-toggle"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
