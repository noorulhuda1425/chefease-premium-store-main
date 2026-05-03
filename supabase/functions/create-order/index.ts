import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_SHIPPING = 3000;
const SHIPPING_COST = 250;

// Sanitize string: trim, limit length, strip HTML tags
function sanitize(val: unknown, maxLen = 200): string {
  if (typeof val !== "string") return "";
  return val.trim().replace(/<[^>]*>/g, "").slice(0, maxLen);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { items, shipping, couponCode } = body;

    // --- Validate items ---
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const item of items) {
      if (!item.productId || typeof item.productId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid product ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid quantity" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Validate shipping ---
    if (!shipping || typeof shipping !== "object") {
      return new Response(
        JSON.stringify({ error: "Shipping data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requiredFields = ["firstName", "lastName", "email", "phone", "address", "city", "state", "zip"];
    for (const field of requiredFields) {
      if (!shipping[field] || typeof shipping[field] !== "string" || !shipping[field].trim()) {
        return new Response(
          JSON.stringify({ error: `${field} is required` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format
    if (!/^[\d\s+()-]{10,15}$/.test(shipping.phone.replace(/\s/g, ""))) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize all shipping fields
    const sanitizedShipping = {
      firstName: sanitize(shipping.firstName, 50),
      lastName: sanitize(shipping.lastName, 50),
      email: sanitize(shipping.email, 255),
      phone: sanitize(shipping.phone, 20),
      address: sanitize(shipping.address, 300),
      city: sanitize(shipping.city, 100),
      state: sanitize(shipping.state, 100),
      zip: sanitize(shipping.zip, 20),
      notes: sanitize(shipping.notes || "", 500),
    };

    // --- Resolve user from auth header ---
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (data?.claims?.sub) {
        userId = data.claims.sub;
      }
    }

    // --- Fetch product prices from database ---
    const productIds = items.map((i: any) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, images, in_stock, stock_quantity")
      .in("id", productIds);

    if (productsError || !products) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch products" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build product lookup
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // Validate all products exist and are in stock
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.productId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!product.in_stock || product.stock_quantity < item.quantity) {
        return new Response(
          JSON.stringify({ error: `${product.name} is out of stock` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || null,
        quantity: item.quantity,
        price: product.price,
        color: item.color ? sanitize(item.color, 50) : null,
      });
    }

    // --- Apply coupon server-side ---
    let discount = 0;
    if (couponCode && typeof couponCode === "string") {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, code, discount_type, discount_value, is_active, expires_at, min_order_amount, max_uses, used_count")
        .eq("code", couponCode.toUpperCase().trim())
        .maybeSingle();

      if (coupon && coupon.is_active) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) >= new Date();
        const withinLimit = !coupon.max_uses || (coupon.used_count ?? 0) < coupon.max_uses;
        const meetsMin = !coupon.min_order_amount || subtotal >= coupon.min_order_amount;

        if (notExpired && withinLimit && meetsMin) {
          if (coupon.discount_type === "percentage") {
            discount = Math.round((subtotal * coupon.discount_value) / 100);
          } else {
            discount = coupon.discount_value;
          }

          // Increment used_count
          await supabase
            .from("coupons")
            .update({ used_count: (coupon.used_count ?? 0) + 1 })
            .eq("id", coupon.id);
        }
      }
    }

    // --- Calculate total server-side ---
    const shippingCost = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
    const totalPrice = subtotal + shippingCost - discount;

    // --- Create order ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        total_price: totalPrice,
        status: "pending",
        shipping_address: sanitizedShipping,
        payment_method: "cod",
        notes: sanitizedShipping.notes || null,
        user_id: userId,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation failed:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Create order items ---
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsWithOrderId);
    if (itemsError) {
      console.error("Order items creation failed:", itemsError);
      // Clean up the order
      await supabase.from("orders").delete().eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Failed to create order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Send confirmation emails (non-blocking) ---
    try {
      await supabase.functions.invoke("send-order-email", {
        body: { orderId: order.id },
      });
    } catch {
      console.error("Email notification failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        totalPrice,
        subtotal,
        shippingCost,
        discount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Create order error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
