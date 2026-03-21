import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/Navbar";
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
import CompanySettings from "./pages/CompanySettings";
import ComingSoon from "./pages/ComingSoon";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DPA from "./pages/DPA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const NO_SIDEBAR_PATHS = ["/landing", "/auth", "/privacy", "/terms", "/dpa"];

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

  const hideSidebar = !user || NO_SIDEBAR_PATHS.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {!hideSidebar && <Navbar />}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/dpa" element={<DPA />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
          <Route path="/breakdown" element={<ProtectedRoute><Breakdown /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><CallHistory /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/live-call" element={<ProtectedRoute><LiveCallPage /></ProtectedRoute>} />
          <Route path="/company" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
          <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
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