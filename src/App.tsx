import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Analytics } from "@vercel/analytics/next"
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  if (!user) return <Navigate to="/landing" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="pt-14">
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
          <Route path="/breakdown" element={<ProtectedRoute><Breakdown /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><CallHistory /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
