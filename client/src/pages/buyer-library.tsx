import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Key,
  Package,
  Search,
  ShoppingBag,
  Clock,
  AlertCircle,
} from "lucide-react";

interface License {
  license_id: string;
  skill_id: string;
  skill_name: string;
  skill_slug: string;
  license_key_hash: string;
  downloads_remaining: number;
  expires_at: string | null;
  revoked: boolean;
  purchased_at: string;
  protocol: string;
  amount_paid: string;
}

export default function BuyerLibraryPage() {
  const { creator, token } = useAuth();
  const [walletInput, setWalletInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [searchParams, setSearchParams] = useState<{
    wallet?: string;
    email?: string;
  } | null>(null);

  const queryString = searchParams
    ? new URLSearchParams(
        Object.fromEntries(
          Object.entries(searchParams).filter(([, v]) => v)
        )
      ).toString()
    : null;

  const { data: licenses, isLoading } = useQuery<License[]>({
    queryKey: ["/api/v1/licenses/my", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/v1/licenses/my?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch licenses");
      const data = await res.json();
      return data.licenses;
    },
    enabled: !!queryString,
  });

  const handleSearch = () => {
    if (!walletInput && !emailInput) return;
    setSearchParams({
      wallet: walletInput || undefined,
      email: emailInput || undefined,
    });
  };

  // Auto-search if creator is logged in and has a wallet
  const handleAutoSearch = () => {
    if (creator?.wallet_address) {
      setWalletInput(creator.wallet_address);
      setSearchParams({ wallet: creator.wallet_address, email: creator.email || undefined });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          My Library
        </h1>
        <p className="text-sm text-muted-foreground">
          View your purchased skills and license keys
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Find Your Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="wallet" className="text-sm">
                Wallet Address
              </Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="buyer@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={!walletInput && !emailInput}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {creator?.wallet_address && (
              <Button variant="outline" onClick={handleAutoSearch}>
                Use My Wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && queryString && (
        <div className="text-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your purchases...</p>
        </div>
      )}

      {licenses && licenses.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No purchases found.</p>
          <Link href="/browse">
            <Button variant="outline" className="mt-4">
              Browse Skills
            </Button>
          </Link>
        </div>
      )}

      {licenses && licenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {licenses.map((lic) => (
            <Card
              key={lic.license_id}
              className={`${lic.revoked ? "opacity-60 border-red-500/30" : ""}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{lic.skill_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Purchased{" "}
                      {new Date(lic.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        lic.protocol === "x402"
                          ? "bg-[#3050FF]/15 text-[#3050FF]"
                          : "bg-green-500/15 text-green-600"
                      }
                    >
                      {lic.protocol}
                    </Badge>
                    <Badge variant="outline">${lic.amount_paid}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    ...{lic.license_key_hash}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {lic.downloads_remaining} downloads left
                  </span>
                  {lic.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires{" "}
                      {new Date(lic.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {lic.revoked ? (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    License revoked
                  </div>
                ) : lic.downloads_remaining > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      // Re-download would hit the license download endpoint
                      window.open(
                        `/api/v1/licenses/${lic.license_key_hash}/download`,
                        "_blank"
                      );
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Re-download
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No downloads remaining
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!queryString && !isLoading && (
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Enter your wallet address or email to find your purchases.
          </p>
        </div>
      )}
    </div>
  );
}
