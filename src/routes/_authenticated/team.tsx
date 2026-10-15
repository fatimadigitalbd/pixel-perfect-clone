import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-session";
import { audit } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{"title": "স্টাফ ও সেটিংস — Fatima Digital"}, {"name": "description", "content": "দোকানের স্টাফ অনুমোদন ও কার্যকলাপ পর্যালোচনা।"}, {"property": "og:title", "content": "স্টাফ ও সেটিংস — Fatima Digital"}, {"property": "og:description", "content": "দোকানের স্টাফ অনুমোদন ও কার্যকলাপ পর্যালোচনা।"}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
  component: Team,
});

function Team() {
  const me = useMe();
  const qc = useQueryClient();
  const people = useQuery({
    queryKey: ["team"],
    enabled: !!me.data?.isAdmin,
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  const logs = useQuery({
    queryKey: ["audit"],
    enabled: !!me.data?.isAdmin,
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  async function grant(uid: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "staff" });
    if (error) return toast.error(error.message);
    await audit("role.grant_staff", { uid });
    qc.invalidateQueries({ queryKey: ["team"] });
  }
  async function revoke(uid: string) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "staff");
    if (error) return toast.error(error.message);
    await audit("role.revoke_staff", { uid });
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  if (me.data && !me.data.isAdmin) return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">এই পেজটি শুধু দোকান মালিকের (Admin) জন্য।</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="স্টাফ ও সেটিংস" sub="নতুন স্টাফ /auth পেজে অ্যাকাউন্ট খুললে এখানে দেখা যাবে — অনুমোদন দিন" />
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground"><tr><th className="p-3">নাম</th><th className="p-3">ইমেইল</th><th className="p-3">ভূমিকা</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y">
            {people.data?.map((p) => (
              <tr key={p.id}>
                <td className="p-3">{p.display_name}</td>
                <td className="p-3">{p.email}</td>
                <td className="p-3">{p.roles.includes("admin") ? "মালিক (Admin)" : p.roles.includes("staff") ? "স্টাফ" : <span className="text-warning-foreground">অপেক্ষমাণ</span>}</td>
                <td className="p-3 text-right">
                  {!p.roles.includes("admin") && (p.roles.includes("staff")
                    ? <Button size="sm" variant="outline" onClick={() => revoke(p.id)}>বাতিল</Button>
                    : <Button size="sm" onClick={() => grant(p.id)}>স্টাফ করুন</Button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">স্টাফ: আয়-ব্যয় যোগ/সম্পাদনা, অর্ডার ও টুলস ব্যবহার। শুধু মালিক: মুছে ফেলা, রিস্টোর, চাকরির বিজ্ঞপ্তি, স্টাফ ব্যবস্থাপনা।</p>

      <h2 className="mb-2 mt-8 font-semibold">অডিট লগ (সাম্প্রতিক ৫০)</h2>
      <div className="rounded-xl border bg-card p-3 text-sm shadow-card">
        {logs.data?.length === 0 && <p className="text-muted-foreground">কোনো লগ নেই</p>}
        <ul className="divide-y">{logs.data?.map((l) => <li key={l.id} className="py-1.5"><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("bn-BD")}</span> · {l.action}</li>)}</ul>
      </div>
    </div>
  );
}
