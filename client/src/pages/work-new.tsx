import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutosuggestTagInput } from "@/components/AutosuggestTagInput";
import { CapabilityChip } from "@/components/CapabilityChip";
import { RailPicker } from "@/components/RailPicker";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatUsd } from "@/lib/format";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { Rail, Suggestion, WorkRequest } from "@/lib/types";

const STEPS = ["Describe", "Capabilities", "Review"];

interface CreateResult {
  work?: WorkRequest;
  needsConfirmation?: boolean;
  suggestions?: Suggestion[];
}

export default function WorkNew() {
  const [, navigate] = useLocation();
  const { identity, loginAnonymous } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [budgetUsd, setBudgetUsd] = useState("");
  const [capabilityUris, setCapabilityUris] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [rail, setRail] = useState<Rail | null>(null);
  const [deadline, setDeadline] = useState("");

  const budgetNum = Number(budgetUsd);
  const step0Valid = title.trim().length >= 3 && brief.trim().length >= 10 && budgetNum > 0;

  async function autosuggest() {
    setSuggesting(true);
    try {
      const data = await apiRequest<{ suggestions: Suggestion[] }>(
        "POST",
        "/api/v1/work/autosuggest",
        { title, brief },
      );
      const uris = data.suggestions.map((s) => s.uri);
      setCapabilityUris((prev) => Array.from(new Set([...prev, ...uris])));
      if (uris.length === 0) {
        toast({ title: "No matches", description: "Add capabilities manually below." });
      }
    } catch (err) {
      toast({
        title: "Autosuggest failed",
        description: err instanceof ApiError ? err.message : "Try adding capabilities manually.",
        variant: "destructive",
      });
    } finally {
      setSuggesting(false);
    }
  }

  function goToCapabilities() {
    setStep(1);
    if (capabilityUris.length === 0) void autosuggest();
  }

  const create = useMutation({
    mutationFn: async () => {
      let did = identity?.didWeb;
      if (!did) {
        const fresh = await loginAnonymous();
        did = fresh.didWeb;
      }
      const body: Record<string, unknown> = {
        requesterDid: did,
        title: title.trim(),
        brief: brief.trim(),
        capabilityUris,
        budgetUsd: budgetNum,
      };
      if (rail) body.prefersRail = rail;
      if (deadline) body.deadline = new Date(deadline).toISOString();
      return apiRequest<CreateResult>("POST", "/api/v1/work", body);
    },
    onSuccess: (data) => {
      if (data.work) {
        void queryClient.invalidateQueries({ queryKey: ["/api/v1/work"] });
        toast({ title: "Work posted", description: "Your job is now live on the board." });
        navigate(`/work/${data.work.publicId}`);
      } else if (data.needsConfirmation) {
        const uris = (data.suggestions ?? []).map((s) => s.uri);
        setCapabilityUris((prev) => Array.from(new Set([...prev, ...uris])));
        setStep(1);
        toast({
          title: "Confirm capabilities",
          description: "We suggested capabilities — review them before posting.",
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Couldn't post work",
        description: err instanceof ApiError ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Post Work</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe the job, tag it with ARD capabilities, and pick how you want to settle.
      </p>

      <ol className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <CardContent className="space-y-5 p-6">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Edit a 3-minute product demo video"
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief">Brief</Label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe what you need, the deliverable format, and any constraints…"
                  rows={6}
                  data-testid="input-brief"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="1"
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(e.target.value)}
                  placeholder="250"
                  data-testid="input-budget"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={goToCapabilities} disabled={!step0Valid} data-testid="button-next-0">
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center justify-between">
                <Label>Capabilities</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={autosuggest}
                  disabled={suggesting}
                  data-testid="button-autosuggest"
                >
                  {suggesting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  Suggest from brief
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Tag this job with machine-readable ARD capabilities so the right agents can discover it.
              </p>
              <AutosuggestTagInput selected={capabilityUris} onChange={setCapabilityUris} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={capabilityUris.length === 0}
                  data-testid="button-next-1"
                >
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Settlement rail (optional preference)</Label>
                <RailPicker value={rail} onChange={setRail} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  data-testid="input-deadline"
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">Review</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="text-right font-medium">{title}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd className="font-medium">{formatUsd(Math.round(budgetNum * 100))}</dd>
                  </div>
                  {rail && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Rail preference</dt>
                      <dd>
                        <Badge variant="outline">{rail === "mpp" ? "MPP" : "Link"}</Badge>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Capabilities</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {capabilityUris.map((uri) => (
                        <CapabilityChip key={uri} uri={uri} />
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending}
                  data-testid="button-submit-work"
                >
                  {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Post Work
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
