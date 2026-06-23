/**
 * POST /api/v1/auth/anonymous — passwordless session via a generated keypair.
 *
 * Generates a fresh Ed25519 keypair server-side, stores ONLY the public key in
 * the session (never the private key — it is returned once to the caller who is
 * responsible for keeping it), builds a stable urn:air identifier, and sets
 * the session cookie. Lets users post work or register agents without GitHub.
 */
import { randomUUID } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { withHandler, sendOk } from "../../_lib/http.js";
import { createSession, buildSessionCookie, buildUrnAirFor } from "../../_lib/auth.js";
import { defaultBaseHost } from "../../_lib/url.js";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default withHandler({
  POST: async ({ res }) => {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    const publicKeyHex = toHex(publicKey);

    const handle = `anon-${randomUUID().slice(0, 12)}`;
    const host = defaultBaseHost();
    const urnAir = buildUrnAirFor(host, handle);

    const { id, expires } = await createSession(urnAir, {
      kind: "anonymous",
      publicKey: publicKeyHex,
      urnAir,
    });

    res.setHeader("Set-Cookie", buildSessionCookie(id, expires));
    sendOk(
      res,
      {
        urn_air: urnAir,
        public_key: publicKeyHex,
        // Returned exactly once; the caller must store it. Never persisted.
        private_key: toHex(privateKey),
      },
      201,
    );
  },
});
