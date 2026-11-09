CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'অন্যান্য',
  unit text NOT NULL DEFAULT 'পিস',
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sell_price numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','sale')),
  qty numeric(12,2) NOT NULL CHECK (qty > 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  moved_on date NOT NULL DEFAULT current_date,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.product_movements TO authenticated;
GRANT ALL ON public.products, public.product_movements TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "members add products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()));
CREATE POLICY "members edit products" ON public.products FOR UPDATE TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "members read moves" ON public.product_movements FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "members add moves" ON public.product_movements FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()));
CREATE POLICY "admin delete moves" ON public.product_movements FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));