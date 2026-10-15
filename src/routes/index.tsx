import { createFileRoute, Link } from "@tanstack/react-router";
import { Upload, Search, LogIn, Camera, FileText, Printer, Phone, MapPin } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ফাতিমা ডিজিটাল — ফটো, প্রিন্ট ও কম্পিউটার সেবা | Faydabad" },
      { name: "description", content: "ফাতিমা ডিজিটাল, ফায়দাবাদ, ঢাকা ১২৩০। ফোন থেকে ফাইল পাঠান, অর্ডারের অবস্থা দেখুন।" },
      { property: "og:title", content: "ফাতিমা ডিজিটাল — Smart Studio" },
      { property: "og:description", content: "Passport photo, printing, typing & computer services in Faydabad, Dhaka." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Brand />
        <Button asChild variant="outline" size="sm">
          <Link to="/auth"><LogIn className="mr-1 h-4 w-4" /> স্টাফ লগইন</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <div className="overflow-hidden rounded-2xl bg-brand p-8 text-primary-foreground shadow-card md:p-12">
          <h1 className="max-w-xl text-3xl font-bold leading-snug md:text-4xl">
            ফোন থেকেই ফাইল পাঠান, দোকানে এসে প্রিন্ট নিন
          </h1>
          <p className="mt-3 max-w-lg text-primary-foreground/85">
            ছবি, পিডিএফ বা ডকুমেন্ট আপলোড করুন — একটি অর্ডার নম্বর পাবেন। কাজ প্রস্তুত হলে অবস্থা দেখে নিন।
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/upload"><Upload className="mr-2 h-5 w-5" /> ফাইল পাঠান</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/track" search={{}}><Search className="mr-2 h-5 w-5" /> অর্ডার ট্র্যাক করুন</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { i: Camera, t: "পাসপোর্ট ও এনআইডি ছবি", d: "সঠিক মাপে, প্রিন্ট-রেডি" },
            { i: Printer, t: "প্রিন্ট ও ফটোকপি", d: "সাদাকালো ও রঙিন" },
            { i: FileText, t: "বাংলা টাইপিং ও সিভি", d: "আবেদনপত্র, চুক্তিপত্র" },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border bg-card p-5 shadow-card">
              <s.i className="h-6 w-6 text-teal" />
              <div className="mt-3 font-display font-semibold">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> ফায়দাবাদ, ঢাকা ১২৩০</span>
          <a href="tel:01341097821" className="flex items-center gap-2 hover:text-foreground"><Phone className="h-4 w-4" /> 01341097821</a>
        </div>
      </section>
    </div>
  );
}
