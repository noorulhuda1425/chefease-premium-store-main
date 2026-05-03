
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Only admins can view all coupons
CREATE POLICY "Admins can view coupons"
ON public.coupons
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
