import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; email: string; password: string }) => {
    const email = String(d.email ?? "").trim().toLowerCase();
    const name = String(d.name ?? "").trim().slice(0, 100);
    const password = String(d.password ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("সঠিক ইমেইল দিন");
    if (password.length < 8) throw new Error("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর");
    if (!name) throw new Error("নাম দিন");
    return { email, name, password };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("শুধু মালিক স্টাফ যোগ করতে পারেন");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { display_name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "অ্যাকাউন্ট তৈরি হয়নি");
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "staff" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);
    return { id: created.user.id };
  });
