import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "লগইন — Fatima Digital" },
      { name: "description", content: "Fatima Digital staff and owner sign in." },
      { property: "og:title", content: "লগইন — Fatima Digital" },
      { property: "og:description", content: "Staff sign in to the Fatima Digital studio dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name } },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/dashboard" });
        else toast.success("ইমেইলে পাঠানো লিংকে ক্লিক করে অ্যাকাউন্ট নিশ্চিত করুন।");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-card">
        <Link to="/"><Brand /></Link>
        <h1 className="mt-6 text-xl font-bold">{mode === "in" ? "লগইন করুন" : "নতুন অ্যাকাউন্ট"}</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "in" ? "Owner / staff sign in" : "প্রথম অ্যাকাউন্টটি মালিক (Admin) হবে। পরবর্তীরা মালিকের অনুমোদন পাবে।"}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "up" && (
            <div><Label>নাম</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div><Label>ইমেইল</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>পাসওয়ার্ড</Label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button className="w-full" disabled={busy}>{busy ? "অপেক্ষা করুন…" : mode === "in" ? "লগইন" : "অ্যাকাউন্ট তৈরি"}</Button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-teal hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "অ্যাকাউন্ট নেই? তৈরি করুন" : "আগে থেকে অ্যাকাউন্ট আছে? লগইন"}
        </button>
      </div>
    </div>
  );
}
