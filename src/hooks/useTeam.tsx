import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Team {
  id: string;
  name: string;
  size: string;
  owner_id: string;
  created_at: string;
}

interface TeamContextType {
  team: Team | null;
  isOwner: boolean;
  loading: boolean;
  hasTeam: boolean | null; // null = not yet determined
  fetchTeam: () => Promise<void>;
  createTeam: (name: string, size: string) => Promise<void>;
  getTeamMembers: () => Promise<any[]>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);

  const fetchTeam = async () => {
    if (!user) {
      setTeam(null);
      setHasTeam(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id, team_role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.team_id) {
      setTeam(null);
      setHasTeam(false);
      setLoading(false);
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("id", profile.team_id)
      .single();

    if (teamData) {
      setTeam(teamData as Team);
      setIsOwner(teamData.owner_id === user.id);
      setHasTeam(true);
    } else {
      setHasTeam(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [user]);

  const createTeam = async (name: string, size: string) => {
    if (!user) throw new Error("Not authenticated");
    const validSizes = ["1-5", "5-10", "10-20", "20-50", "50-100", "100+"];
    if (!validSizes.includes(size)) throw new Error("Invalid team size");

    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({ name: name.trim(), size, owner_id: user.id })
      .select()
      .single();
    if (teamError) throw teamError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ team_id: newTeam.id, team_role: "owner" })
      .eq("user_id", user.id);
    if (profileError) throw profileError;

    setTeam(newTeam as Team);
    setIsOwner(true);
    setHasTeam(true);
  };

  const getTeamMembers = async () => {
    if (!team) return [];
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, xp, calls_completed, team_role, is_pro")
      .eq("team_id", team.id);
    return data || [];
  };

  return (
    <TeamContext.Provider value={{ team, isOwner, loading, hasTeam, fetchTeam, createTeam, getTeamMembers }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}