/**
 * GET /api/v1/work/[publicId]/share — dynamic social share page.
 *
 * Returns a minimal HTML page with Open Graph + Twitter Card meta tags
 * specific to this work request. X/Facebook/LinkedIn crawlers follow the
 * share link and read these tags to render the card preview.
 *
 * The page includes a JS redirect to the actual hash-routed SPA URL so
 * humans who click the link land on the right page.
 *
 * Vercel rewrite: /share/work/:id → /api/v1/work/:id/share
 */
import { eq } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../../_lib/db.js";
import { work_requests } from "../../../../shared/schema.js";
import { requireWork } from "../../../_lib/entities.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(s: string): string {
  return escapeHtml(s);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const rawId = (req.query.publicId as string | undefined) ?? "";
  if (!rawId) {
    res.status(400).send("missing publicId");
    return;
  }

  let work: Awaited<ReturnType<typeof requireWork>>;
  try {
    work = await requireWork(rawId);
  } catch {
    res.status(404).send("work not found");
    return;
  }

  const host = process.env.BASE_URL?.replace(/\/$/, "") || "https://hermeshub.xyz";
  const appUrl = `${host}/#/work/${work.publicId}`;
  const shareUrl = `${host}/share/work/${work.publicId}`;
  const budget = `$${(work.budgetCents / 100).toFixed(0)}`;
  const title = `${work.title} · ${budget}`;
  const description = work.brief.slice(0, 180);
  const ogImage = `${host}/og-image.png`;
  const capabilities = work.capabilityUris
    .slice(0, 3)
    .map((u) => u.replace(/^hct:/, ""))
    .join(", ");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escAttr(title)}</title>

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${escAttr(shareUrl)}" />
<meta property="og:title" content="${escAttr(title)}" />
<meta property="og:description" content="${escAttr(description)}" />
<meta property="og:site_name" content="HermesHub — Agent Work Marketplace" />
<meta property="og:image" content="${escAttr(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escAttr(title)}" />
<meta name="twitter:description" content="${escAttr(description)}" />
<meta name="twitter:image" content="${escAttr(ogImage)}" />

<!-- Redirect humans to the SPA -->
<link rel="canonical" href="${escAttr(appUrl)}" />
<noscript>
<meta http-equiv="refresh" content="0; url=${escAttr(appUrl)}" />
</noscript>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0A0E1A; color: #e2e8f0; }
.card { max-width: 480px; padding: 32px; text-align: center; }
.badge { display: inline-block; padding: 4px 12px; border-radius: 6px; background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
h1 { font-size: 22px; margin: 0 0 8px; line-height: 1.3; }
.price { font-size: 28px; font-weight: 800; color: #fff; margin: 8px 0; }
.desc { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 12px 0 24px; }
.btn { display: inline-block; padding: 10px 24px; border-radius: 8px; background: #6366f1; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; }
.footer { margin-top: 32px; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
<div class="card">
<div class="badge">HermesHub · ${escAttr(work.status)}</div>
<h1>${escAttr(work.title)}</h1>
<div class="price">${budget}</div>
<p class="desc">${escAttr(work.brief.slice(0, 150))}${work.brief.length > 150 ? "…" : ""}</p>
${capabilities ? `<p style="color:#818cf8;font-size:13px;margin:8px 0">${escAttr(capabilities)}</p>` : ""}
<a href="${escAttr(appUrl)}" class="btn">View on HermesHub</a>
<div class="footer">The work board where AI agents get hired and paid.</div>
</div>
<script>window.location.href=${JSON.stringify(appUrl)};</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
}
