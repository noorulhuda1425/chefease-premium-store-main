import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "hello@rapidkitch.com";
const STORE_NAME = "RapidKitch";

interface OrderItem {
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  color: string | null;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

function generateCustomerEmail(orderId: string, totalPrice: number, shipping: ShippingAddress, items: OrderItem[]): string {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:16px 12px;border-bottom:1px solid #f0f0f0;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${item.product_image ? `<img src="${item.product_image}" alt="${item.product_name}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;" />` : ""}
          <div>
            <p style="margin:0;font-weight:600;color:#1a1a1a;font-size:14px;">${item.product_name}</p>
            ${item.color ? `<p style="margin:4px 0 0;color:#888;font-size:12px;">Color: ${item.color}</p>` : ""}
          </div>
        </div>
      </td>
      <td style="padding:16px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666;font-size:14px;">${item.quantity}</td>
      <td style="padding:16px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#1a1a1a;font-size:14px;">PKR ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);border-radius:20px 20px 0 0;padding:40px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${STORE_NAME}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Premium Kitchen Essentials</p>
    </div>
    <div style="background:#fff;padding:40px 32px 24px;text-align:center;">
      <div style="width:72px;height:72px;margin:0 auto 20px;background:#e8f5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:36px;">✓</span>
      </div>
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:24px;font-weight:700;">Order Confirmed!</h2>
      <p style="margin:0;color:#888;font-size:14px;">Thank you for shopping with ${STORE_NAME}</p>
      <div style="margin:16px auto;background:#f7f7f8;border-radius:12px;padding:12px 24px;display:inline-block;">
        <p style="margin:0;color:#888;font-size:12px;">Order Number</p>
        <p style="margin:4px 0 0;color:#1a1a1a;font-size:18px;font-weight:700;font-family:monospace;">#${shortId}</p>
      </div>
    </div>
    <div style="background:#fff;padding:0 32px;">
      <h3 style="margin:0 0 16px;padding-top:24px;border-top:1px solid #f0f0f0;color:#1a1a1a;font-size:16px;font-weight:600;">Order Items</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#fafafa;">
            <th style="padding:10px 12px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Product</th>
            <th style="padding:10px 12px;text-align:center;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Qty</th>
            <th style="padding:10px 12px;text-align:right;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="padding:20px 0;border-top:2px solid #1a1a1a;margin-top:8px;">
        <table style="width:100%;">
          <tr><td style="color:#888;font-size:14px;padding:4px 0;">Payment Method</td><td style="text-align:right;color:#1a1a1a;font-size:14px;font-weight:500;">Cash on Delivery</td></tr>
          <tr><td style="color:#1a1a1a;font-size:18px;font-weight:700;padding:12px 0 0;">Total</td><td style="text-align:right;color:#1a1a1a;font-size:18px;font-weight:700;padding:12px 0 0;">PKR ${totalPrice.toLocaleString()}</td></tr>
        </table>
      </div>
    </div>
    <div style="background:#fff;padding:24px 32px;border-top:1px solid #f0f0f0;">
      <h3 style="margin:0 0 16px;color:#1a1a1a;font-size:16px;font-weight:600;">📦 Delivery Details</h3>
      <div style="background:#f7f7f8;border-radius:12px;padding:16px;">
        <p style="margin:0 0 6px;color:#1a1a1a;font-size:14px;font-weight:600;">${shipping.firstName} ${shipping.lastName}</p>
        <p style="margin:0 0 4px;color:#666;font-size:13px;">${shipping.address}</p>
        <p style="margin:0 0 4px;color:#666;font-size:13px;">${shipping.city}, ${shipping.state} ${shipping.zip}</p>
        <p style="margin:0 0 4px;color:#666;font-size:13px;">📱 ${shipping.phone}</p>
        <p style="margin:0;color:#666;font-size:13px;">📧 ${shipping.email}</p>
      </div>
      <div style="margin-top:16px;background:#fff8e1;border-radius:12px;padding:14px 16px;border-left:4px solid #ffc107;">
        <p style="margin:0;color:#666;font-size:13px;">🚚 Estimated delivery: <strong style="color:#1a1a1a;">3-5 business days</strong>. We'll contact you at <strong>${shipping.phone}</strong> before delivery.</p>
      </div>
    </div>
    <div style="background:#1a1a1a;border-radius:0 0 20px 20px;padding:32px;text-align:center;">
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">${STORE_NAME}</p>
      <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:12px;">Premium Kitchen Essentials</p>
      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;">Questions? Reply to this email or contact us at ${ADMIN_EMAIL}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminEmail(orderId: string, totalPrice: number, shipping: ShippingAddress, items: OrderItem[]): string {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const itemsList = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#333;">${item.product_name}${item.color ? ` (${item.color})` : ""}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#333;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;color:#333;">PKR ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#dc2626;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🔔 New Order Received!</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:600;">#${shortId} — PKR ${totalPrice.toLocaleString()}</p>
    </div>
    <div style="background:#fff;padding:24px;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#333;">Customer</h3>
      <div style="background:#f9f9f9;border-radius:10px;padding:14px;margin-bottom:20px;font-size:13px;color:#555;line-height:1.6;">
        <strong style="color:#111;">${shipping.firstName} ${shipping.lastName}</strong><br/>
        📱 ${shipping.phone}<br/>
        📧 ${shipping.email}<br/>
        📍 ${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}
        ${shipping.notes ? `<br/>📝 <em>${shipping.notes}</em>` : ""}
      </div>
      <h3 style="margin:0 0 12px;font-size:14px;color:#333;">Items</h3>
      <table style="width:100%;border-collapse:collapse;">${itemsList}</table>
      <div style="margin-top:16px;padding-top:12px;border-top:2px solid #111;text-align:right;">
        <span style="font-size:16px;font-weight:700;color:#111;">Total: PKR ${totalPrice.toLocaleString()}</span>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#888;">Payment: Cash on Delivery</p>
    </div>
    <div style="background:#f4f4f5;border-radius:0 0 16px 16px;padding:16px;text-align:center;">
      <p style="margin:0;color:#999;font-size:11px;">${STORE_NAME} Order Notification</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { orderId } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order from database using service role (server-side only)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError || !items?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Order items not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shipping = order.shipping_address as unknown as ShippingAddress;
    if (!shipping?.email) {
      return new Response(
        JSON.stringify({ success: false, error: "No shipping email found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderItems: OrderItem[] = items.map((i: any) => ({
      product_name: i.product_name,
      product_image: i.product_image,
      quantity: i.quantity,
      price: i.price,
      color: i.color,
    }));

    // Send customer confirmation email
    const customerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${STORE_NAME} <onboarding@resend.dev>`,
        to: [shipping.email],
        subject: `Order Confirmed! #${orderId.slice(0, 8).toUpperCase()} — ${STORE_NAME}`,
        html: generateCustomerEmail(orderId, order.total_price, shipping, orderItems),
      }),
    });

    const customerData = await customerRes.json();
    if (!customerRes.ok) {
      console.error("Customer email failed:", customerData);
    }

    // Send admin notification email
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${STORE_NAME} Orders <onboarding@resend.dev>`,
        to: [ADMIN_EMAIL],
        subject: `🔔 New Order #${orderId.slice(0, 8).toUpperCase()} — PKR ${order.total_price.toLocaleString()}`,
        html: generateAdminEmail(orderId, order.total_price, shipping, orderItems),
      }),
    });

    const adminData = await adminRes.json();
    if (!adminRes.ok) {
      console.error("Admin email failed:", adminData);
    }

    return new Response(
      JSON.stringify({ success: true, customer: customerData, admin: adminData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
