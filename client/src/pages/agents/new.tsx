import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AutosuggestTagInput } from "@/components/AutosuggestTagInput";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Bot, Loader2 } from "lucide-react";
import type { Agent } from "@/lib/types";

const STEPS = ["Profile", "Capabilities", "Review"];

interface CreateAgentResult {
  agent: Agent;
}

export default function AgentNew() {
  const [, navigate] = useLocation();
  const { identity, loginAnonymous } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [model, setModel] = useState("");
  const [ownerGithub, setOwnerGithub] = useState("");
  const [capabilityUris, setCapabilityUris] = useState<string[]>([]);

  const step0Valid = name.trim().length >= 2;

  const create = useMutation({
    mutationFn: async () => {
      let did = identity?.didWeb;
      if (!did) {
        const fresh = await loginAnonymous();
        did = fresh.didWeb;
      }
      const body: Record<string, unknown> = {
        didWeb: did,
        name: name.trim(),
        capabilityUris,
      };
      if (bio.trim()) body.bio = bio.trim();
      if (model.trim()) body.model = model.trim();
      if (ownerGithub.trim()) body.ownerGithub = ownerGithub.trim();
      return apiRequest<CreateAgentResult>("POST", "/api/v1/agents", body);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/agents"] });
      toast({ title: "Agent registered", description: "Your agent is now live on HermesHub." });
      navigate(`/agents/${data.agent.id}`);
    },
    onError: (err) => {
      toast({
        title: "Couldn't register agent",
        description: err instanceof ApiError ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to workers
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register an Agent</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Declare your capabilities, get discovered by any ARD-compatible client.
          </p>
        </div>
      </div>

      {/* Step indicator */}
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
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme PDF Extractor"
                  data-testid="input-agent-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-bio">Bio (optional)</Label>
                <Textarea
                  id="agent-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Briefly describe what this agent does and what makes it stand out…"
                  rows={4}
                  data-testid="input-agent-bio"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agent-model">Base model (optional)</Label>
                  <Input
                    id="agent-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="gpt-4o"
                    data-testid="input-agent-model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-github">GitHub handle (optional)</Label>
                  <Input
                    id="agent-github"
                    value={ownerGithub}
                    onChange={(e) => setOwnerGithub(e.target.value)}
                    placeholder="amanning3390"
                    data-testid="input-agent-github"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!step0Valid} data-testid="button-next-profile">
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label>Capabilities</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tag your agent with the ARD capability URIs it supports. These are matched
                  against queries to surface your agent to clients.
                </p>
              </div>
              <AutosuggestTagInput selected={capabilityUris} onChange={setCapabilityUris} />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(2)} data-testid="button-next-capabilities">
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">Review</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{name}</dd>
                  </div>
                  {model && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Model</dt>
                      <dd className="font-medium">{model}</dd>
                    </div>
                  )}
                  {ownerGithub && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Owner</dt>
                      <dd className="font-medium">@{ownerGithub}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">
                      Capabilities ({capabilityUris.length})
                    </dt>
                    {capabilityUris.length === 0 ? (
                      <dd className="mt-1 text-xs text-muted-foreground">
                        No capabilities selected — you can add them after registration.
                      </dd>
                    ) : (
                      <dd className="mt-1.5 font-mono text-xs leading-relaxed text-foreground">
                        {capabilityUris.join(", ")}
                      </dd>
                    )}
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
                  data-testid="button-submit-agent"
                >
                  {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Register Agent
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
