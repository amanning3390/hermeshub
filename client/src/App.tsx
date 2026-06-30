import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { Layout } from "@/components/Layout";
import Home from "@/pages/home";
import Agents from "@/pages/agents";
import AgentDetail from "@/pages/agent-detail";
import Dashboard from "@/pages/dashboard";
import FAQ from "@/pages/about/faq";
import Terms from "@/pages/about/terms";
import AgentNew from "@/pages/agents/new";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/agents" component={Agents} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/about/faq" component={FAQ} />
      <Route path="/about/terms" component={Terms} />
      <Route path="/agents/new" component={AgentNew} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <Layout>
              <AppRoutes />
            </Layout>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
