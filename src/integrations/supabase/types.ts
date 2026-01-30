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
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          deleted_at: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          deleted_at?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_action_log: {
        Row: {
          action_type: string
          ai_response: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          parameters: Json | null
          performed_by: string | null
          success: boolean | null
          user_message: string | null
        }
        Insert: {
          action_type: string
          ai_response?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          performed_by?: string | null
          success?: boolean | null
          user_message?: string | null
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          performed_by?: string | null
          success?: boolean | null
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_media: {
        Row: {
          altitude: number | null
          bid_id: string
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
          taken_at: string | null
          thumbnail_url: string | null
          updated_at: string
          upload_source: string | null
          uploaded_by: string | null
        }
        Insert: {
          altitude?: number | null
          bid_id: string
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
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          altitude?: number | null
          bid_id?: string
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
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_media_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "branch_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_notes: {
        Row: {
          bid_id: string
          created_at: string
          id: string
          note_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          id?: string
          note_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_notes_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "branch_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_bids: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          estimate_id: string | null
          id: string
          job_type: string | null
          name: string
          project_id: string | null
          project_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          job_type?: string | null
          name: string
          project_id?: string | null
          project_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          job_type?: string | null
          name?: string
          project_id?: string | null
          project_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_bids_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bids_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "branch_bids_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_line_items: {
        Row: {
          actual_cost_rate_per_hour: number | null
          billing_rate_per_hour: number | null
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          id: string
          is_milestone: boolean | null
          labor_cushion_amount: number | null
          labor_hours: number | null
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
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
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
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          change_order_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
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
      company_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          agreement_date: string
          contract_number: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          docx_storage_path: string | null
          docx_url: string | null
          estimate_id: string | null
          field_values: Json
          id: string
          internal_reference: string | null
          notes: string | null
          payee_id: string
          pdf_storage_path: string | null
          pdf_url: string | null
          project_end_date: string | null
          project_id: string
          project_start_date: string | null
          quote_id: string | null
          status: string
          subcontract_price: number
          updated_at: string
          version: number
        }
        Insert: {
          agreement_date: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          docx_storage_path?: string | null
          docx_url?: string | null
          estimate_id?: string | null
          field_values: Json
          id?: string
          internal_reference?: string | null
          notes?: string | null
          payee_id: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          project_end_date?: string | null
          project_id: string
          project_start_date?: string | null
          quote_id?: string | null
          status?: string
          subcontract_price: number
          updated_at?: string
          version?: number
        }
        Update: {
          agreement_date?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          docx_storage_path?: string | null
          docx_url?: string | null
          estimate_id?: string | null
          field_values?: Json
          id?: string
          internal_reference?: string | null
          notes?: string | null
          payee_id?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          project_end_date?: string | null
          project_id?: string
          project_start_date?: string | null
          quote_id?: string | null
          status?: string
          subcontract_price?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "contracts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          actual_cost_rate_per_hour: number | null
          billing_rate_per_hour: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          estimate_id: string
          id: string
          is_milestone: boolean | null
          labor_cushion_amount: number | null
          labor_hours: number | null
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
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          estimate_id: string
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
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
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          estimate_id?: string
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
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
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
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
          is_auto_generated: boolean | null
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
          total_labor_cushion: number | null
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
          is_auto_generated?: boolean | null
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
          total_labor_cushion?: number | null
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
          is_auto_generated?: boolean | null
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
          total_labor_cushion?: number | null
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
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
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
          expense_id: string | null
          expense_split_id: string | null
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
          expense_id?: string | null
          expense_split_id?: string | null
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
          expense_id?: string | null
          expense_split_id?: string | null
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
            foreignKeyName: "expense_line_item_correlations_expense_split_id_fkey"
            columns: ["expense_split_id"]
            isOneToOne: false
            referencedRelation: "expense_splits"
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
      expense_splits: {
        Row: {
          created_at: string
          created_by: string | null
          expense_id: string
          id: string
          notes: string | null
          project_id: string
          split_amount: number
          split_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_id: string
          id?: string
          notes?: string | null
          project_id: string
          split_amount: number
          split_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          split_amount?: number
          split_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_project_id_fkey"
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
          is_split: boolean
          local_id: string | null
          lunch_duration_minutes: number | null
          lunch_taken: boolean | null
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
          is_split?: boolean
          local_id?: string | null
          lunch_duration_minutes?: number | null
          lunch_taken?: boolean | null
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
          is_split?: boolean
          local_id?: string | null
          lunch_duration_minutes?: number | null
          lunch_taken?: boolean | null
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
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
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
          contact_name: string | null
          contact_title: string | null
          created_at: string | null
          email: string | null
          employee_number: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          insurance_expires: string | null
          is_active: boolean | null
          is_internal: boolean | null
          last_synced_at: string | null
          legal_form: string | null
          license_number: string | null
          notes: string | null
          payee_name: string
          payee_type: string | null
          permit_issuer: boolean | null
          phone_numbers: string | null
          provides_labor: boolean | null
          provides_materials: boolean | null
          quickbooks_sync_status: string | null
          quickbooks_synced_at: string | null
          quickbooks_vendor_id: string | null
          quickbooks_vendor_name: string | null
          requires_1099: boolean | null
          state_of_formation: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          terms: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          billing_address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          email?: string | null
          employee_number?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          legal_form?: string | null
          license_number?: string | null
          notes?: string | null
          payee_name: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_vendor_id?: string | null
          quickbooks_vendor_name?: string | null
          requires_1099?: boolean | null
          state_of_formation?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          billing_address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          email?: string | null
          employee_number?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          legal_form?: string | null
          license_number?: string | null
          notes?: string | null
          payee_name?: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_vendor_id?: string | null
          quickbooks_vendor_name?: string | null
          requires_1099?: boolean | null
          state_of_formation?: string | null
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
          last_active_at: string | null
          must_change_password: boolean | null
          phone: string | null
          sms_notifications_enabled: boolean | null
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
          last_active_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          sms_notifications_enabled?: boolean | null
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
          last_active_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          sms_notifications_enabled?: boolean | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          id: string
          note_text: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          note_text: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          note_text?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_split: boolean | null
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
          is_split?: boolean | null
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
          is_split?: boolean | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revenues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_margin: number | null
          address: string | null
          adjusted_est_costs: number | null
          adjusted_est_margin: number | null
          category: Database["public"]["Enums"]["project_category"]
          client_id: string | null
          client_name: string
          contingency_remaining: number | null
          contracted_amount: number | null
          created_at: string | null
          current_margin: number | null
          customer_po_number: string | null
          do_not_exceed: number | null
          end_date: string | null
          id: string
          job_type: string | null
          last_synced_at: string | null
          margin_percentage: number | null
          minimum_margin_threshold: number | null
          notes: string | null
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
          actual_margin?: number | null
          address?: string | null
          adjusted_est_costs?: number | null
          adjusted_est_margin?: number | null
          category?: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_name: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          do_not_exceed?: number | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
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
          actual_margin?: number | null
          address?: string | null
          adjusted_est_costs?: number | null
          adjusted_est_margin?: number | null
          category?: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_name?: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          do_not_exceed?: number | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
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
      quickbooks_connections: {
        Row: {
          access_token: string
          company_name: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          disconnected_at: string | null
          disconnected_by: string | null
          environment: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          company_name?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          company_name?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_connections_disconnected_by_fkey"
            columns: ["disconnected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string
          environment: string | null
          error_message: string | null
          id: string
          initiated_by: string | null
          quickbooks_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type: string
          environment?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          quickbooks_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string
          environment?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          quickbooks_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type?: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_log_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_transaction_syncs: {
        Row: {
          created_at: string | null
          duplicates_skipped: number | null
          end_date: string
          environment: string
          error_message: string | null
          expenses_imported: number | null
          id: string
          initiated_by: string | null
          revenues_imported: number | null
          start_date: string
          sync_completed_at: string | null
          sync_started_at: string
          sync_status: string
          transactions_fetched: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duplicates_skipped?: number | null
          end_date: string
          environment: string
          error_message?: string | null
          expenses_imported?: number | null
          id?: string
          initiated_by?: string | null
          revenues_imported?: number | null
          start_date: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          transactions_fetched?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duplicates_skipped?: number | null
          end_date?: string
          environment?: string
          error_message?: string | null
          expenses_imported?: number | null
          id?: string
          initiated_by?: string | null
          revenues_imported?: number | null
          start_date?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          transactions_fetched?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_line_item_id: string | null
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
          change_order_line_item_id?: string | null
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
          change_order_line_item_id?: string | null
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
            foreignKeyName: "quote_line_items_change_order_line_item_id_fkey"
            columns: ["change_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "change_order_line_items"
            referencedColumns: ["id"]
          },
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
          estimate_id: string | null
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
          estimate_id?: string | null
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
          estimate_id?: string | null
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
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
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
          quickbooks_error_message: string | null
          quickbooks_request_payload: Json | null
          quickbooks_response_payload: Json | null
          quickbooks_sync_status: string | null
          quickbooks_synced_at: string | null
          quickbooks_synced_by: string | null
          quickbooks_transaction_id: string | null
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
          quickbooks_error_message?: string | null
          quickbooks_request_payload?: Json | null
          quickbooks_response_payload?: Json | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_synced_by?: string | null
          quickbooks_transaction_id?: string | null
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
          quickbooks_error_message?: string | null
          quickbooks_request_payload?: Json | null
          quickbooks_response_payload?: Json | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_synced_by?: string | null
          quickbooks_transaction_id?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_quickbooks_synced_by_fkey"
            columns: ["quickbooks_synced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_execution_log: {
        Row: {
          config_used: Json | null
          executed_at: string | null
          executed_by: string | null
          execution_time_ms: number | null
          export_format: string | null
          id: string
          report_id: string | null
          row_count: number | null
        }
        Insert: {
          config_used?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id?: string | null
          row_count?: number | null
        }
        Update: {
          config_used?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id?: string | null
          row_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_execution_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          project_id: string
          revenue_id: string
          split_amount: number
          split_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          revenue_id: string
          split_amount: number
          split_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          revenue_id?: string
          split_amount?: number
          split_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "project_revenues"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          category: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_sms_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          executed_at: string | null
          failure_count: number | null
          id: string
          recipients_count: number | null
          scheduled_sms_id: string | null
          success_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          failure_count?: number | null
          id?: string
          recipients_count?: number | null
          scheduled_sms_id?: string | null
          success_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          failure_count?: number | null
          id?: string
          recipients_count?: number | null
          scheduled_sms_id?: string | null
          success_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sms_logs_scheduled_sms_id_fkey"
            columns: ["scheduled_sms_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sms_messages: {
        Row: {
          created_at: string | null
          created_by: string
          cron_expression: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          link_type: string | null
          link_url: string | null
          message_template: string
          name: string
          project_id: string | null
          schedule_type: string
          scheduled_datetime: string | null
          target_roles: Json | null
          target_type: string
          target_user_ids: Json | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link_type?: string | null
          link_url?: string | null
          message_template: string
          name: string
          project_id?: string | null
          schedule_type: string
          scheduled_datetime?: string | null
          target_roles?: Json | null
          target_type: string
          target_user_ids?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link_type?: string | null
          link_url?: string | null
          message_template?: string
          name?: string
          project_id?: string | null
          schedule_type?: string
          scheduled_datetime?: string | null
          target_roles?: Json | null
          target_type?: string
          target_user_ids?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sms_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sms_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          link_type: string | null
          link_url: string | null
          message_body: string
          project_id: string | null
          recipient_name: string | null
          recipient_phone: string
          recipient_user_id: string | null
          sent_at: string | null
          sent_by: string
          status_checked_at: string | null
          textbelt_http_status: number | null
          textbelt_text_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          message_body: string
          project_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by: string
          status_checked_at?: string | null
          textbelt_http_status?: number | null
          textbelt_text_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          message_body?: string
          project_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by?: string
          status_checked_at?: string | null
          textbelt_http_status?: number | null
          textbelt_text_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      training_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          notification_sent_at: string | null
          priority: number | null
          reminder_sent_at: string | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          priority?: number | null
          reminder_sent_at?: string | null
          training_content_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          priority?: number | null
          reminder_sent_at?: string | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          acknowledged: boolean | null
          completed_at: string | null
          id: string
          notes: string | null
          time_spent_minutes: number | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          time_spent_minutes?: number | null
          training_content_id: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          time_spent_minutes?: number | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_content: {
        Row: {
          content_type: Database["public"]["Enums"]["training_content_type"]
          content_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          embed_code: string | null
          id: string
          is_required: boolean | null
          status: Database["public"]["Enums"]["training_status"] | null
          storage_path: string | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type: Database["public"]["Enums"]["training_content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_required?: boolean | null
          status?: Database["public"]["Enums"]["training_status"] | null
          storage_path?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["training_content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_required?: boolean | null
          status?: Database["public"]["Enums"]["training_status"] | null
          storage_path?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_notifications: {
        Row: {
          delivered: boolean | null
          email_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          delivered?: boolean | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          training_content_id: string
          user_id: string
        }
        Update: {
          delivered?: boolean | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_notifications_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      estimate_financial_summary: {
        Row: {
          contingency_amount: number | null
          contingency_percent: number | null
          created_at: string | null
          cushion_hours_capacity: number | null
          estimate_id: string | null
          estimate_number: string | null
          estimated_gross_margin_percent: number | null
          estimated_gross_profit: number | null
          max_gross_profit_potential: number | null
          max_potential_margin_percent: number | null
          project_id: string | null
          schedule_buffer_percent: number | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          subtotal: number | null
          total_estimated_cost: number | null
          total_labor_actual_cost: number | null
          total_labor_billing_cost: number | null
          total_labor_capacity: number | null
          total_labor_client_price: number | null
          total_labor_cushion: number | null
          total_labor_hours: number | null
          total_with_contingency: number | null
          updated_at: string | null
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
      weekly_labor_hours: {
        Row: {
          approved_entries: number | null
          employee_name: string | null
          employee_number: string | null
          entry_count: number | null
          gross_hours: number | null
          hourly_rate: number | null
          pending_entries: number | null
          rejected_entries: number | null
          total_cost: number | null
          total_hours: number | null
          week_end_saturday: string | null
          week_start_sunday: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_find_client_by_name: {
        Args: { p_search_term: string }
        Returns: {
          client_name: string
          confidence: number
          email: string
          id: string
          match_type: string
          phone: string
        }[]
      }
      ai_get_project_summary: { Args: { p_project_id: string }; Returns: Json }
      ai_resolve_project: {
        Args: { p_search_term: string }
        Returns: {
          client_name: string
          confidence: number
          id: string
          match_type: string
          project_name: string
          project_number: string
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
        }[]
      }
      calculate_contingency_remaining: {
        Args: { project_id_param: string }
        Returns: number
      }
      calculate_estimate_labor_cushion: {
        Args: { p_estimate_id: string }
        Returns: number
      }
      calculate_project_margins: {
        Args: { p_project_id: string }
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
      check_scheduled_sms_cron_job: {
        Args: never
        Returns: {
          command: string
          jobid: number
          schedule: string
        }[]
      }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      create_estimate_version: {
        Args: { new_version_number?: number; source_estimate_id: string }
        Returns: string
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      duplicate_quote_for_estimate: {
        Args: { source_quote_id: string; target_estimate_id: string }
        Returns: string
      }
      execute_ai_query: { Args: { p_query: string }; Returns: Json }
      execute_simple_report: {
        Args: {
          p_data_source: string
          p_filters?: Json
          p_limit?: number
          p_sort_by?: string
          p_sort_dir?: string
        }
        Returns: Json
      }
      generate_estimate_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      generate_quote_number: {
        Args: {
          estimate_id_param?: string
          project_id_param: string
          project_number_param: string
        }
        Returns: string
      }
      generate_work_order_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      get_database_schema: { Args: never; Returns: Json }
      get_next_project_number: { Args: never; Returns: string }
      get_profit_analysis_data: {
        Args: { status_filter?: string[] }
        Returns: {
          accepted_quote_count: number
          actual_margin: number
          adjusted_est_costs: number
          adjusted_est_margin: number
          budget_utilization_percent: number
          change_order_cost: number
          change_order_count: number
          change_order_revenue: number
          client_name: string
          contingency_amount: number
          contingency_remaining: number
          contingency_used: number
          contracted_amount: number
          cost_variance: number
          cost_variance_percent: number
          current_margin: number
          end_date: string
          expenses_by_category: Json
          id: string
          invoice_count: number
          job_type: string
          margin_percentage: number
          original_est_costs: number
          original_margin: number
          project_name: string
          project_number: string
          projected_margin: number
          start_date: string
          status: string
          total_accepted_quotes: number
          total_expenses: number
          total_invoiced: number
        }[]
      }
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
      get_project_revenue_total: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_scheduled_sms_recipients: {
        Args: {
          p_target_roles: Json
          p_target_type: string
          p_target_user_ids: Json
        }
        Returns: {
          full_name: string
          phone: string
          user_id: string
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
          is_active: boolean
          last_active_at: string
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
      log_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_project_id: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_estimate_labor_cushion: {
        Args: { p_estimate_id: string }
        Returns: number
      }
      rollback_cost_migration_final: { Args: never; Returns: undefined }
      safe_cast_to_expense_category: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["expense_category"]
      }
      safe_cast_to_project_status: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["project_status"]
      }
      safe_cast_to_quote_status: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["quote_status"]
      }
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
        | "tools"
        | "software"
        | "vehicle_maintenance"
        | "gas"
        | "meals"
      project_category: "construction" | "system" | "overhead"
      project_status:
        | "estimating"
        | "approved"
        | "in_progress"
        | "complete"
        | "on_hold"
        | "cancelled"
      project_type: "construction_project" | "work_order"
      quote_status: "pending" | "accepted" | "rejected" | "expired"
      sync_status: "success" | "failed" | "pending"
      sync_type: "import" | "export"
      training_content_type:
        | "video_link"
        | "video_embed"
        | "document"
        | "presentation"
        | "external_link"
      training_status: "draft" | "published" | "archived"
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
        "tools",
        "software",
        "vehicle_maintenance",
        "gas",
        "meals",
      ],
      project_category: ["construction", "system", "overhead"],
      project_status: [
        "estimating",
        "approved",
        "in_progress",
        "complete",
        "on_hold",
        "cancelled",
      ],
      project_type: ["construction_project", "work_order"],
      quote_status: ["pending", "accepted", "rejected", "expired"],
      sync_status: ["success", "failed", "pending"],
      sync_type: ["import", "export"],
      training_content_type: [
        "video_link",
        "video_embed",
        "document",
        "presentation",
        "external_link",
      ],
      training_status: ["draft", "published", "archived"],
      transaction_type: ["expense", "bill", "check", "credit_card", "cash"],
    },
  },
} as const
