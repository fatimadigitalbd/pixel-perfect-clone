import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const r = (roles ?? []).map((x) => x.role);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        isAdmin: r.includes("admin"),
        isMember: r.length > 0,
      };
    },
  });
}
