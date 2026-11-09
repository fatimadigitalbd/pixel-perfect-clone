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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "স্টাফ লগইন — Fatima Digital" },
      { name: "description", content: "Fatima Digital staff and owner sign in." },
      { property: "og:title", content: "স্টাফ লগইন — Fatima Digital" },
      { property: "og:description", content: "Staff sign in to the Fatima Digital studio dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav({ to: "/dashboard" });
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
        <h1 className="mt-6 text-xl font-bold">স্টাফ লগইন</h1>
        <p className="text-sm text-muted-foreground">নতুন অ্যাকাউন্ট শুধু দোকান মালিক তৈরি করতে পারেন।</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div><Label>ইমেইল</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>পাসওয়ার্ড</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button className="w-full" disabled={busy}>{busy ? "অপেক্ষা করুন…" : "লগইন"}</Button>
        </form>
      </div>
    </div>
  );
}
