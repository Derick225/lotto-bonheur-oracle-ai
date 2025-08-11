export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_accessed: string | null
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_accessed?: string | null
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_accessed?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          role?: string
        }
        Relationships: []
      }
      lottery_results: {
        Row: {
          created_at: string | null
          date: string
          draw_name: string
          gagnants: number[]
          id: number
          machine: number[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          draw_name: string
          gagnants: number[]
          id?: number
          machine?: number[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          draw_name?: string
          gagnants?: number[]
          id?: number
          machine?: number[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          created_at: string | null
          draw_name: string
          id: number
          is_active: boolean | null
          model_data: Json
          model_type: string
          performance_metrics: Json | null
          training_data_hash: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          draw_name: string
          id?: number
          is_active?: boolean | null
          model_data: Json
          model_type: string
          performance_metrics?: Json | null
          training_data_hash?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          draw_name?: string
          id?: number
          is_active?: boolean | null
          model_data?: Json
          model_type?: string
          performance_metrics?: Json | null
          training_data_hash?: string | null
          version?: string | null
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          accuracy: number | null
          actual_numbers: number[] | null
          confidence: number | null
          created_at: string | null
          draw_name: string
          id: number
          model_used: string
          predicted_numbers: number[]
          prediction_date: string | null
        }
        Insert: {
          accuracy?: number | null
          actual_numbers?: number[] | null
          confidence?: number | null
          created_at?: string | null
          draw_name: string
          id?: number
          model_used: string
          predicted_numbers: number[]
          prediction_date?: string | null
        }
        Update: {
          accuracy?: number | null
          actual_numbers?: number[] | null
          confidence?: number | null
          created_at?: string | null
          draw_name?: string
          id?: number
          model_used?: string
          predicted_numbers?: number[]
          prediction_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      draw_statistics: {
        Row: {
          avg_numbers: number | null
          draw_name: string | null
          first_draw: string | null
          last_draw: string | null
          total_draws: number | null
        }
        Relationships: []
      }
      model_performance: {
        Row: {
          avg_accuracy: number | null
          draw_name: string | null
          model_id: number | null
          model_type: string | null
          total_predictions: number | null
        }
        Relationships: []
      }
      number_frequencies: {
        Row: {
          draw_name: string | null
          frequency: number | null
          number: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_admin: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      calculate_prediction_accuracy: {
        Args: { predicted: number[]; actual: number[] }
        Returns: number
      }
      change_admin_password: {
        Args: {
          p_session_token: string
          p_current_password: string
          p_new_password: string
        }
        Returns: boolean
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_admin_session: {
        Args: {
          p_user_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      create_admin_user: {
        Args: {
          p_session_token: string
          p_email: string
          p_password: string
          p_role?: string
        }
        Returns: Json
      }
      get_global_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_number_frequency: {
        Args: { p_draw_name: string; p_limit?: number }
        Returns: {
          number: number
          frequency: number
          percentage: number
        }[]
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      invalidate_admin_session: {
        Args: { session_token: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          event_type: string
          user_id?: string
          ip_address?: unknown
          user_agent?: string
          details?: Json
        }
        Returns: undefined
      }
      validate_admin_session: {
        Args: { session_token: string }
        Returns: Json
      }
      validate_lottery_numbers: {
        Args: { numbers: number[] }
        Returns: boolean
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
