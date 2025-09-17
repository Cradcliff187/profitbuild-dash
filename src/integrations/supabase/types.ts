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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      change_orders: {
        Row: {
          amount: number | null
          approved_by: string | null
          approved_date: string | null
          change_order_number: string
          created_at: string | null
          description: string
          id: string
          project_id: string
          reason_for_change: string | null
          requested_date: string | null
          status: Database["public"]["Enums"]["change_order_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          approved_date?: string | null
          change_order_number: string
          created_at?: string | null
          description: string
          id?: string
          project_id: string
          reason_for_change?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["change_order_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          approved_date?: string | null
          change_order_number?: string
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string
          reason_for_change?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["change_order_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          quantity: number | null
          quickbooks_item_id: string | null
          rate: number | null
          sort_order: number | null
          total: number | null
          unit: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_created: string | null
          estimate_number: string
          id: string
          notes: string | null
          project_id: string
          revision_number: number | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          estimate_number: string
          id?: string
          notes?: string | null
          project_id: string
          revision_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          estimate_number?: string
          id?: string
          notes?: string | null
          project_id?: string
          revision_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_full_name: string | null
          account_name: string | null
          amount: number
          attachment_url: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          description: string | null
          expense_date: string | null
          id: string
          invoice_number: string | null
          is_planned: boolean | null
          payee_id: string | null
          project_id: string
          quickbooks_transaction_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          account_full_name?: string | null
          account_name?: string | null
          amount: number
          attachment_url?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_planned?: boolean | null
          payee_id?: string | null
          project_id: string
          quickbooks_transaction_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          account_full_name?: string | null
          account_name?: string | null
          amount?: number
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_planned?: boolean | null
          payee_id?: string | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payees: {
        Row: {
          account_number: string | null
          billing_address: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          last_synced_at: string | null
          payee_type: string | null
          phone_numbers: string | null
          provides_labor: boolean | null
          provides_materials: boolean | null
          quickbooks_vendor_id: string | null
          requires_1099: boolean | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          terms: string | null
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          payee_type?: string | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          payee_type?: string | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          client_name: string
          created_at: string | null
          end_date: string | null
          id: string
          job_type: string | null
          last_synced_at: string | null
          project_name: string
          project_number: string
          project_type: Database["public"]["Enums"]["project_type"] | null
          qb_formatted_number: string | null
          quickbooks_job_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_name: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          project_name: string
          project_number: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_name?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          project_name?: string
          project_number?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quickbooks_account_mappings: {
        Row: {
          app_category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          id: string
          is_active: boolean
          qb_account_full_path: string
          qb_account_name: string
          updated_at: string
        }
        Insert: {
          app_category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          qb_account_full_path: string
          qb_account_name: string
          updated_at?: string
        }
        Update: {
          app_category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          qb_account_full_path?: string
          qb_account_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quickbooks_sync_log: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          quickbooks_id: string | null
          status: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          quickbooks_id?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          quickbooks_id?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type?: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          description: string | null
          estimate_line_item_id: string | null
          id: string
          quantity: number | null
          quote_id: string
          rate: number | null
          sort_order: number | null
          total: number | null
          unit: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          quantity?: number | null
          quote_id: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          quantity?: number | null
          quote_id?: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_estimate_line_item_id_fkey"
            columns: ["estimate_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          date_expires: string | null
          date_received: string | null
          estimate_id: string
          id: string
          notes: string | null
          payee_id: string
          project_id: string
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"] | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          date_expires?: string | null
          date_received?: string | null
          estimate_id: string
          id?: string
          notes?: string | null
          payee_id: string
          project_id: string
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          date_expires?: string | null
          date_received?: string | null
          estimate_id?: string
          id?: string
          notes?: string | null
          payee_id?: string
          project_id?: string
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      change_order_status: "pending" | "approved" | "rejected"
      estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      expense_category:
        | "labor_internal"
        | "subcontractors"
        | "materials"
        | "equipment"
        | "other"
      project_status:
        | "estimating"
        | "quoted"
        | "in_progress"
        | "complete"
        | "cancelled"
      project_type: "construction_project" | "work_order"
      quote_status: "pending" | "accepted" | "rejected" | "expired"
      sync_status: "success" | "failed" | "pending"
      sync_type: "import" | "export"
      transaction_type: "expense" | "bill" | "check" | "credit_card" | "cash"
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
    Enums: {
      change_order_status: ["pending", "approved", "rejected"],
      estimate_status: ["draft", "sent", "approved", "rejected", "expired"],
      expense_category: [
        "labor_internal",
        "subcontractors",
        "materials",
        "equipment",
        "other",
      ],
      project_status: [
        "estimating",
        "quoted",
        "in_progress",
        "complete",
        "cancelled",
      ],
      project_type: ["construction_project", "work_order"],
      quote_status: ["pending", "accepted", "rejected", "expired"],
      sync_status: ["success", "failed", "pending"],
      sync_type: ["import", "export"],
      transaction_type: ["expense", "bill", "check", "credit_card", "cash"],
    },
  },
} as const
