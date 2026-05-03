
-- Drop existing restrictive order policies
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

-- Allow anyone (including anonymous/guest) to create orders
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view their own orders, admins can view all
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow guests to view orders (not needed since they won't have accounts, but for completeness)
-- Guest orders are managed via order confirmation only

-- Allow anyone to create order items
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users/admins can view order items
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = order_items.order_id
  AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));
