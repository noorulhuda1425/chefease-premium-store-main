import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, order_total } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Coupon code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("id, code, discount_type, discount_value, is_active, expires_at, min_order_amount, max_uses, used_count")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (error || !coupon) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid coupon code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!coupon.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon is no longer active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.max_uses && (coupon.used_count ?? 0) >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon has reached its usage limit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.min_order_amount && order_total < coupon.min_order_amount) {
      return new Response(
        JSON.stringify({ valid: false, error: `Minimum order of PKR ${coupon.min_order_amount} required` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let discount = 0;
    if (coupon.discount_type === "percentage") {
      discount = Math.round((order_total * coupon.discount_value) / 100);
    } else {
      discount = coupon.discount_value;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        discount,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
