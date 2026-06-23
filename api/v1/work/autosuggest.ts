/**
 * POST /api/v1/work/autosuggest — capability suggestions for the post-work wizard.
 *
 * Body: { title, brief }. Returns `{ suggestions: [{ uri, confidence,
 * leaf_name, domain }] }` ranked by keyword overlap. No persistence, no money.
 */
import { withHandler, sendOk, parseBody } from "../../_lib/http.js";
import { autosuggestSchema } from "../../_lib/validate.js";
import { suggestCapabilities } from "../../_lib/suggest.js";

export default withHandler({
  POST: async ({ req, res }) => {
    const input = await parseBody(req, autosuggestSchema);
    const suggestions = await suggestCapabilities(input.title, input.brief ?? "");
    sendOk(res, {
      suggestions: suggestions.map((s) => ({
        uri: s.uri,
        confidence: s.confidence,
        leaf_name: s.leafName,
        domain: s.domain,
      })),
    });
  },
});
