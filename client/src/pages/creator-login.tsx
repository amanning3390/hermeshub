import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Github, Lock, Wallet, BarChart3 } from "lucide-react";
import { useEffect } from "react";

export default function CreatorLoginPage() {
  const { creator, login, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (creator) {
      navigate("/creator/dashboard");
    }
  }, [creator, navigate]);

  // Check for error in URL
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split("?")[1] || "");
  const error = params.get("error");

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Creator Login</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in with your GitHub account to upload and sell skills on HermesHub
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Authentication failed. Please try again.
            </div>
          )}

          <Button
            onClick={login}
            className="w-full gap-2"
            size="lg"
          >
            <Github className="h-5 w-5" />
            Sign in with GitHub
          </Button>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-medium">As a creator, you can:</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Upload private skills and set your own prices</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Receive payments directly to your crypto wallet</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Track sales, revenue, and license analytics</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
