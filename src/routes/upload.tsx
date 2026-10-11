import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Upload as UpIcon } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "ফাইল পাঠান — ফাতিমা ডিজিটাল" },
      { name: "description", content: "ফোন থেকে ছবি বা ডকুমেন্ট ফাতিমা ডিজিটালে পাঠান এবং অর্ডার নম্বর নিন।" },
      { property: "og:title", content: "ফাইল পাঠান — ফাতিমা ডিজিটাল" },
      { property: "og:description", content: "Send photos and documents to Fatima Digital securely." },
    ],
  }),
  component: UploadPage,
});

const SERVICES = ["প্রিন্ট (সাদাকালো)", "প্রিন্ট (রঙিন)", "পাসপোর্ট/এনআইডি ছবি", "ফটোকপি", "টাইপিং/কম্পোজ", "অনলাইন আবেদন", "অন্যান্য"];

function UploadPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await submitOrder({ data: new FormData(e.currentTarget) });
      setDone(r.order_no);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md">
        <Link to="/"><Brand /></Link>
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h1 className="mt-3 text-xl font-bold">ফাইল পাওয়া গেছে!</h1>
              <p className="mt-1 text-muted-foreground">আপনার অর্ডার নম্বর</p>
              <div className="my-3 rounded-lg bg-accent py-3 font-display text-2xl font-bold tracking-wider text-accent-foreground">{done}</div>
              <p className="text-sm text-muted-foreground">নম্বরটি দোকানে দেখান অথবা অবস্থা জানতে ট্র্যাক করুন।</p>
              <Button asChild className="mt-4"><Link to="/track" search={{ no: done }}>অবস্থা দেখুন</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h1 className="text-xl font-bold">ফাইল পাঠান</h1>
              <div><Label>আপনার নাম *</Label><Input name="name" required maxLength={100} /></div>
              <div><Label>মোবাইল (ঐচ্ছিক)</Label><Input name="phone" inputMode="tel" placeholder="01XXXXXXXXX" /></div>
              <div><Label>সেবা *</Label>
                <select name="service" className="h-10 w-full rounded-md border bg-card px-2">{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div><Label>নির্দেশনা</Label><Textarea name="instructions" maxLength={1000} placeholder="যেমন: ২ কপি, রঙিন, A4" /></div>
              <div><Label>ফাইল * (ছবি, PDF, Word · প্রতিটি ১০MB পর্যন্ত)</Label>
                <Input name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" />
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                আমি সম্মতি দিচ্ছি যে কাজের জন্য দোকান আমার ফাইল দেখবে। ফাইল গোপন রাখা হয় এবং ৩০ দিন পর মুছে ফেলা হয়।
              </label>
              <Button className="w-full" disabled={busy || !consent}><UpIcon className="mr-2 h-4 w-4" />{busy ? "আপলোড হচ্ছে…" : "পাঠান"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
