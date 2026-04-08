import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTeam } from "./useTeam";
import { useProfile } from "./useProfile";

/**
 * useTeamContext
 *
 * Returns the list of user IDs to query for stats/history/graphs.
 * - Team owners → all member IDs in the team
 * - Everyone else → just their own user ID
 *
 * Drop-in replacement for `user.id` in all data queries.
 */
export function useTeamContext() {
  const { user } = useAuth();
  const { team, isOwner } = useTeam();
  const { profile } = useProfile();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberIds([]);
      setLoading(false);
      return;
    }

    if (!isOwner || !team?.id) {
      // Regular member or no team — only own data
      setMemberIds([user.id]);
      setLoading(false);
      return;
    }

    // Owner — fetch all team member IDs
    supabase
      .from("profiles")
      .select("user_id")
      .eq("team_id", team.id)
      .then(({ data }) => {
        const ids = (data || []).map((r: any) => r.user_id);
        // Always include self in case not yet in profiles query result
        const unique = Array.from(new Set([user.id, ...ids]));
        setMemberIds(unique);
        setLoading(false);
      });
  }, [user, isOwner, team?.id]);

  return {
    memberIds,
    isOwner: !!isOwner,
    loading,
    /** Convenience: true when showing aggregated team data */
    isTeamView: !!isOwner && memberIds.length > 1,
  };
}