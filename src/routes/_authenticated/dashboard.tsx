import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, Clock, Camera, FileText, IdCard, Inbox, Briefcase, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { txQuery, ordersQuery, jobsQuery } from "@/lib/queries";
import { taka, sumMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Fatima Digital" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const today = todayISO();
  const yearStart = today.slice(0, 4) + "-01-01";
  const monthStart = today.slice(0, 7) + "-01";
  const tx = useQuery(txQuery(yearStart));
  const orders = useQuery(ordersQuery);
  const jobs = useQuery(jobsQuery);
  const rows = tx.data ?? [];
  const inc = (f: (d: string) => boolean) => sumMoney(rows.filter((r) => r.kind === "income" && f(r.txn_date)).map((r) => r.amount));
  const exp = (f: (d: string) => boolean) => sumMoney(rows.filter((r) => r.kind === "expense" && f(r.txn_date)).map((r) => r.amount));
  const inMonth = (d: string) => d >= monthStart;
  const monthInc = inc(inMonth);
  const monthExp = exp(inMonth);
  const due = sumMoney(rows.filter((r) => r.kind === "income").map((r) => Math.max(0, Number(r.amount) - Number(r.paid_amount))));
  const pending = (orders.data ?? []).filter((o) => o.status === "received" || o.status === "in_progress").length;
  const upcoming = (jobs.data ?? []).filter((j) => j.deadline && j.deadline >= today).slice(0, 4);

  const stats = [
    { l: t("todayIncome"), v: taka(inc((d) => d === today)), i: TrendingUp, c: "text-teal" },
    { l: t("monthIncome"), v: taka(monthInc), i: TrendingUp, c: "text-teal" },
    { l: t("yearIncome"), v: taka(inc(() => true)), i: TrendingUp, c: "text-primary" },
    { l: t("expenses"), v: taka(monthExp), i: TrendingDown, c: "text-destructive" },
    { l: t("netProfit"), v: taka(sumMoney([monthInc, -monthExp])), i: Wallet, c: monthInc - monthExp >= 0 ? "text-success" : "text-destructive" },
    { l: t("pending"), v: String(pending), i: Clock, c: "text-warning-foreground" },
    { l: t("due"), v: taka(due), i: AlertCircle, c: "text-destructive" },
  ];
  const tools = [
    { to: "/photo", i: Camera, k: "photo" as const },
    { to: "/documents", i: FileText, k: "documents" as const },
    { to: "/cards", i: IdCard, k: "cards" as const },
    { to: "/orders", i: Inbox, k: "orders" as const },
    { to: "/accounts", i: Wallet, k: "accounts" as const },
    { to: "/jobs", i: Briefcase, k: "jobs" as const },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("dashboard")} sub={new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "full" })} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-sm text-muted-foreground">{s.l}<s.i className={`h-4 w-4 ${s.c}`} /></div>
            <div className={`mt-2 font-display text-2xl font-bold ${s.c}`}>{tx.isLoading ? "…" : s.v}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("quickTools")}</h2>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {tools.map((x) => (
          <Link key={x.to} to={x.to as "/photo"} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm shadow-card transition hover:border-teal">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent"><x.i className="h-5 w-5 text-accent-foreground" /></div>
            {t(x.k)}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">{t("recent")}</h2>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">এখনো কোনো লেনদেন নেই। "আয়-ব্যয়" থেকে যোগ করুন।</p>}
          <ul className="divide-y">
            {rows.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div><div className="font-medium">{r.category}</div><div className="text-xs text-muted-foreground">{r.txn_date} · {r.description}</div></div>
                <span className={r.kind === "income" ? "font-semibold text-teal" : "font-semibold text-destructive"}>{r.kind === "income" ? "+" : "−"}{taka(r.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">আসন্ন চাকরির শেষ তারিখ</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">কোনো সক্রিয় বিজ্ঞপ্তি নেই।</p>}
          <ul className="divide-y">
            {upcoming.map((j) => (
              <li key={j.id} className="py-2 text-sm">
                <a href={j.source_url} target="_blank" rel="noreferrer" className="font-medium hover:text-teal">{j.title}</a>
                <div className="text-xs text-muted-foreground">{j.organization} · শেষ: {j.deadline}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
