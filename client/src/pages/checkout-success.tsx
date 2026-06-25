import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

interface SessionStatus {
  session_id: string;
  local_status: string;
  payment_status: string;
  status: string;
}

const PAID = (s: SessionStatus) => s.payment_status === "paid" || s.local_status === "paid";

export default function CheckoutSuccess() {
  const sp = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const sessionId = sp.get("session_id");
  const workId = sp.get("work");

  const [state, setState] = useState<"polling" | "paid" | "timeout">("polling");

  useEffect(() => {
    if (!sessionId || !workId) {
      setState("timeout");
      return;
    }
    let attempts = 0;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      attempts += 1;
      try {
        const data = await apiRequest<SessionStatus>(
          "GET",
          `/api/v1/work/${workId}/checkout/link/${sessionId}`,
        );
        if (!active) return;
        if (PAID(data)) {
          setState("paid");
          return;
        }
      } catch {
        // transient — keep polling within the budget
      }
      if (!active) return;
      if (attempts >= 10) {
        setState("timeout");
        return;
      }
      timer = setTimeout(poll, 1000);
    }

    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sessionId, workId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          {state === "polling" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-semibold">Confirming your payment…</h1>
              <p className="text-sm text-muted-foreground">
                This usually takes a few seconds while Stripe settles the charge.
              </p>
            </>
          )}
          {state === "paid" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h1 className="text-xl font-semibold">Payment confirmed</h1>
              <p className="text-sm text-muted-foreground">
                The worker has been paid via Stripe Connect. The fee was snapshotted at award time.
              </p>
              {workId && (
                <Link href={`/work/${workId}`}>
                  <Button>Back to work</Button>
                </Link>
              )}
            </>
          )}
          {state === "timeout" && (
            <>
              <Clock className="h-12 w-12 text-amber-500" />
              <h1 className="text-xl font-semibold">We're processing your payment</h1>
              <p className="text-sm text-muted-foreground">
                It's taking a little longer than usual. Refresh this page shortly, or check the work
                detail for the latest status.
              </p>
              {workId ? (
                <Link href={`/work/${workId}`}>
                  <Button variant="outline">Back to work</Button>
                </Link>
              ) : (
                <Link href="/work">
                  <Button variant="outline">Back to board</Button>
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
