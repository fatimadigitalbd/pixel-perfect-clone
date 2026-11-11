import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Printer, Upload, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/cv")({
  head: () => ({ meta: [{ title: "সিভি তৈরি — Fatima Digital" }, { name: "description", content: "জনপ্রিয় বাংলা ও ইংরেজি সিভি/বায়োডাটা ফরম্যাটে দ্রুত সিভি তৈরি ও প্রিন্ট।" }, { property: "og:title", content: "সিভি তৈরি — Fatima Digital" }, { property: "og:description", content: "বাংলা ও ইংরেজি সিভি ফরম্যাট।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CvMaker,
});

type Cv = Partial<Record<"name"|"title"|"phone"|"email"|"address"|"permanent"|"father"|"mother"|"dob"|"nid"|"religion"|"marital"|"nationality"|"blood"|"objective"|"education"|"experience"|"skills"|"languages"|"reference", string>> & Record<string, string | undefined>;
const FORMATS = [
  { id: "en-classic", l: "English — Classic", lang: "en" },
  { id: "en-modern", l: "English — Modern (sidebar)", lang: "en" },
  { id: "bn-biodata", l: "বাংলা — জীবন বৃত্তান্ত", lang: "bn" },
  { id: "bn-govt", l: "বাংলা — সরকারি চাকরির বায়োডাটা", lang: "bn" },
] as const;
const FIELDS: { k: string; bn: string; en: string; long?: boolean }[] = [
  { k: "name", bn: "নাম", en: "Full name" }, { k: "title", bn: "পদবি/লক্ষ্য পদ", en: "Job title" },
  { k: "phone", bn: "মোবাইল", en: "Phone" }, { k: "email", bn: "ইমেইল", en: "Email" },
  { k: "address", bn: "বর্তমান ঠিকানা", en: "Present address" }, { k: "permanent", bn: "স্থায়ী ঠিকানা", en: "Permanent address" },
  { k: "father", bn: "পিতার নাম", en: "Father's name" }, { k: "mother", bn: "মাতার নাম", en: "Mother's name" },
  { k: "dob", bn: "জন্ম তারিখ", en: "Date of birth" }, { k: "nid", bn: "জাতীয় পরিচয়পত্র নং", en: "NID no." },
  { k: "religion", bn: "ধর্ম", en: "Religion" }, { k: "marital", bn: "বৈবাহিক অবস্থা", en: "Marital status" },
  { k: "nationality", bn: "জাতীয়তা", en: "Nationality" }, { k: "blood", bn: "রক্তের গ্রুপ", en: "Blood group" },
  { k: "objective", bn: "ক্যারিয়ার উদ্দেশ্য", en: "Career objective", long: true },
  { k: "education", bn: "শিক্ষাগত যোগ্যতা (প্রতি লাইনে: পরীক্ষা | প্রতিষ্ঠান | বোর্ড | সাল | ফলাফল)", en: "Education (per line: Exam | Institute | Board | Year | Result)", long: true },
  { k: "experience", bn: "অভিজ্ঞতা (প্রতি লাইনে একটি)", en: "Experience (one per line)", long: true },
  { k: "skills", bn: "দক্ষতা (কমা দিয়ে)", en: "Skills (comma separated)" }, { k: "languages", bn: "ভাষা", en: "Languages" },
  { k: "reference", bn: "রেফারেন্স", en: "Reference", long: true },
];
const SAMPLE: Cv = { nationality: "বাংলাদেশী", education: "SSC | ... | Dhaka | 2018 | GPA 5.00\nHSC | ... | Dhaka | 2020 | GPA 5.00" };

function CvMaker() {
  const [fmt, setFmt] = useState<(typeof FORMATS)[number]["id"]>("en-classic");
  const [cv, setCv] = useState<Cv>(SAMPLE);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const bn = fmt.startsWith("bn");
  useEffect(() => { const s = localStorage.getItem("fd-cv"); if (s) try { setCv(JSON.parse(s)); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem("fd-cv", JSON.stringify(cv)); }, [cv]);

  function print() {
    const w = window.open("", "_blank"); if (!w || !paper.current) return;
    const css = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).map((n) => n.outerHTML).join("");
    w.document.write(`<html><head><title>CV — ${cv.name ?? ""}</title>${css}<style>@page{size:A4;margin:0}body{margin:0;background:#fff}</style></head><body>${paper.current.outerHTML}<script>setTimeout(()=>print(),500)</script></body></html>`);
    w.document.close();
  }
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="সিভি তৈরি" sub="বাংলা ও ইংরেজি জনপ্রিয় ফরম্যাট · A4 প্রিন্ট">
        <Button variant="outline" onClick={() => { setCv(SAMPLE); setPhoto(null); }}><RotateCcw className="mr-1 h-4 w-4" /> নতুন</Button>
        <Button onClick={print}><Printer className="mr-1 h-4 w-4" /> প্রিন্ট / PDF</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3 print:hidden">
          <div className="grid grid-cols-2 gap-2">{FORMATS.map((f) => <Button key={f.id} size="sm" variant={fmt === f.id ? "default" : "outline"} className="h-auto whitespace-normal py-2" onClick={() => setFmt(f.id)}>{f.l}</Button>)}</div>
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> ছবি যোগ করুন</Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setPhoto(String(r.result)); r.readAsDataURL(f); } }} />
          {FIELDS.map((f) => <div key={f.k}><Label className="text-xs">{bn ? f.bn : f.en}</Label>{f.long ? <Textarea rows={3} value={cv[f.k] ?? ""} onChange={(e) => setCv({ ...cv, [f.k]: e.target.value })} /> : <Input value={cv[f.k] ?? ""} onChange={(e) => setCv({ ...cv, [f.k]: e.target.value })} />}</div>)}
        </div>
        <div className="overflow-x-auto bg-muted p-4">
          <div ref={paper} className="mx-auto bg-card text-foreground shadow-card" style={{ width: "210mm", minHeight: "297mm" }}>
            <CvPaper fmt={fmt} cv={cv} photo={photo} />
          </div>
        </div>
      </div>
    </div>
  );
}

const lines = (s?: string) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
function EduTable({ cv, bn }: { cv: Cv; bn: boolean }) {
  const rows = lines(cv.education).map((l) => l.split("|").map((x) => x.trim()));
  if (!rows.length) return null;
  const head = bn ? ["পরীক্ষা", "প্রতিষ্ঠান", "বোর্ড", "সাল", "ফলাফল"] : ["Exam", "Institute", "Board", "Year", "Result"];
  return <table className="w-full border-collapse text-[12px]"><thead><tr>{head.map((h) => <th key={h} className="border border-foreground/40 p-1">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{head.map((_, j) => <td key={j} className="border border-foreground/40 p-1 text-center">{r[j] ?? ""}</td>)}</tr>)}</tbody></table>;
}
function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return <section className="mt-4"><h3 className="mb-1 border-b-2 border-primary pb-0.5 text-[14px] font-bold uppercase text-primary">{t}</h3>{children}</section>;
}
function Personal({ cv, bn }: { cv: Cv; bn: boolean }) {
  const keys = ["father", "mother", "dob", "nid", "religion", "marital", "nationality", "blood", "permanent"];
  return <table className="text-[12.5px]"><tbody>{keys.filter((k) => cv[k]).map((k) => { const f = FIELDS.find((x) => x.k === k)!; return <tr key={k}><td className="w-44 py-0.5 align-top">{bn ? f.bn : f.en}</td><td className="px-2 align-top">:</td><td className="py-0.5">{cv[k]}</td></tr>; })}</tbody></table>;
}

function CvPaper({ fmt, cv, photo }: { fmt: string; cv: Cv; photo: string | null }) {
  const bn = fmt.startsWith("bn");
  const ph = photo ? <img src={photo} alt="" className="h-[45mm] w-[35mm] border object-cover" /> : null;
  const skills = (cv.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (fmt === "en-modern") return (
    <div className="flex min-h-[297mm] text-[13px]">
      <aside className="w-[68mm] bg-primary p-6 text-primary-foreground">
        {ph && <div className="mb-4 flex justify-center">{ph}</div>}
        <h3 className="font-bold uppercase">Contact</h3><p className="mt-1 break-words">{cv.phone}<br />{cv.email}<br />{cv.address}</p>
        {skills.length > 0 && <><h3 className="mt-5 font-bold uppercase">Skills</h3><ul className="mt-1 list-disc pl-4">{skills.map((s) => <li key={s}>{s}</li>)}</ul></>}
        {cv.languages && <><h3 className="mt-5 font-bold uppercase">Languages</h3><p>{cv.languages}</p></>}
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-primary">{cv.name || "Your Name"}</h1><p className="text-lg text-teal">{cv.title}</p>
        {cv.objective && <Sec t="Profile"><p>{cv.objective}</p></Sec>}
        {cv.experience && <Sec t="Experience"><ul className="list-disc pl-5">{lines(cv.experience).map((l, i) => <li key={i}>{l}</li>)}</ul></Sec>}
        <Sec t="Education"><EduTable cv={cv} bn={false} /></Sec>
        <Sec t="Personal details"><Personal cv={cv} bn={false} /></Sec>
        {cv.reference && <Sec t="Reference"><p className="whitespace-pre-line">{cv.reference}</p></Sec>}
      </main>
    </div>
  );
  const T = bn
    ? { obj: "ক্যারিয়ার উদ্দেশ্য", edu: "শিক্ষাগত যোগ্যতা", exp: "অভিজ্ঞতা", sk: "দক্ষতা", lg: "ভাষা", per: "ব্যক্তিগত তথ্য", ref: "রেফারেন্স", decl: "আমি এই মর্মে অঙ্গীকার করছি যে, উপরে প্রদত্ত সকল তথ্য সত্য ও সঠিক।", sign: "স্বাক্ষর" }
    : { obj: "Career Objective", edu: "Educational Qualification", exp: "Experience", sk: "Skills", lg: "Languages", per: "Personal Information", ref: "Reference", decl: "I hereby declare that all the information given above is true and correct to the best of my knowledge.", sign: "Signature" };
  return (
    <div className={`p-[16mm] text-[13px] ${bn ? "font-serif-bn" : ""}`}>
      {fmt === "bn-govt" && <h2 className="mb-3 text-center text-xl font-bold underline">জীবন বৃত্তান্ত</h2>}
      <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
        <div><h1 className="text-2xl font-bold text-primary">{cv.name || (bn ? "আপনার নাম" : "Your Name")}</h1>{cv.title && <p className="text-teal">{cv.title}</p>}<p className="mt-1">{cv.address}</p><p>{bn ? "মোবাইল" : "Mobile"}: {cv.phone} {cv.email && <>· {bn ? "ইমেইল" : "Email"}: {cv.email}</>}</p></div>
        {ph}
      </header>
      {cv.objective && <Sec t={T.obj}><p>{cv.objective}</p></Sec>}
      <Sec t={T.edu}><EduTable cv={cv} bn={bn} /></Sec>
      {cv.experience && <Sec t={T.exp}><ul className="list-disc pl-5">{lines(cv.experience).map((l, i) => <li key={i}>{l}</li>)}</ul></Sec>}
      {(skills.length > 0 || cv.languages) && <Sec t={`${T.sk}${cv.languages ? " / " + T.lg : ""}`}><p>{skills.join(", ")}</p>{cv.languages && <p>{T.lg}: {cv.languages}</p>}</Sec>}
      <Sec t={T.per}><Personal cv={cv} bn={bn} /></Sec>
      {cv.reference && <Sec t={T.ref}><p className="whitespace-pre-line">{cv.reference}</p></Sec>}
      <p className="mt-6">{T.decl}</p>
      <div className="mt-12 flex justify-end"><div className="w-48 border-t border-foreground pt-1 text-center">{T.sign}</div></div>
    </div>
  );
}
