import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Github, Upload, DollarSign, ShoppingBag, LayoutGrid, Wallet, Pencil, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorSkill {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  category: string;
  price_usd: number;
  version: string;
  is_active: boolean;
  total_sales: number;
  total_revenue: number;
  created_at: string;
}

interface Transaction {
  id: string;
  skill_name: string;
  amount: number;
  protocol: "x402" | "mpp" | string;
  status: string;
  created_at: string;
}

interface DashboardData {
  skills: CreatorSkill[];
  total_revenue: number;
  total_sales: number;
  active_listings: number;
  recent_transactions: Transaction[];
}

interface WalletForm {
  wallet_address: string;
  wallet_chain: string;
  solana_address: string;
  tempo_address: string;
}

interface SkillUploadForm {
  name: string;
  short_description: string;
  description: string;
  version: string;
  category: string;
  price_usd: string;
}

const CATEGORIES = [
  "development",
  "productivity",
  "research",
  "devops",
  "security",
  "data",
  "communication",
];

const CHAINS = ["base", "solana", "ethereum", "tempo"];

// ─── Upload Dialog ─────────────────────────────────────────────────────────────

function UploadSkillDialog({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SkillUploadForm>({
    name: "",
    short_description: "",
    description: "",
    version: "1.0.0",
    category: "development",
    price_usd: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: SkillUploadForm) => {
      const res = await fetch("/api/v1/skills/private/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          price_usd: parseFloat(data.price_usd),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/creators/dashboard"] });
      setOpen(false);
      setForm({
        name: "",
        short_description: "",
        description: "",
        version: "1.0.0",
        category: "development",
        price_usd: "",
      });
      setError(null);
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = parseFloat(form.price_usd);
    if (!form.name.trim()) return setError("Skill name is required.");
    if (isNaN(price) || price < 0.5 || price > 999.99)
      return setError("Price must be between $0.50 and $999.99.");
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3050FF] hover:bg-[#2040EE] text-white gap-2">
          <Upload className="h-4 w-4" />
          Upload Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-[#0D1120] border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Upload New Skill</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-name">Skill Name <span className="text-red-500">*</span></Label>
            <Input
              id="skill-name"
              placeholder="e.g. code-reviewer"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="short-desc">Short Description</Label>
            <Input
              id="short-desc"
              placeholder="One-line summary"
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="full-desc">Description</Label>
            <Textarea
              id="full-desc"
              placeholder="Full description of what this skill does..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-card min-h-[90px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Price (USD) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.50"
                max="999.99"
                placeholder="4.99"
                value={form.price_usd}
                onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
                className="pl-7 bg-card"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="bg-[#3050FF] hover:bg-[#2040EE] text-white"
            >
              {mutation.isPending ? "Uploading…" : "Upload Skill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 1: My Skills ─────────────────────────────────────────────────────────

function MySkillsTab({
  token,
  data,
}: {
  token: string;
  data: DashboardData | undefined;
}) {
  const skills = data?.skills ?? [];

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/v1/skills/private/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/creators/dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/skills/private/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete skill");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/creators/dashboard"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold">My Skills</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {skills.length} skill{skills.length !== 1 ? "s" : ""} listed
          </p>
        </div>
        <UploadSkillDialog token={token} onSuccess={() => {}} />
      </div>

      {skills.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No skills uploaded yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Upload your first skill to start earning.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Sales</TableHead>
                <TableHead className="text-xs text-right">Revenue</TableHead>
                <TableHead className="text-xs text-center">Active</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium">{skill.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">
                      {skill.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-right font-mono">
                    ${skill.price_usd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {skill.total_sales.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-right font-mono text-green-400">
                    ${skill.total_revenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: skill.id,
                          is_active: !skill.is_active,
                        })
                      }
                      className="inline-flex items-center transition-colors"
                      aria-label={skill.is_active ? "Deactivate" : "Activate"}
                    >
                      {skill.is_active ? (
                        <ToggleRight className="h-5 w-5 text-[#3050FF]" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit skill"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(skill.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        aria-label="Delete skill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Revenue ───────────────────────────────────────────────────────────

function RevenueTab({ data }: { data: DashboardData | undefined }) {
  const transactions = data?.recent_transactions ?? [];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold font-mono text-green-400">
              ${(data?.total_revenue ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold">
              {(data?.total_sales ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold text-[#3050FF]">
              {data?.active_listings ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-10 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Skill</TableHead>
                  <TableHead className="text-xs">Protocol</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{tx.skill_name}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[11px] px-2 py-0.5 border-0 ${
                          tx.protocol === "x402"
                            ? "bg-[#3050FF]/20 text-[#7090FF]"
                            : tx.protocol === "mpp"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tx.protocol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-green-400">
                      +${tx.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs ${
                          tx.status === "completed"
                            ? "text-green-400"
                            : tx.status === "pending"
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Wallet Settings ───────────────────────────────────────────────────

function WalletTab({
  token,
  creator,
}: {
  token: string;
  creator: { wallet_address: string | null; wallet_chain: string | null; solana_address: string | null };
}) {
  const [form, setForm] = useState<WalletForm>({
    wallet_address: creator.wallet_address ?? "",
    wallet_chain: creator.wallet_chain ?? "base",
    solana_address: creator.solana_address ?? "",
    tempo_address: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: WalletForm) => {
      const res = await fetch("/api/v1/creators/wallet", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update wallet");
      }
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-400 leading-relaxed">
          <span className="font-semibold">Wallet required:</span> At least one wallet address must be configured to list paid skills on HermesHub.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="px-5 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#3050FF]" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">EVM Address</span>
            <span className="font-mono text-foreground truncate max-w-[220px]">
              {creator.wallet_address || <span className="text-muted-foreground/50">Not set</span>}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Preferred Chain</span>
            <span className="font-medium">{creator.wallet_chain || "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Solana Address</span>
            <span className="font-mono text-foreground truncate max-w-[220px]">
              {creator.solana_address || <span className="text-muted-foreground/50">Not set</span>}
            </span>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="evm-address">EVM Wallet Address</Label>
          <Input
            id="evm-address"
            placeholder="0x..."
            value={form.wallet_address}
            onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
            className="bg-card font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Preferred Chain</Label>
          <Select
            value={form.wallet_chain}
            onValueChange={(val) => setForm({ ...form, wallet_chain: val })}
          >
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHAINS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="solana-address">
            Solana Address <span className="text-muted-foreground/60 text-xs">(optional)</span>
          </Label>
          <Input
            id="solana-address"
            placeholder="Sol wallet address"
            value={form.solana_address}
            onChange={(e) => setForm({ ...form, solana_address: e.target.value })}
            className="bg-card font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tempo-address">
            Tempo Address <span className="text-muted-foreground/60 text-xs">(optional)</span>
          </Label>
          <Input
            id="tempo-address"
            placeholder="Tempo wallet address"
            value={form.tempo_address}
            onChange={(e) => setForm({ ...form, tempo_address: e.target.value })}
            className="bg-card font-mono text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <X className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-green-400">Wallet settings saved.</p>
        )}

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-[#3050FF] hover:bg-[#2040EE] text-white w-full sm:w-auto"
        >
          {mutation.isPending ? "Saving…" : "Save Wallet Settings"}
        </Button>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreatorDashboardPage() {
  const { creator, token, login, isLoading } = useAuth();

  const { data, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/v1/creators/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/creators/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    enabled: !!token && !!creator,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-[#3050FF]/10 flex items-center justify-center mx-auto">
            <Github className="h-7 w-7 text-[#3050FF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Creator Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in with GitHub to manage your skills, track revenue, and configure your wallet.
            </p>
          </div>
          <Button
            onClick={login}
            className="w-full bg-[#3050FF] hover:bg-[#2040EE] text-white gap-2"
          >
            <Github className="h-4 w-4" />
            Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        {creator.avatar_url && (
          <img
            src={creator.avatar_url}
            alt={creator.github_username}
            className="w-10 h-10 rounded-full border border-border"
          />
        )}
        <div>
          <h1 className="text-xl font-bold">Creator Dashboard</h1>
          <p className="text-xs text-muted-foreground">@{creator.github_username}</p>
        </div>
      </div>

      {dashLoading ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      ) : (
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="bg-muted/40 border border-border mb-6">
            <TabsTrigger value="skills" className="text-sm">My Skills</TabsTrigger>
            <TabsTrigger value="revenue" className="text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="wallet" className="text-sm">Wallet Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <MySkillsTab token={token!} data={data} />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueTab data={data} />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletTab token={token!} creator={creator} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
