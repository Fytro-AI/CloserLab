import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTeam } from "./useTeam";

export interface CustomPersona {
  id: string;
  created_by: string;
  team_id: string | null;
  name: string;
  job_title: string;
  industry: string;
  company_size: string;
  age_range: string;
  conversation_type: "B2B" | "B2C";
  description: string;
  product_details: string;
  call_goal: string | null;
  created_at: string;
}

export interface CreatePersonaForm {
  name: string;
  job_title: string;
  industry: string;
  company_size: string;
  age_range: string;
  conversation_type: "B2B" | "B2C";
  description: string;
  product_details: string;
  call_goal: string;
}

export function useCustomPersonas() {
  const { user } = useAuth();
  const { team } = useTeam();
  const [personas, setPersonas] = useState<CustomPersona[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonas = async () => {
    if (!user) return;
    setLoading(true);

    // RLS policy handles access control — just fetch what the user can see
    // Add client-side filter hint for clarity
    let query = supabase
      .from("custom_personas")
      .select("*")
      .order("created_at", { ascending: false });

    if (team?.id) {
      query = query.or(`created_by.eq.${user.id},team_id.eq.${team.id}`);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;
    if (!error && data) setPersonas(data as CustomPersona[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user !== undefined) fetchPersonas();
  }, [user, team?.id]);

  const createPersona = async (form: CreatePersonaForm): Promise<CustomPersona> => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("custom_personas")
      .insert({
        created_by: user.id,
        team_id: team?.id ?? null,
        name: form.name.trim(),
        job_title: form.job_title.trim(),
        industry: form.industry.trim(),
        company_size: form.company_size,
        age_range: form.age_range,
        conversation_type: form.conversation_type,
        description: form.description.trim(),
        product_details: form.product_details.trim(),
        call_goal: form.call_goal.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    const created = data as CustomPersona;
    setPersonas((prev) => [created, ...prev]);
    return created;
  };

  const deletePersona = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("custom_personas")
      .delete()
      .eq("id", id)
      .eq("created_by", user?.id ?? "");
    if (error) throw error;
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  return { personas, loading, createPersona, deletePersona, refetch: fetchPersonas };
}