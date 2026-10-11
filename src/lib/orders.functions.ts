import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX = 10 * 1024 * 1024;

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Invalid form");
    return d;
  })
  .handler(async ({ data }) => {
    const name = String(data.get("name") ?? "").trim().slice(0, 100);
    const phone = String(data.get("phone") ?? "").trim().slice(0, 20);
    const service = String(data.get("service") ?? "").trim().slice(0, 60);
    const instructions = String(data.get("instructions") ?? "").trim().slice(0, 1000);
    if (!name || !service) throw new Error("নাম ও সেবা আবশ্যক");
    if (phone && !/^01[3-9]\d{8}$/.test(phone)) throw new Error("সঠিক মোবাইল নম্বর দিন");
    const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new Error("অন্তত একটি ফাইল দিন");
    if (files.length > 10) throw new Error("সর্বোচ্চ ১০টি ফাইল");
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) throw new Error(`${f.name}: এই ধরনের ফাইল গ্রহণযোগ্য নয়`);
      if (f.size > MAX) throw new Error(`${f.name}: ১০MB এর বেশি`);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const d = new Date();
    const order_no = `FD${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const stored: { path: string; name: string; type: string; size: number }[] = [];
    for (const f of files) {
      const safe = f.name.replace(/[^\w.\-]/g, "_").slice(-80);
      const path = `${order_no}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabaseAdmin.storage.from("customer-files").upload(path, f, { contentType: f.type });
      if (error) throw new Error("আপলোড ব্যর্থ: " + error.message);
      stored.push({ path, name: f.name, type: f.type, size: f.size });
    }
    const { error } = await supabaseAdmin.from("orders").insert({ order_no, customer_name: name, phone: phone || null, service, instructions: instructions || null, files: stored });
    if (error) throw new Error(error.message);
    return { order_no };
  });

export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { order_no: string }) => ({ order_no: String(d.order_no).trim().toUpperCase().slice(0, 30) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("orders").select("order_no,status,service,created_at").eq("order_no", data.order_no).maybeSingle();
    return o; // no personal info or files exposed
  });

export const purgeExpired = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("শুধু অ্যাডমিন");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.from("orders").select("id,files").lt("expires_at", new Date().toISOString());
    let n = 0;
    for (const o of list ?? []) {
      const paths = ((o.files as { path: string }[]) ?? []).map((f) => f.path);
      if (paths.length) await supabaseAdmin.storage.from("customer-files").remove(paths);
      await supabaseAdmin.from("orders").update({ files: [] }).eq("id", o.id);
      n++;
    }
    await supabaseAdmin.from("audit_logs").insert({ actor: context.userId, action: "orders.purge_expired", details: { count: n } });
    return { count: n };
  });
