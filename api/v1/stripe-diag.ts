/**
 * GET /api/v1/stripe-diag — temporary diagnostic endpoint.
 * Returns whether the Stripe key is configured and can make API calls.
 * Safe to delete after debugging.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if ((req.method ?? "").toUpperCase() !== "GET") {
    res.status(405).json({ error: "GET only" });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const diag: Record<string, unknown> = {
    has_secret_key: !!key,
    key_prefix: key ? key.slice(0, 7) + "..." : null,
    key_is_test: key?.startsWith("sk_test_") ?? false,
    key_is_live: key?.startsWith("sk_live_") ?? false,
    has_webhook_secret: !!webhookSecret,
    publishable_key_set: !!process.env.STRIPE_PUBLISHABLE_KEY,
    base_url: process.env.BASE_URL ?? null,
  };

  // Try a simple Stripe API call
  try {
    const stripe = new Stripe(key!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });

    // List accounts (just 1) to verify the key works
    const accounts = await stripe.accounts.list({ limit: 1 });
    diag.stripe_api_ok = true;
    diag.connect_enabled = true;
    diag.account_count_sample = accounts.data.length;
    diag.account_type_sample = accounts.data[0]?.type ?? null;
  } catch (err) {
    diag.stripe_api_ok = false;
    diag.stripe_error_type = err instanceof Error ? err.constructor.name : "Unknown";
    diag.stripe_error_message = err instanceof Error ? err.message : String(err);
    diag.stripe_error_code = (err as { code?: string }).code ?? null;
    diag.stripe_error_doc = (err as { doc_url?: string }).doc_url ?? null;
  }

  // Try creating an Express account to test Connect
  try {
    const stripe = new Stripe(key!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });

    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    diag.express_create_ok = true;
    diag.created_account_id = account.id;

    // Clean up — delete the test account
    await stripe.accounts.del(account.id);
    diag.cleaned_up = true;
  } catch (err) {
    diag.express_create_ok = false;
    diag.express_error_type = err instanceof Error ? err.constructor.name : "Unknown";
    diag.express_error_message = err instanceof Error ? err.message : String(err);
    diag.express_error_code = (err as { code?: string }).code ?? null;
    diag.express_error_doc = (err as { doc_url?: string }).doc_url ?? null;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json(diag);
}
