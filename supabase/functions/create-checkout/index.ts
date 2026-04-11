  import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Per-seat team price — €29.99/seat/month
const TEAM_SEAT_PRICE_ID_MONTHLY = "price_1TKbYMPNpQaZotKHxkabbGSp";
const TEAM_SEAT_PRICE_ID_YEARLY = "price_1TKczKPNpQaZotKHP7GWDSPQ";
const TEAM_PRICE_IDS = new Set([TEAM_SEAT_PRICE_ID_MONTHLY, TEAM_SEAT_PRICE_ID_YEARLY]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Authentication failed. Please sign in again." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.json();
    const { priceId, seats } = body;

    // ── TEAM SEAT CHECKOUT ────────────────────────────────────────────────────
    if (TEAM_PRICE_IDS.has(priceId)) {
      const seatCount = Math.max(1, Math.min(500, parseInt(seats) || 1));

      // Verify the user is a team owner or admin
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("team_id, team_role")
        .eq("user_id", user.id)
        .single();

      if (!profile?.team_id) {
        return new Response(JSON.stringify({ error: "You must be part of a team to purchase a team plan." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (![ "owner", "administrator" ].includes(profile.team_role)) {
        return new Response(JSON.stringify({ error: "Only team owners or administrators can purchase a team subscription." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create Stripe customer, store against the TEAM not the user
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("id, name, stripe_customer_id, stripe_subscription_id")
        .eq("id", profile.team_id)
        .single();

      let customerId = team?.stripe_customer_id;

      if (!customerId) {
        // Create a Stripe customer representing the team (billed to the owner's email)
        const customer = await stripe.customers.create({
          email: user.email,
          name: team?.name ?? "CloserLab Team",
          metadata: { team_id: profile.team_id, owner_user_id: user.id },
        });
        customerId = customer.id;

        // Persist immediately so concurrent requests don't create duplicates
        await supabaseAdmin
          .from("teams")
          .update({ stripe_customer_id: customerId })
          .eq("id", profile.team_id);
      }

      // If they already have an active subscription, send them to the portal instead
      if (team?.stripe_subscription_id) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${req.headers.get("origin")}/team`,
        });
        return new Response(JSON.stringify({ url: portalSession.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // New subscription — Stripe Checkout with quantity = seats
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: seatCount }],
        mode: "subscription",
        allow_promotion_codes: true,
        // Store team_id so the webhook can find the right team
        subscription_data: {
          metadata: { team_id: profile.team_id },
        },
        success_url: `${req.headers.get("origin")}/team?checkout=success`,
        cancel_url: `${req.headers.get("origin")}/pricing`,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── LEGACY INDIVIDUAL PRICE CHECKOUT (kept for backward compat) ───────────
    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return new Response(JSON.stringify({ error: "Invalid price" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${req.headers.get("origin")}/?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
