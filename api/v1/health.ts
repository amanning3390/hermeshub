/**
 * GET /api/v1/health — lightweight health check.
 *
 * Returns service status and build metadata. Used for uptime monitoring,
 * deployment smoke tests, and the demo's operational baseline.
 */
import { withHandler, sendOk } from "../_lib/http.js";

export default withHandler({
  GET: async ({ res }) => {
    sendOk(res, {
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  },
});
