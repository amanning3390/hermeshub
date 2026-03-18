import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/home";
import BrowsePage from "@/pages/browse";
import SkillDetailPage from "@/pages/skill-detail";
import SubmitGuidePage from "@/pages/submit-guide";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/browse/:category" component={BrowsePage} />
        <Route path="/skill/:name" component={SkillDetailPage} />
        <Route path="/submit" component={SubmitGuidePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <AppRoutes />
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
