import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "bn" | "en";

const dict = {
  dashboard: ["ড্যাশবোর্ড", "Dashboard"],
  accounts: ["আয়-ব্যয়", "Income & Expense"],
  photo: ["পাসপোর্ট ছবি", "Passport Photo"],
  documents: ["বাংলা ডকুমেন্ট", "Bangla Documents"],
  cards: ["কার্ড ডিজাইনার", "Card Designer"],
  orders: ["কাস্টমার অর্ডার", "Customer Orders"],
  jobs: ["চাকরির খবর", "Job Circulars"],
  team: ["স্টাফ ও সেটিংস", "Staff & Settings"],
  signOut: ["সাইন আউট", "Sign out"],
  todayIncome: ["আজকের আয়", "Today's income"],
  monthIncome: ["এই মাসের আয়", "This month"],
  yearIncome: ["এই বছরের আয়", "This year"],
  expenses: ["মোট খরচ (মাস)", "Expenses (month)"],
  netProfit: ["নিট লাভ (মাস)", "Net profit (month)"],
  pending: ["চলমান কাজ", "Pending work"],
  due: ["বকেয়া", "Outstanding"],
  quickTools: ["দ্রুত টুলস", "Quick tools"],
  recent: ["সাম্প্রতিক লেনদেন", "Recent transactions"],
  income: ["আয়", "Income"],
  expense: ["খরচ", "Expense"],
  save: ["সংরক্ষণ", "Save"],
  cancel: ["বাতিল", "Cancel"],
  search: ["খুঁজুন…", "Search…"],
} as const;

export type Key = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "bn",
  setLang: () => {},
  t: (k) => dict[k][0],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");
  useEffect(() => {
    const s = localStorage.getItem("fd-lang");
    if (s === "en" || s === "bn") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("fd-lang", l);
  };
  const t = (k: Key) => dict[k][lang === "bn" ? 0 : 1];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
