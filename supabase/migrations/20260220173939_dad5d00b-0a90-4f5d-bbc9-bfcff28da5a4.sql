
-- Fix orders INSERT policy: validate user_id matches auth.uid() or is null (guest)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Fix order_items INSERT policy: only allow inserting items for orders you own
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Users can create items for own orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id IS NULL OR orders.user_id = auth.uid())
  )
);
