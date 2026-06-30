import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X, User, LogOut, LayoutDashboard, Plus, Github } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortDid } from "@/lib/format";

function HermesLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="HermesHub">
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path d="M16 6L16 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 11C11 11 13 9 16 9C19 9 21 11 21 11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 16H22" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 21L16 26L20 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="6" r="2" fill="hsl(var(--accent))" />
    </svg>
  );
}

const NAV = [
  { href: "/agents", label: "Agents" },
  { href: "/about/faq", label: "FAQ" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, identity, loginAnonymous, loginGithub, logout } = useAuth();

  const signedIn = Boolean(user || identity);
  const displayName = user?.name || user?.login || (identity ? shortDid(identity.didWeb) : "");

  async function handleAnon() {
    await loginAnonymous();
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <HermesLogo />
            <span className="text-lg font-bold tracking-tight">
              Hermes<span className="text-primary">Hub</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    location.startsWith(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/agents/new" className="hidden sm:block">
              <Button size="sm" data-testid="button-register-agent">
                <Plus className="mr-1 h-4 w-4" />
                List an Agent
              </Button>
            </Link>

            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={displayName} width={32} height={32} className="rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">{displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex w-full cursor-pointer items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agents/new" className="flex w-full cursor-pointer items-center gap-2">
                      <Plus className="h-4 w-4" />
                      List New Agent
                    </Link>
                  </DropdownMenuItem>
                  {signedIn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loginGithub} data-testid="button-login-github">
                  <Github className="mr-1 h-4 w-4" />
                  Sign in
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAnon} data-testid="button-login-anon" className="hidden sm:inline-flex">
                  Quick start
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-border bg-background px-4 py-3 md:hidden">
            {NAV.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                <span
                  className={`block cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    location.startsWith(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <Link href="/agents/new" onClick={() => setMobileMenuOpen(false)}>
              <span className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary">
                <Plus className="h-4 w-4" />
                List an Agent
              </span>
            </Link>
            {signedIn ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <span className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </span>
              </Link>
            ) : (
              <div className="mt-1 space-y-2 border-t border-border px-3 pt-2">
                <Button variant="outline" size="sm" onClick={loginGithub} className="w-full">
                  <Github className="mr-1 h-4 w-4" />
                  Sign in with GitHub
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAnon} className="w-full">
                  Quick start (no account)
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border py-8 pb-20 sm:pb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <HermesLogo />
              <div>
                <p className="text-sm font-medium">HermesHub</p>
                <p className="text-xs text-muted-foreground">
                  ARD-compliant agent registry.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground sm:gap-6">
              <Link href="/about/terms" className="transition-colors hover:text-foreground">Terms</Link>
              <a href="/api/v1/.well-known/capabilities" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                Capability Registry
              </a>
              <a href="https://github.com/amanning3390/hermeshub" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              Built for the Nous Research + Stripe + NVIDIA Hackathon. Maintained by a{" "}
              <a href="https://hermes-agent.nousresearch.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Hermes Agent
              </a>{" "}
              on NVIDIA GPU infrastructure.
            </p>
            <p className="text-xs text-muted-foreground">
              Subscription billing powered by{" "}
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Stripe
              </a>
              . Semantic search by{" "}
              <a href="https://www.nvidia.com/en-us/ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                NVIDIA NIM
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
