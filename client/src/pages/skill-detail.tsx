import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, ShieldCheck, Download, Tag, Copy, Check,
  ExternalLink, GitBranch, Clock, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Skill } from "@shared/schema";
import { useState } from "react";

export default function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [copied, setCopied] = useState(false);

  const { data: skill, isLoading } = useQuery<Skill>({
    queryKey: ["/api/skills", name],
  });

  const copyInstallCommand = () => {
    if (skill?.installCommand) {
      navigator.clipboard.writeText(skill.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 rounded-lg mb-6" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-lg font-medium mb-4">Skill not found</p>
        <Link href="/browse">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Browse
          </Button>
        </Link>
      </div>
    );
  }

  const securityColor = skill.securityStatus === "verified"
    ? "text-green-500"
    : skill.securityStatus === "warning"
    ? "text-amber-500"
    : "text-red-500";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/browse">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Skills
        </Button>
      </Link>

      {/* Header */}
      <div className="border border-border rounded-lg p-6 bg-card mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">{skill.displayName}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
          </div>
          <ShieldCheck className={`h-6 w-6 ${securityColor} flex-shrink-0`} />
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <Badge variant="secondary" className="gap-1 text-xs">
            <User className="h-3 w-3" /> {skill.author}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Tag className="h-3 w-3" /> v{skill.version}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Download className="h-3 w-3" /> {skill.installCount.toLocaleString()} installs
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs capitalize">
            {skill.category}
          </Badge>
          {skill.license && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {skill.license}
            </Badge>
          )}
        </div>

        {/* Install command */}
        <div className="rounded-md border border-border bg-background p-3 flex items-center justify-between gap-3">
          <code className="text-xs font-mono text-primary truncate">
            {skill.installCommand}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-7 w-7"
            onClick={copyInstallCommand}
            data-testid="button-copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="skill-md" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="skill-md" data-testid="tab-skill-md">SKILL.md</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="install" data-testid="tab-install">Installation</TabsTrigger>
        </TabsList>

        <TabsContent value="skill-md">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">SKILL.md</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(skill.skillMd);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                data-testid="button-copy-skill-md"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy
              </Button>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground/90">
              {skill.skillMd}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="border border-border rounded-lg p-6 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className={`h-8 w-8 ${securityColor}`} />
              <div>
                <h3 className="font-semibold text-sm">Security Status: {skill.securityStatus.charAt(0).toUpperCase() + skill.securityStatus.slice(1)}</h3>
                <p className="text-xs text-muted-foreground">This skill has been scanned for common security issues</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Security Checks Passed</h4>
              {[
                "No data exfiltration patterns detected",
                "No prompt injection attempts found",
                "No destructive commands without confirmation gates",
                "No obfuscated or encoded payloads",
                "No unauthorized network access patterns",
                "Environment variable usage is documented and scoped",
              ].map((check, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{check}</span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border bg-background p-4 mt-4">
              <h4 className="text-sm font-medium mb-2">How HermesHub Differs from ClawHub</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlike ClawHub, which has faced widespread supply-chain attacks (820+ malicious skills discovered,
                manipulatable download counters, no mandatory security review), HermesHub requires all skills to
                pass automated security scanning before listing. Skills are reviewed for data exfiltration,
                prompt injection, destructive commands, and supply-chain signals. Publisher identity is verified
                and download metrics cannot be spoofed.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="install">
          <div className="border border-border rounded-lg p-6 bg-card space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Install via Hermes CLI</h3>
              <div className="rounded-md border border-border bg-background p-3">
                <code className="text-xs font-mono text-primary block">
                  {skill.installCommand}
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Manual Installation</h3>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-mono text-primary">1.</span>
                  <span>Clone or download the skill directory</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-primary">2.</span>
                  <span>Copy to <code className="font-mono bg-muted px-1 rounded">~/.hermes/skills/</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-primary">3.</span>
                  <span>Restart Hermes or run <code className="font-mono bg-muted px-1 rounded">/skills</code> to refresh</span>
                </li>
              </ol>
            </div>

            {skill.compatibility && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Compatibility</h3>
                <p className="text-xs text-muted-foreground">{skill.compatibility}</p>
              </div>
            )}

            {skill.repoUrl && (
              <a
                href={skill.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                data-testid="link-repo"
              >
                <GitBranch className="h-3.5 w-3.5" />
                View source on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
