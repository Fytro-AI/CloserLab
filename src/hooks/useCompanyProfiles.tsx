import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CompanyProfile {
  id: string;
  user_id: string;
  name: string;
  what_you_sell: string;
  who_you_sell_to: string;
  pain_points: string;
  objections_and_responses: string;
  past_experience: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyProfileDraft = Omit<CompanyProfile, "id" | "user_id" | "created_at" | "updated_at">;

// The Supabase generated types.ts was created before this table existed,
// so we cast the client to `any` for this table only to bypass TS errors.
// The table, RLS policies, and columns are all confirmed in the database.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useCompanyProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await db
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setProfiles((data as CompanyProfile[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = async (
    draft: Omit<CompanyProfileDraft, "is_default">
  ): Promise<CompanyProfile | null> => {
    if (!user) return null;
    const isFirst = profiles.length === 0;
    const { data, error } = await db
      .from("company_profiles")
      .insert({ ...draft, user_id: user.id, is_default: isFirst })
      .select("*")
      .single();
    if (!error) await refetch();
    return error ? null : (data as CompanyProfile);
  };

  const update = async (
    id: string,
    draft: Partial<CompanyProfileDraft>
  ): Promise<boolean> => {
    const { error } = await db
      .from("company_profiles")
      .update(draft)
      .eq("id", id);
    if (!error) await refetch();
    return !error;
  };

  const remove = async (id: string): Promise<void> => {
    await db.from("company_profiles").delete().eq("id", id);
    await refetch();
  };

  const setDefault = async (id: string): Promise<void> => {
    if (!user) return;
    // Clear all defaults first, then promote the chosen one
    await db
      .from("company_profiles")
      .update({ is_default: false })
      .eq("user_id", user.id);
    await db
      .from("company_profiles")
      .update({ is_default: true })
      .eq("id", id);
    await refetch();
  };

  const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0] ?? null;

  return { profiles, loading, defaultProfile, create, update, remove, setDefault, refetch };
}