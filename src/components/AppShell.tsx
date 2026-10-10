import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Wallet, Camera, FileText, IdCard, Inbox, Briefcase, Users, LogOut, Menu, X, Languages,
} from "lucide-react";
import { Brand } from "./Brand";
import { useI18n, type Key } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-session";

const nav: { to: string; k: Key; i: typeof Wallet }[] = [
  { to: "/dashboard", k: "dashboard", i: LayoutDashboard },
  { to: "/accounts", k: "accounts", i: Wallet },
  { to: "/photo", k: "photo", i: Camera },
  { to: "/documents", k: "documents", i: FileText },
  { to: "/cards", k: "cards", i: IdCard },
  { to: "/orders", k: "orders", i: Inbox },
  { to: "/jobs", k: "jobs", i: Briefcase },
  { to: "/team", k: "team", i: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useMe();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const side = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5"><Brand light /></div>
      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to as "/dashboard"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold [&>svg]:text-sidebar-primary" }}
          >
            <n.i className="h-[18px] w-[18px]" />
            {t(n.k)}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <Languages className="h-4 w-4" /> {lang === "bn" ? "English" : "বাংলা"}
        </button>
        <div className="truncate px-3 text-xs text-sidebar-foreground/60">{me.data?.email} {me.data?.isAdmin ? "· Admin" : ""}</div>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> {t("signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block print:hidden">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div className="w-64">{side}</div>
          <button aria-label="close" className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
          <button aria-label="menu" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <Brand />
          {open && <X className="hidden" />}
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {me.data && !me.data.isMember ? <Pending /> : children}
        </main>
      </div>
    </div>
  );
}

function Pending() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
      <h2 className="text-xl font-bold">অনুমোদনের অপেক্ষায়</h2>
      <p className="mt-2 text-muted-foreground">
        আপনার অ্যাকাউন্ট তৈরি হয়েছে। দোকান মালিক "স্টাফ ও সেটিংস" থেকে আপনাকে স্টাফ হিসেবে যোগ করলে সব টুল দেখতে পাবেন।
      </p>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div>
        <h1 className="text-2xl font-bold text-primary md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
