import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const txQuery = (from: string) =>
  queryOptions({
    queryKey: ["tx", from],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("txn_date", from)
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  },
});

export const jobsQuery = queryOptions({
  queryKey: ["jobs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("job_circulars").select("*").order("deadline", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data;
  },
});

export async function audit(action: string, details?: Record<string, unknown>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({ actor: data.user.id, action, details: (details ?? null) as never });
}
