import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X, User, LogOut, LayoutDashboard, ShoppingBag } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { creator, login, logout } = useAuth();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/browse", label: "Browse Skills" },
    { href: "/submit", label: "Submit a Skill" },
    ...(creator ? [{ href: "/creator/dashboard", label: "Creator Dashboard" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <HermesLogo />
            <span className="text-lg font-bold tracking-tight">
              Hermes<span className="text-primary">Hub</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    location === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {creator ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.github_username}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm font-medium">{creator.github_username}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/creator/dashboard" className="flex items-center gap-2 cursor-pointer w-full">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/library" className="flex items-center gap-2 cursor-pointer w-full">
                      <ShoppingBag className="h-4 w-4" />
                      My Library
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={login}>
                Creator Login
              </Button>
            )}
            <a
              href="https://github.com/amanning3390/hermeshub"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-github"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
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
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 space-y-1 bg-background">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                <span
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    location === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            {creator ? (
              <>
                <div className="px-3 py-2 flex items-center gap-2 border-t border-border mt-1 pt-2">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.github_username}
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <span className="text-sm font-medium">{creator.github_username}</span>
                </div>
                <Link href="/creator/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <span className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </span>
                </Link>
                <Link href="/library" onClick={() => setMobileMenuOpen(false)}>
                  <span className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                    <ShoppingBag className="h-4 w-4" />
                    My Library
                  </span>
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <div className="px-3 py-2 border-t border-border mt-1 pt-2">
                <Button variant="outline" size="sm" onClick={() => { login(); setMobileMenuOpen(false); }} className="w-full">
                  Creator Login
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 mt-16 pb-20 sm:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HermesLogo />
              <div>
                <p className="text-sm font-medium">HermesHub</p>
                <p className="text-xs text-muted-foreground">
                  Community skills for{" "}
                  <a href="https://hermes-agent.nousresearch.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Hermes Agent
                  </a>{" "}
                  by Nous Research
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <a href="https://hermes-agent.nousresearch.com/docs/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Hermes Docs
              </a>
              <a href="https://agentskills.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                agentskills.io
              </a>
              <a href="https://github.com/amanning3390/hermeshub" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Compatible with the <a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">agentskills.io</a> open standard.
              Not affiliated with Nous Research.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
