import { Copy, Check, ShieldCheck, FileText, FolderTree, AlertTriangle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const TEMPLATE = `---
name: my-skill-name
description: A clear description of what this skill does and when to use it. Include keywords that help agents identify relevant tasks.
version: "1.0.0"
license: MIT
compatibility: Any specific requirements (optional)
metadata:
  author: your-github-username
  hermes:
    tags: [tag1, tag2, tag3]
    category: development
    # Optional conditional activation:
    # fallback_for_toolsets: [web]
    # requires_toolsets: [terminal]
# Optional environment variables:
# required_environment_variables:
#   - name: API_KEY_NAME
#     prompt: Description shown to user
#     help: URL or instructions to get the key
#     required_for: full functionality
---

# Skill Title

## When to Use
- Trigger condition 1
- Trigger condition 2
- Trigger condition 3

## Procedure
1. Step one — what to do first
2. Step two — main operation
3. Step three — format and present results
4. Step four — verify success

## Examples

### Example 1: [Scenario]
\`\`\`
Input: [what the user says]
Expected behavior: [what the agent should do]
\`\`\`

## Pitfalls
- Known failure mode 1 and how to handle it
- Known failure mode 2 and how to handle it
- Edge cases to watch for

## Verification
- How to confirm the skill worked correctly
- What success looks like
`;

export default function SubmitGuidePage() {
  const [copied, setCopied] = useState(false);

  const copyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Submit a Skill</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Share your skills with the Hermes Agent community. All submissions follow the{" "}
          <a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            agentskills.io
          </a>{" "}
          open standard and go through security review before listing.
        </p>
      </div>

      <Tabs defaultValue="guide" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="guide" data-testid="tab-guide">Submission Guide</TabsTrigger>
          <TabsTrigger value="template" data-testid="tab-template">SKILL.md Template</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security-req">Security Requirements</TabsTrigger>
          <TabsTrigger value="best-practices" data-testid="tab-best-practices">Best Practices</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="space-y-6">
          {/* Step-by-step */}
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Create your skill directory",
                icon: <FolderTree className="h-4 w-4 text-primary" />,
                content: (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      A skill is a directory containing a <code className="font-mono bg-muted px-1 rounded">SKILL.md</code> file
                      with YAML frontmatter and Markdown instructions. Optional subdirectories include
                      <code className="font-mono bg-muted px-1 rounded">scripts/</code>,
                      <code className="font-mono bg-muted px-1 rounded">references/</code>, and
                      <code className="font-mono bg-muted px-1 rounded">assets/</code>.
                    </p>
                    <pre className="text-xs font-mono bg-background border border-border rounded-md p-3 text-muted-foreground">
{`my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
│   └── helper.py
├── references/       # Optional: additional docs
│   └── API-GUIDE.md
└── assets/           # Optional: templates, data
    └── template.json`}
                    </pre>
                  </div>
                ),
              },
              {
                step: "2",
                title: "Write your SKILL.md",
                icon: <FileText className="h-4 w-4 text-primary" />,
                content: (
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>
                      Use the template tab to get started. Key requirements:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong className="text-foreground">name</strong>: lowercase letters, numbers, and hyphens only (1-64 chars)</li>
                      <li><strong className="text-foreground">description</strong>: clear and keyword-rich (1-1024 chars)</li>
                      <li><strong className="text-foreground">Hermes metadata</strong>: tags, category, and optional conditional activation</li>
                      <li><strong className="text-foreground">Body</strong>: When to Use, Procedure, Pitfalls, and Verification sections</li>
                    </ul>
                    <p>
                      Keep the main SKILL.md under 500 lines. Move detailed reference material to separate files.
                    </p>
                  </div>
                ),
              },
              {
                step: "3",
                title: "Test locally with Hermes",
                icon: <BookOpen className="h-4 w-4 text-primary" />,
                content: (
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>Copy your skill to <code className="font-mono bg-muted px-1 rounded">~/.hermes/skills/</code> and test it:</p>
                    <pre className="font-mono bg-background border border-border rounded-md p-3">{`# Copy to Hermes skills directory
cp -r my-skill/ ~/.hermes/skills/

# Test in Hermes CLI
hermes chat -q "/my-skill-name help"

# Or via natural conversation
hermes chat -q "Use the my-skill skill to..."

# Validate format
skills-ref validate ./my-skill`}</pre>
                  </div>
                ),
              },
              {
                step: "4",
                title: "Submit via GitHub",
                icon: <ShieldCheck className="h-4 w-4 text-primary" />,
                content: (
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>Submit your skill for listing on HermesHub:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Push your skill to a public GitHub repository</li>
                      <li>Open a Pull Request to the <a href="https://github.com/amanning3390/hermeshub" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">hermeshub repo</a></li>
                      <li>Add your skill directory under <code className="font-mono bg-muted px-1 rounded">skills/</code></li>
                      <li>The PR will trigger automated security scanning</li>
                      <li>After review and approval, your skill is listed on hermeshub.xyz</li>
                    </ol>
                    <p className="mt-2">
                      You can also host skills on your own GitHub repo and submit a link for listing.
                    </p>
                  </div>
                ),
              },
            ].map((step) => (
              <div key={step.step} className="border border-border rounded-lg p-5 bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {step.step}
                  </div>
                  {step.icon}
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                </div>
                {step.content}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="template">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">SKILL.md template</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={copyTemplate}
                data-testid="button-copy-template"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy Template
              </Button>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground/90">
              {TEMPLATE}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <h3 className="text-sm font-semibold">Security Review Process</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Every skill submitted to HermesHub undergoes automated and manual security review.
              This is a core differentiator from platforms like ClawHub, where malicious skills
              have been a widespread problem.
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold mb-2 text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Automatic Rejection Triggers
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Curl/wget to external URLs with system data (data exfiltration)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Base64-encoded or obfuscated shell commands</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Instructions to bypass security prompts or approval gates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Downloading and executing binaries from external URLs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Hidden instructions in referenced files that contradict SKILL.md</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">x</span>
                    <span>Prompt injection or jailbreak attempts</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold mb-2 text-green-500 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5" /> Required for Approval
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>All environment variables documented with setup instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No hardcoded credentials, tokens, or API keys</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Destructive operations require explicit user confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Network access patterns are documented and justified</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>File system access is scoped to relevant directories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Publisher identity verified via GitHub account</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg p-6 bg-card">
            <h3 className="text-sm font-semibold mb-3">Trust Levels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Level</th>
                    <th className="pb-2 font-medium text-muted-foreground">Source</th>
                    <th className="pb-2 font-medium text-muted-foreground">Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2.5"><Badge variant="default" className="text-[10px]">Verified</Badge></td>
                    <td className="py-2.5 text-muted-foreground">HermesHub reviewed and approved</td>
                    <td className="py-2.5 text-muted-foreground">Full security scan passed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5"><Badge variant="secondary" className="text-[10px]">Community</Badge></td>
                    <td className="py-2.5 text-muted-foreground">Community-submitted via PR</td>
                    <td className="py-2.5 text-muted-foreground">Automated scan + basic review</td>
                  </tr>
                  <tr>
                    <td className="py-2.5"><Badge variant="outline" className="text-[10px]">Unverified</Badge></td>
                    <td className="py-2.5 text-muted-foreground">Direct GitHub link</td>
                    <td className="py-2.5 text-muted-foreground">Use --force to install, at your own risk</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="best-practices" className="space-y-4">
          <div className="border border-border rounded-lg p-6 bg-card space-y-5">
            <h3 className="text-sm font-semibold">Writing Great Skills</h3>

            {[
              {
                title: "Progressive Disclosure",
                desc: "Keep SKILL.md under 500 lines. Use the description field for quick matching (~100 tokens), the main body for instructions (<5000 tokens), and reference files for detailed docs loaded on demand.",
              },
              {
                title: "Clear Trigger Conditions",
                desc: "The 'When to Use' section determines when the agent loads your skill. Include specific keywords and phrases users might say. The more precise, the better the skill activates at the right time.",
              },
              {
                title: "Structured Procedures",
                desc: "Number your steps. Each step should be a concrete action the agent can take. Include the exact commands, API calls, or code patterns the agent should use.",
              },
              {
                title: "Document Failure Modes",
                desc: "The 'Pitfalls' section prevents wasted time. Document common errors, edge cases, and workarounds. Skills that handle errors gracefully get higher ratings.",
              },
              {
                title: "Include Verification",
                desc: "Tell the agent how to confirm success. This closes the loop and enables the self-improvement cycle — Hermes can learn from what worked and what didn't.",
              },
              {
                title: "Conditional Activation",
                desc: "Use fallback_for_toolsets to hide your skill when premium tools are available, or requires_toolsets to only show it when needed tools exist. This keeps the skill list clean.",
              },
              {
                title: "Hermes-Specific Features",
                desc: "Leverage Hermes features: required_environment_variables for secure setup, platforms field for OS-specific skills, allowed-tools for pre-approved tool access, and category for organization.",
              },
            ].map((tip, i) => (
              <div key={i}>
                <h4 className="text-xs font-medium mb-1">{tip.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
