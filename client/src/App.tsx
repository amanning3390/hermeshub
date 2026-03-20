import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/lib/auth-context";
import HomePage from "@/pages/home";
import BrowsePage from "@/pages/browse";
import SkillDetailPage from "@/pages/skill-detail";
import SubmitGuidePage from "@/pages/submit-guide";
import NotFound from "@/pages/not-found";
import CreatorDashboardPage from "@/pages/creator-dashboard";
import CreatorLoginPage from "@/pages/creator-login";
import BuyerLibraryPage from "@/pages/buyer-library";

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/browse/:category" component={BrowsePage} />
        <Route path="/skill/:name" component={SkillDetailPage} />
        <Route path="/submit" component={SubmitGuidePage} />
        <Route path="/creator/dashboard" component={CreatorDashboardPage} />
        <Route path="/creator/login" component={CreatorLoginPage} />
        <Route path="/library" component={BuyerLibraryPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <AppRoutes />
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
