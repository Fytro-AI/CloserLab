import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/Navbar";
import TeamGate from "@/components/TeamGate";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Scenarios from "./pages/Scenarios";
import Challenges from "./pages/Challenges";
import Simulation from "./pages/Simulation";
import Breakdown from "./pages/Breakdown";
import Leaderboard from "./pages/Leaderboard";
import CallHistory from "./pages/CallHistory";
import Pricing from "./pages/Pricing";
import Account from "./pages/Account";
import LiveCallPage from "./pages/LiveCallPage";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Metrics from "./pages/Metrics";
import TeamDashboard from "./pages/TeamDashboard";
import JoinTeam from "./pages/JoinTeam";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground animate-pulse">
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  const hideSidebar = !user
    || location.pathname === "/landing"
    || location.pathname === "/auth";

  return (
    <div className="flex min-h-screen bg-background">
      {!hideSidebar && <Navbar />}

      <main className="flex-1 min-w-0 overflow-y-auto pb-[60px] md:pb-0">
        <Routes>
          {/* Public */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth"    element={<Auth />} />

          {/* Protected — all gated behind TeamGate */}
          <Route path="/*" element={
            <ProtectedRoute>
              <TeamGate>
                <Routes>
                  <Route path="/"           element={<Dashboard />} />
                  <Route path="/scenarios"  element={<Scenarios />} />
                  <Route path="/challenges" element={<Challenges />} />
                  <Route path="/simulation" element={<Simulation />} />
                  <Route path="/breakdown"  element={<Breakdown />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/history"    element={<CallHistory />} />
                  <Route path="/pricing"    element={<Pricing />} />
                  <Route path="/account"    element={<Account />} />
                  <Route path="/live-call"  element={<ComingSoon />} />
                  <Route path="/coming-soon" element={<ComingSoon />} />
                  <Route path="/metrics"    element={<Metrics />} />
                  <Route path="/team"       element={<TeamDashboard />} />
                  <Route path="*"           element={<NotFound />} />
                  <Route path="/join/:token" element={<JoinTeam />} />
                </Routes>
              </TeamGate>
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;