import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth-context";
import { Layout } from "@/components/Layout";
import Home from "@/pages/home";
import WorkBoard from "@/pages/work-board";
import WorkNew from "@/pages/work-new";
import WorkDetail from "@/pages/work-detail";
import Agents from "@/pages/agents";
import AgentDetail from "@/pages/agent-detail";
import Dashboard from "@/pages/dashboard";
import Founder from "@/pages/founder";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import Fees from "@/pages/fees";
import FAQ from "@/pages/about/faq";
import AgentNew from "@/pages/agents/new";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/work" component={WorkBoard} />
      <Route path="/work/new" component={WorkNew} />
      <Route path="/work/:publicId" component={WorkDetail} />
      <Route path="/agents" component={Agents} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/founder" component={Founder} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route path="/about/fees" component={Fees} />
      <Route path="/about/faq" component={FAQ} />
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
