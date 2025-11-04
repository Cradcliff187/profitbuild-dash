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
      admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      change_order_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          id: string
          is_milestone: boolean | null
          markup_amount: number | null
          payee_id: string | null
          price_per_unit: number | null
          quantity: number | null
          schedule_notes: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          sort_order: number | null
          total_cost: number | null
          total_price: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          markup_amount?: number | null
          payee_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          change_order_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          markup_amount?: number | null
          payee_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_line_items_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number | null
          approved_by: string | null
          approved_date: string | null
          change_order_number: string
          client_amount: number | null
          contingency_billed_to_client: number | null
          cost_impact: number | null
          created_at: string | null
          description: string
          id: string
          includes_contingency: boolean | null
          margin_impact: number | null
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
          client_amount?: number | null
          contingency_billed_to_client?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description: string
          id?: string
          includes_contingency?: boolean | null
          margin_impact?: number | null
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
          client_amount?: number | null
          contingency_billed_to_client?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string
          id?: string
          includes_contingency?: boolean | null
          margin_impact?: number | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_address: string | null
          client_name: string
          client_type: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          mailing_address: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          quickbooks_customer_id: string | null
          tax_exempt: boolean | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          client_name: string
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mailing_address?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quickbooks_customer_id?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          client_name?: string
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mailing_address?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quickbooks_customer_id?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_branding_settings: {
        Row: {
          accent_color: string | null
          company_abbreviation: string | null
          company_address: string | null
          company_legal_name: string | null
          company_license: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          id: string
          light_bg_color: string | null
          logo_full_url: string | null
          logo_icon_url: string | null
          logo_report_header_url: string | null
          logo_stacked_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          company_abbreviation?: string | null
          company_address?: string | null
          company_legal_name?: string | null
          company_license?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          id?: string
          light_bg_color?: string | null
          logo_full_url?: string | null
          logo_icon_url?: string | null
          logo_report_header_url?: string | null
          logo_stacked_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          company_abbreviation?: string | null
          company_address?: string | null
          company_legal_name?: string | null
          company_license?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          id?: string
          light_bg_color?: string | null
          logo_full_url?: string | null
          logo_icon_url?: string | null
          logo_report_header_url?: string | null
          logo_stacked_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      estimate_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          estimate_id: string
          id: string
          is_milestone: boolean | null
          markup_amount: number | null
          markup_percent: number | null
          price_per_unit: number | null
          quantity: number | null
          quickbooks_item_id: string | null
          rate: number | null
          schedule_notes: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          estimate_id: string
          id?: string
          is_milestone?: boolean | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          estimate_id?: string
          id?: string
          is_milestone?: boolean | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
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
      estimate_line_items_backup_20251030: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          estimate_id: string | null
          id: string | null
          markup_amount: number | null
          markup_percent: number | null
          price_per_unit: number | null
          quantity: number | null
          quickbooks_item_id: string | null
          rate: number | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          contingency_amount: number | null
          contingency_percent: number | null
          contingency_used: number | null
          created_at: string | null
          created_by: string | null
          date_created: string | null
          default_markup_percent: number | null
          estimate_number: string
          id: string
          is_current_version: boolean | null
          is_draft: boolean
          notes: string | null
          parent_estimate_id: string | null
          project_id: string
          revision_number: number | null
          sequence_number: number | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent: number | null
          total_amount: number | null
          total_cost: number | null
          updated_at: string | null
          valid_for_days: number | null
          valid_until: string | null
          version_number: number | null
        }
        Insert: {
          contingency_amount?: number | null
          contingency_percent?: number | null
          contingency_used?: number | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          default_markup_percent?: number | null
          estimate_number: string
          id?: string
          is_current_version?: boolean | null
          is_draft?: boolean
          notes?: string | null
          parent_estimate_id?: string | null
          project_id: string
          revision_number?: number | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent?: number | null
          total_amount?: number | null
          total_cost?: number | null
          updated_at?: string | null
          valid_for_days?: number | null
          valid_until?: string | null
          version_number?: number | null
        }
        Update: {
          contingency_amount?: number | null
          contingency_percent?: number | null
          contingency_used?: number | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          default_markup_percent?: number | null
          estimate_number?: string
          id?: string
          is_current_version?: boolean | null
          is_draft?: boolean
          notes?: string | null
          parent_estimate_id?: string | null
          project_id?: string
          revision_number?: number | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent?: number | null
          total_amount?: number | null
          total_cost?: number | null
          updated_at?: string | null
          valid_for_days?: number | null
          valid_until?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_line_item_correlations: {
        Row: {
          auto_correlated: boolean | null
          change_order_line_item_id: string | null
          confidence_score: number | null
          correlation_type: string
          created_at: string
          estimate_line_item_id: string | null
          expense_id: string
          id: string
          notes: string | null
          quote_id: string | null
          updated_at: string
        }
        Insert: {
          auto_correlated?: boolean | null
          change_order_line_item_id?: string | null
          confidence_score?: number | null
          correlation_type: string
          created_at?: string
          estimate_line_item_id?: string | null
          expense_id: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_correlated?: boolean | null
          change_order_line_item_id?: string | null
          confidence_score?: number | null
          correlation_type?: string
          created_at?: string
          estimate_line_item_id?: string | null
          expense_id?: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_line_item_correlations_change_order_line_item_id_fkey"
            columns: ["change_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "change_order_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_estimate_line_item_id_fkey"
            columns: ["estimate_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_full_name: string | null
          account_name: string | null
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_offline: boolean | null
          description: string | null
          end_time: string | null
          expense_date: string | null
          id: string
          invoice_number: string | null
          is_locked: boolean | null
          is_planned: boolean | null
          local_id: string | null
          payee_id: string | null
          project_id: string
          quickbooks_transaction_id: string | null
          receipt_id: string | null
          rejection_reason: string | null
          start_time: string | null
          submitted_for_approval_at: string | null
          synced_at: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          account_full_name?: string | null
          account_name?: string | null
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_offline?: boolean | null
          description?: string | null
          end_time?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          local_id?: string | null
          payee_id?: string | null
          project_id: string
          quickbooks_transaction_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          submitted_for_approval_at?: string | null
          synced_at?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          account_full_name?: string | null
          account_name?: string | null
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_offline?: boolean | null
          description?: string | null
          end_time?: string | null
          expense_date?: string | null
          id?: string
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          local_id?: string | null
          payee_id?: string | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          submitted_for_approval_at?: string | null
          synced_at?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          media_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          media_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          media_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "project_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          hourly_rate: number | null
          id: string
          insurance_expires: string | null
          is_active: boolean | null
          is_internal: boolean | null
          last_synced_at: string | null
          license_number: string | null
          payee_name: string
          payee_type: string | null
          permit_issuer: boolean | null
          phone_numbers: string | null
          provides_labor: boolean | null
          provides_materials: boolean | null
          quickbooks_vendor_id: string | null
          requires_1099: boolean | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          terms: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          license_number?: string | null
          payee_name: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          license_number?: string | null
          payee_name?: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          mime_type: string
          project_id: string
          related_quote_id: string | null
          updated_at: string
          uploaded_by: string | null
          version_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          mime_type: string
          project_id: string
          related_quote_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          mime_type?: string
          project_id?: string
          related_quote_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media: {
        Row: {
          altitude: number | null
          caption: string | null
          created_at: string
          description: string | null
          device_model: string | null
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mime_type: string
          project_id: string
          taken_at: string | null
          thumbnail_url: string | null
          updated_at: string
          upload_source: string | null
          uploaded_by: string | null
        }
        Insert: {
          altitude?: number | null
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type: string
          project_id: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          altitude?: number | null
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type?: string
          project_id?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revenues: {
        Row: {
          account_full_name: string | null
          account_name: string | null
          amount: number
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          project_id: string
          quickbooks_transaction_id: string | null
          updated_at: string
        }
        Insert: {
          account_full_name?: string | null
          account_name?: string | null
          amount: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          project_id: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          account_full_name?: string | null
          account_name?: string | null
          amount?: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          adjusted_est_costs: number | null
          client_id: string | null
          client_name: string
          contingency_remaining: number | null
          contracted_amount: number | null
          created_at: string | null
          current_margin: number | null
          end_date: string | null
          id: string
          job_type: string | null
          last_synced_at: string | null
          margin_percentage: number | null
          minimum_margin_threshold: number | null
          original_est_costs: number | null
          original_margin: number | null
          payment_terms: string | null
          project_name: string
          project_number: string
          project_type: Database["public"]["Enums"]["project_type"] | null
          projected_margin: number | null
          qb_formatted_number: string | null
          quickbooks_job_id: string | null
          sequence_number: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          target_margin: number | null
          total_accepted_quotes: number | null
          updated_at: string | null
          work_order_counter: number | null
        }
        Insert: {
          address?: string | null
          adjusted_est_costs?: number | null
          client_id?: string | null
          client_name: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          original_est_costs?: number | null
          original_margin?: number | null
          payment_terms?: string | null
          project_name: string
          project_number: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          projected_margin?: number | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          sequence_number?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          target_margin?: number | null
          total_accepted_quotes?: number | null
          updated_at?: string | null
          work_order_counter?: number | null
        }
        Update: {
          address?: string | null
          adjusted_est_costs?: number | null
          client_id?: string | null
          client_name?: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          original_est_costs?: number | null
          original_margin?: number | null
          payment_terms?: string | null
          project_name?: string
          project_number?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          projected_margin?: number | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          sequence_number?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          target_margin?: number | null
          total_accepted_quotes?: number | null
          updated_at?: string | null
          work_order_counter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          estimate_line_item_id: string | null
          id: string
          markup_amount: number | null
          markup_percent: number | null
          quantity: number | null
          quote_id: string
          rate: number | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number | null
          quantity?: number | null
          quote_id: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number | null
          quantity?: number | null
          quote_id?: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
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
          accepted_date: string | null
          attachment_url: string | null
          created_at: string | null
          date_received: string | null
          estimate_id: string
          id: string
          includes_labor: boolean
          includes_materials: boolean
          notes: string | null
          payee_id: string
          project_id: string
          quote_number: string
          rejection_reason: string | null
          sequence_number: number | null
          status: Database["public"]["Enums"]["quote_status"] | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          accepted_date?: string | null
          attachment_url?: string | null
          created_at?: string | null
          date_received?: string | null
          estimate_id: string
          id?: string
          includes_labor?: boolean
          includes_materials?: boolean
          notes?: string | null
          payee_id: string
          project_id: string
          quote_number: string
          rejection_reason?: string | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          accepted_date?: string | null
          attachment_url?: string | null
          created_at?: string | null
          date_received?: string | null
          estimate_id?: string
          id?: string
          includes_labor?: boolean
          includes_materials?: boolean
          notes?: string | null
          payee_id?: string
          project_id?: string
          quote_number?: string
          rejection_reason?: string | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
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
      receipts: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          captured_at: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          payee_id: string | null
          project_id: string | null
          rejection_reason: string | null
          submitted_for_approval_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          captured_at?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          payee_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          captured_at?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          payee_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      project_financial_summary: {
        Row: {
          actual_profit: number | null
          change_order_costs: number | null
          change_order_revenue: number | null
          client_name: string | null
          contracted_amount: number | null
          cost_variance: number | null
          current_margin_percentage: number | null
          expense_count: number | null
          invoice_count: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          revenue_variance: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_estimated: number | null
          total_expenses: number | null
          total_invoiced: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_contingency_remaining: {
        Args: { project_id_param: string }
        Returns: number
      }
      calculate_project_margins: {
        Args: { project_id_param: string }
        Returns: undefined
      }
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      check_margin_thresholds: {
        Args: { project_id_param: string }
        Returns: string
      }
      create_estimate_version: {
        Args: { new_version_number?: number; source_estimate_id: string }
        Returns: string
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      generate_estimate_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      generate_quote_number: {
        Args: {
          estimate_id_param: string
          project_id_param: string
          project_number_param: string
        }
        Returns: string
      }
      generate_work_order_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      get_next_project_number: { Args: never; Returns: string }
      get_project_financial_summary: {
        Args: never
        Returns: {
          accepted_quote_count: number
          actual_margin_percentage: number
          actual_profit: number
          change_order_costs: number
          change_order_revenue: number
          client_name: string
          contingency_amount: number
          cost_variance: number
          expense_count: number
          invoice_count: number
          project_id: string
          project_name: string
          project_number: string
          revenue_variance: number
          status: Database["public"]["Enums"]["project_status"]
          total_estimated: number
          total_expenses: number
          total_invoiced: number
          total_quoted: number
        }[]
      }
      get_user_auth_status: {
        Args: never
        Returns: {
          confirmed_at: string
          email: string
          full_name: string
          has_password: boolean
          id: string
          last_sign_in_at: string
          must_change_password: boolean
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rollback_cost_migration_final: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "field_worker"
      change_order_status: "pending" | "approved" | "rejected"
      estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      expense_category:
        | "labor_internal"
        | "subcontractors"
        | "materials"
        | "equipment"
        | "other"
        | "permits"
        | "management"
        | "office_expenses"
        | "vehicle_expenses"
      project_status:
        | "estimating"
        | "quoted"
        | "in_progress"
        | "complete"
        | "cancelled"
        | "approved"
        | "on_hold"
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
      app_role: ["admin", "manager", "field_worker"],
      change_order_status: ["pending", "approved", "rejected"],
      estimate_status: ["draft", "sent", "approved", "rejected", "expired"],
      expense_category: [
        "labor_internal",
        "subcontractors",
        "materials",
        "equipment",
        "other",
        "permits",
        "management",
        "office_expenses",
        "vehicle_expenses",
      ],
      project_status: [
        "estimating",
        "quoted",
        "in_progress",
        "complete",
        "cancelled",
        "approved",
        "on_hold",
      ],
      project_type: ["construction_project", "work_order"],
      quote_status: ["pending", "accepted", "rejected", "expired"],
      sync_status: ["success", "failed", "pending"],
      sync_type: ["import", "export"],
      transaction_type: ["expense", "bill", "check", "credit_card", "cash"],
    },
  },
} as const
