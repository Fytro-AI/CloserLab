export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      call_history: {
        Row: {
          clarity_score: number
          closing_score: number
          confidence_score: number
          created_at: string
          difficulty: string
          duration: number
          id: string
          improvement_tip: string | null
          industry: string
          missed_opportunities: string[]
          objection_handling_score: number
          overall_score: number
          persona: string
          strengths: string[]
          transcript: Json
          user_id: string
          weaknesses: string[]
          xp_earned: number
        }
        Insert: {
          clarity_score?: number
          closing_score?: number
          confidence_score?: number
          created_at?: string
          difficulty: string
          duration?: number
          id?: string
          improvement_tip?: string | null
          industry: string
          missed_opportunities?: string[]
          objection_handling_score?: number
          overall_score?: number
          persona: string
          strengths?: string[]
          transcript?: Json
          user_id: string
          weaknesses?: string[]
          xp_earned?: number
        }
        Update: {
          clarity_score?: number
          closing_score?: number
          confidence_score?: number
          created_at?: string
          difficulty?: string
          duration?: number
          id?: string
          improvement_tip?: string | null
          industry?: string
          missed_opportunities?: string[]
          objection_handling_score?: number
          overall_score?: number
          persona?: string
          strengths?: string[]
          transcript?: Json
          user_id?: string
          weaknesses?: string[]
          xp_earned?: number
        }
        Relationships: []
      }
      challenge_completions: {
        Row: {
          challenge_id: string
          created_at: string
          difficulty: string
          id: string
          passed: boolean
          score: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          difficulty?: string
          id?: string
          passed?: boolean
          score?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          passed?: boolean
          score?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      daily_objections: {
        Row: {
          ai_feedback: string | null
          buyer_context: string | null
          created_at: string
          id: string
          objection_date: string
          objection_text: string
          score: number | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          ai_feedback?: string | null
          buyer_context?: string | null
          created_at?: string
          id?: string
          objection_date?: string
          objection_text: string
          score?: number | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          ai_feedback?: string | null
          buyer_context?: string | null
          created_at?: string
          id?: string
          objection_date?: string
          objection_text?: string
          score?: number | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          calls_completed: number
          created_at: string
          id: string
          is_pro: boolean
          last_call_date: string | null
          level: number
          name: string
          skill_clarity: number
          skill_closing: number
          skill_confidence: number
          skill_objection_handling: number
          streak: number
          updated_at: string
          user_id: string
          week_start: string | null
          weekly_calls_count: number
          xp: number
        }
        Insert: {
          calls_completed?: number
          created_at?: string
          id?: string
          is_pro?: boolean
          last_call_date?: string | null
          level?: number
          name?: string
          skill_clarity?: number
          skill_closing?: number
          skill_confidence?: number
          skill_objection_handling?: number
          streak?: number
          updated_at?: string
          user_id: string
          week_start?: string | null
          weekly_calls_count?: number
          xp?: number
        }
        Update: {
          calls_completed?: number
          created_at?: string
          id?: string
          is_pro?: boolean
          last_call_date?: string | null
          level?: number
          name?: string
          skill_clarity?: number
          skill_closing?: number
          skill_confidence?: number
          skill_objection_handling?: number
          streak?: number
          updated_at?: string
          user_id?: string
          week_start?: string | null
          weekly_calls_count?: number
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { row_limit?: number }
        Returns: {
          level: number
          name: string
          streak: number
          xp: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
