import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env vars not configured");

    // Fetch products from DB to give AI real store context
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: products } = await supabase
      .from("products")
      .select("name, slug, price, original_price, short_description, category, badge, in_stock, rating, review_count, images")
      .eq("in_stock", true)
      .order("rating", { ascending: false })
      .limit(50);

    const productCatalog = (products || [])
      .map((p: any) => {
        const discount = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
        return `- **${p.name}** | PKR ${p.price.toLocaleString()}${discount > 0 ? ` (${discount}% OFF, was PKR ${p.original_price.toLocaleString()})` : ""} | ${p.category} | ⭐ ${p.rating}/5 (${p.review_count} reviews)${p.badge ? ` | 🏷️ ${p.badge}` : ""} | ${p.short_description} | [Shop Now](/product/${p.slug})`;
      })
      .join("\n");

    const systemPrompt = `You are RapidKitch's friendly AI shopping assistant. You help customers find the perfect kitchen products.

## YOUR PRODUCT CATALOG (REAL STORE DATA):
${productCatalog}

## RESPONSE RULES:
1. When a user asks about a product, ALWAYS show matching products from the catalog above with:
   - Product name, price, discount if any
   - A brief description
   - A markdown link: [🛒 Shop Now](/product/SLUG) — use the exact slug from the catalog
2. If multiple products match, show up to 3-4 best matches
3. Format product recommendations nicely with bold names, prices, and the shop link
4. If no products match, suggest browsing our full collection: [Browse All Products](/shop)
5. Be concise, helpful, and use emojis sparingly
6. Use PKR for all prices

## STORE POLICIES:
- Store: RapidKitch — Premium Kitchen Gadgets Pakistan
- Website: rapidkitch.com
- Free shipping above PKR 3,000
- Standard delivery: 3-5 business days
- Express delivery: PKR 300 for 1-2 days
- 30-day hassle-free returns
- 1-year manufacturer warranty
- Payment: COD, Credit/Debit Card, Bank Transfer, JazzCash/EasyPaisa
- Contact: hello@rapidkitch.com`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
