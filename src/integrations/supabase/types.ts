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
      abandoned_checkouts: {
        Row: {
          cart_items: Json
          checkout_session_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          last_step: string
          recovered_at: string | null
          recovery_status: string
          route_type: string
          session_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cart_items?: Json
          checkout_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_step?: string
          recovered_at?: string | null
          recovery_status?: string
          route_type: string
          session_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cart_items?: Json
          checkout_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_step?: string
          recovered_at?: string | null
          recovery_status?: string
          route_type?: string
          session_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_checkouts_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_checkouts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          metadata: Json
          store_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          store_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          store_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["admin_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["admin_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generation_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          product_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_project_reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mode: string
          report_json: Json
          selected_scope: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          report_json?: Json
          selected_scope?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          report_json?: Json
          selected_scope?: string
        }
        Relationships: []
      }
      ai_system_reports: {
        Row: {
          alerts: Json | null
          analysis_text: string | null
          comparison_json: Json | null
          created_at: string | null
          id: string
          metrics_json: Json | null
          report_date: string
          suggestions: Json | null
        }
        Insert: {
          alerts?: Json | null
          analysis_text?: string | null
          comparison_json?: Json | null
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          report_date: string
          suggestions?: Json | null
        }
        Update: {
          alerts?: Json | null
          analysis_text?: string | null
          comparison_json?: Json | null
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          report_date?: string
          suggestions?: Json | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      best_conversations: {
        Row: {
          chat_session_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "best_conversations_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: true
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_product_interpretation: {
        Row: {
          ai_image_prompt: string | null
          created_at: string
          description: string | null
          id: string
          image_acceptance_terms: Json
          image_rejection_terms: Json
          interpretation: Json
          product_name: string
          product_name_hash: string
          search_queries_layered: Json
          technical_sheet: Json
        }
        Insert: {
          ai_image_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_acceptance_terms?: Json
          image_rejection_terms?: Json
          interpretation?: Json
          product_name: string
          product_name_hash: string
          search_queries_layered?: Json
          technical_sheet?: Json
        }
        Update: {
          ai_image_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_acceptance_terms?: Json
          image_rejection_terms?: Json
          interpretation?: Json
          product_name?: string
          product_name_hash?: string
          search_queries_layered?: Json
          technical_sheet?: Json
        }
        Relationships: []
      }
      chat_insights: {
        Row: {
          chat_session_id: string
          created_at: string
          id: string
          insight_json: Json
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          id?: string
          insight_json?: Json
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          id?: string
          insight_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chat_insights_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_session_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_session_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_session_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          last_path: string | null
          score_snapshot: number
          session_token: string
          started_at: string
          updated_at: string
          visitor_session_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          last_path?: string | null
          score_snapshot?: number
          session_token: string
          started_at?: string
          updated_at?: string
          visitor_session_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          last_path?: string | null
          score_snapshot?: number
          session_token?: string
          started_at?: string
          updated_at?: string
          visitor_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_visitor_session_id_fkey"
            columns: ["visitor_session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          cart_items: Json
          cep: string | null
          complemento: string | null
          consent_given: boolean
          created_at: string
          customer_id: string | null
          email: string | null
          endereco: string | null
          id: string
          ip: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          route_type: string
          session_id: string
          subtotal: number
          telefone: string
          total: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          cart_items?: Json
          cep?: string | null
          complemento?: string | null
          consent_given?: boolean
          created_at?: string
          customer_id?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          ip?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          route_type: string
          session_id: string
          subtotal?: number
          telefone: string
          total?: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          cart_items?: Json
          cep?: string | null
          complemento?: string | null
          consent_given?: boolean
          created_at?: string
          customer_id?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          ip?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          route_type?: string
          session_id?: string
          subtotal?: number
          telefone?: string
          total?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_catalog_products: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          id: string
          legacy_id: string | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      construction_quotations: {
        Row: {
          company_info_json: Json
          created_at: string
          customer_json: Json
          delivery_date: string
          discount: number
          freight: number
          id: string
          items_json: Json
          number: string
          observations: string
          payment_method: string
          show_client_data: boolean
          status: string
          subtotal: number
          total: number
          updated_at: string
          validity: string
        }
        Insert: {
          company_info_json?: Json
          created_at?: string
          customer_json?: Json
          delivery_date?: string
          discount?: number
          freight?: number
          id?: string
          items_json?: Json
          number: string
          observations?: string
          payment_method?: string
          show_client_data?: boolean
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          validity?: string
        }
        Update: {
          company_info_json?: Json
          created_at?: string
          customer_json?: Json
          delivery_date?: string
          discount?: number
          freight?: number
          id?: string
          items_json?: Json
          number?: string
          observations?: string
          payment_method?: string
          show_client_data?: boolean
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          validity?: string
        }
        Relationships: []
      }
      cookie_consent: {
        Row: {
          accepted_at: string
          consent: string
          created_at: string
          id: string
          ip_hash: string | null
          session_token: string
          user_agent_hash: string | null
        }
        Insert: {
          accepted_at?: string
          consent: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_token: string
          user_agent_hash?: string | null
        }
        Update: {
          accepted_at?: string
          consent?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_token?: string
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          address_line: string | null
          cep: string | null
          cpf_cnpj: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address_line?: string | null
          cep?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          address_line?: string | null
          cep?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      customer_sessions: {
        Row: {
          consent_given: boolean
          created_at: string
          customer_id: string | null
          id: string
          is_persistent: boolean
          last_seen_at: string
          route_type: string
          session_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          customer_id?: string | null
          id?: string
          is_persistent?: boolean
          last_seen_at?: string
          route_type?: string
          session_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          customer_id?: string | null
          id?: string
          is_persistent?: boolean
          last_seen_at?: string
          route_type?: string
          session_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          name: string | null
          phone: string
          phone_normalized: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          phone: string
          phone_normalized: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          phone?: string
          phone_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      fortlev_catalog_products: {
        Row: {
          active: boolean
          base_price: number
          capacity: number
          created_at: string
          diameter: string
          height: string
          id: string
          legacy_id: string | null
          name: string
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          capacity?: number
          created_at?: string
          diameter?: string
          height?: string
          id?: string
          legacy_id?: string | null
          name: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          capacity?: number
          created_at?: string
          diameter?: string
          height?: string
          id?: string
          legacy_id?: string | null
          name?: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      fortlev_quotations: {
        Row: {
          branding_json: Json | null
          company_info_json: Json
          created_at: string
          customer_json: Json
          delivery_time: string
          discount: number
          freight: number
          id: string
          items_json: Json
          number: string
          observations: string
          payment_conditions_json: Json
          show_client_data: boolean
          status: string
          subtotal: number
          taxes_json: Json | null
          total: number
          updated_at: string
          validity: string
        }
        Insert: {
          branding_json?: Json | null
          company_info_json?: Json
          created_at?: string
          customer_json?: Json
          delivery_time?: string
          discount?: number
          freight?: number
          id?: string
          items_json?: Json
          number: string
          observations?: string
          payment_conditions_json?: Json
          show_client_data?: boolean
          status?: string
          subtotal?: number
          taxes_json?: Json | null
          total?: number
          updated_at?: string
          validity?: string
        }
        Update: {
          branding_json?: Json | null
          company_info_json?: Json
          created_at?: string
          customer_json?: Json
          delivery_time?: string
          discount?: number
          freight?: number
          id?: string
          items_json?: Json
          number?: string
          observations?: string
          payment_conditions_json?: Json
          show_client_data?: boolean
          status?: string
          subtotal?: number
          taxes_json?: Json | null
          total?: number
          updated_at?: string
          validity?: string
        }
        Relationships: []
      }
      home_benefits: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_departments: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          icon: string | null
          id: string
          kind: string
          label: string
          link_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          label: string
          link_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          label?: string
          link_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_departments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      home_footer: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          extra_note: string | null
          facebook_url: string | null
          hours: string | null
          id: string
          instagram_url: string | null
          key: string
          logo_path: string | null
          store_name: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          extra_note?: string | null
          facebook_url?: string | null
          hours?: string | null
          id?: string
          instagram_url?: string | null
          key?: string
          logo_path?: string | null
          store_name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          extra_note?: string | null
          facebook_url?: string | null
          hours?: string | null
          id?: string
          instagram_url?: string | null
          key?: string
          logo_path?: string | null
          store_name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      home_offers: {
        Row: {
          active: boolean
          badge_text: string | null
          created_at: string
          ends_at: string | null
          id: string
          product_id: string
          promo_price: number | null
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          product_id: string
          promo_price?: number | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          product_id?: string
          promo_price?: number | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      home_policies: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          id: string
          sort_order: number
          subtitle_override: string | null
          title_override: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          id?: string
          sort_order?: number
          subtitle_override?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          subtitle_override?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_sections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      home_seo: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          meta_description: string | null
          meta_title: string | null
          og_image_path: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_path?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      image_import_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          images_found: number
          images_saved: number
          processing_time: number
          product_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          images_found?: number
          images_saved?: number
          processing_time?: number
          product_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          images_found?: number
          images_saved?: number
          processing_time?: number
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_import_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      image_review_queue: {
        Row: {
          ai_analysis: string | null
          confidence: number | null
          created_at: string | null
          id: string
          image_path: string | null
          image_url: string
          product_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_path?: string | null
          image_url: string
          product_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string
          product_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_review_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_api_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      payment_blacklist: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      payment_checkouts: {
        Row: {
          allowed_methods: string[] | null
          checkout_url: string | null
          config_json: Json
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          description: string | null
          expires_at: string | null
          gateway_id: string | null
          id: string
          name: string
          price: number
          product_id: string | null
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          allowed_methods?: string[] | null
          checkout_url?: string | null
          config_json?: Json
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          description?: string | null
          expires_at?: string | null
          gateway_id?: string | null
          id?: string
          name: string
          price?: number
          product_id?: string | null
          status?: string
          template?: string
          updated_at?: string
        }
        Update: {
          allowed_methods?: string[] | null
          checkout_url?: string | null
          config_json?: Json
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          description?: string | null
          expires_at?: string | null
          gateway_id?: string | null
          id?: string
          name?: string
          price?: number
          product_id?: string | null
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_checkouts_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_fraud_rules: {
        Row: {
          config_json: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          api_key_encrypted: string | null
          api_url: string | null
          config_json: Json
          created_at: string
          id: string
          mode: string | null
          name: string
          provider: string
          rate_fixed: number | null
          rate_percent: number | null
          secret_key_encrypted: string | null
          status: string
          supported_currencies: string[] | null
          supported_methods: string[] | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_url?: string | null
          config_json?: Json
          created_at?: string
          id?: string
          mode?: string | null
          name: string
          provider?: string
          rate_fixed?: number | null
          rate_percent?: number | null
          secret_key_encrypted?: string | null
          status?: string
          supported_currencies?: string[] | null
          supported_methods?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_url?: string | null
          config_json?: Json
          created_at?: string
          id?: string
          mode?: string | null
          name?: string
          provider?: string
          rate_fixed?: number | null
          rate_percent?: number | null
          secret_key_encrypted?: string | null
          status?: string
          supported_currencies?: string[] | null
          supported_methods?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          created_at: string | null
          direction: string | null
          duration_ms: number | null
          gateway_id: string | null
          id: string
          method: string | null
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          duration_ms?: number | null
          gateway_id?: string | null
          id?: string
          method?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          duration_ms?: number | null
          gateway_id?: string | null
          id?: string
          method?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods_config: {
        Row: {
          config_json: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          method: string
          updated_at: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method: string
          updated_at?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_subscriptions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          gateway_id: string | null
          id: string
          next_billing_at: string | null
          plan_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          gateway_id?: string | null
          id?: string
          next_billing_at?: string | null
          plan_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          gateway_id?: string | null
          id?: string
          next_billing_at?: string | null
          plan_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_subscriptions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          external_id: string | null
          gateway_id: string | null
          id: string
          metadata_json: Json
          method: string
          order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata_json?: Json
          method?: string
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata_json?: Json
          method?: string
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json
          response_code: number | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json
          response_code?: number | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          response_code?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          avg_time_ms: number
          completed: number
          created_at: string
          descriptions_generated: number
          duration_ms: number
          ended_at: string | null
          error_product_ids: Json
          errors: number
          filter_used: string
          id: string
          images_imported: number
          pending_product_ids: Json
          processed_product_ids: Json
          started_at: string
          status: string
          total_products: number
          updated_at: string
          worker_count: number
        }
        Insert: {
          avg_time_ms?: number
          completed?: number
          created_at?: string
          descriptions_generated?: number
          duration_ms?: number
          ended_at?: string | null
          error_product_ids?: Json
          errors?: number
          filter_used?: string
          id?: string
          images_imported?: number
          pending_product_ids?: Json
          processed_product_ids?: Json
          started_at?: string
          status?: string
          total_products?: number
          updated_at?: string
          worker_count?: number
        }
        Update: {
          avg_time_ms?: number
          completed?: number
          created_at?: string
          descriptions_generated?: number
          duration_ms?: number
          ended_at?: string | null
          error_product_ids?: Json
          errors?: number
          filter_used?: string
          id?: string
          images_imported?: number
          pending_product_ids?: Json
          processed_product_ids?: Json
          started_at?: string
          status?: string
          total_products?: number
          updated_at?: string
          worker_count?: number
        }
        Relationships: []
      }
      price_intelligence: {
        Row: {
          categoria: string
          created_at: string
          id: string
          preco_max: number
          preco_medio: number
          preco_min: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          preco_max?: number
          preco_medio?: number
          preco_min?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          preco_max?: number
          preco_medio?: number
          preco_min?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_ai_previews: {
        Row: {
          approved: boolean
          approved_at: string | null
          created_at: string
          generated_comments_json: Json
          generated_description: string | null
          generated_images_json: Json
          id: string
          product_id: string
          version: number
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          generated_comments_json?: Json
          generated_description?: string | null
          generated_images_json?: Json
          id?: string
          product_id: string
          version?: number
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          generated_comments_json?: Json
          generated_description?: string | null
          generated_images_json?: Json
          id?: string
          product_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ai_previews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_comments: {
        Row: {
          author_name: string
          comment_text: string
          created_at: string
          id: string
          product_id: string
          rating: number
        }
        Insert: {
          author_name: string
          comment_text: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
        }
        Update: {
          author_name?: string
          comment_text?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rating_summary: {
        Row: {
          average_rating: number
          product_id: string
          rating_1: number
          rating_2: number
          rating_3: number
          rating_4: number
          rating_5: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          average_rating?: number
          product_id: string
          rating_1?: number
          rating_2?: number
          rating_3?: number
          rating_4?: number
          rating_5?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          average_rating?: number
          product_id?: string
          rating_1?: number
          rating_2?: number
          rating_3?: number
          rating_4?: number
          rating_5?: number
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_rating_summary_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendations: {
        Row: {
          created_at: string
          id: string
          product_id: string
          recommended_product_id: string
          score: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          recommended_product_id: string
          score?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          recommended_product_id?: string
          score?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recommendations_recommended_product_id_fkey"
            columns: ["recommended_product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved: boolean
          author_location: string | null
          author_name: string
          cons: string | null
          content: string
          created_at: string
          helpful_count: number
          id: string
          origin: string
          product_id: string
          pros: string | null
          rating: number
          title: string | null
          updated_at: string
          verified_purchase: boolean
        }
        Insert: {
          approved?: boolean
          author_location?: string | null
          author_name?: string
          cons?: string | null
          content?: string
          created_at?: string
          helpful_count?: number
          id?: string
          origin?: string
          product_id: string
          pros?: string | null
          rating?: number
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Update: {
          approved?: boolean
          author_location?: string | null
          author_name?: string
          cons?: string | null
          content?: string
          created_at?: string
          helpful_count?: number
          id?: string
          origin?: string
          product_id?: string
          pros?: string | null
          rating?: number
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      review_image_pool: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          source: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          source?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          source?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_image_pool_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          review_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          review_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          review_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_daily_engine: {
        Row: {
          created_at: string
          enabled: boolean
          end_hour: number
          id: string
          image_percentage: number
          max_reviews_per_day: number
          max_reviews_per_product: number
          max_total_per_product: number
          min_reviews_per_day: number
          start_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          end_hour?: number
          id?: string
          image_percentage?: number
          max_reviews_per_day?: number
          max_reviews_per_product?: number
          max_total_per_product?: number
          min_reviews_per_day?: number
          start_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          end_hour?: number
          id?: string
          image_percentage?: number
          max_reviews_per_day?: number
          max_reviews_per_product?: number
          max_total_per_product?: number
          min_reviews_per_day?: number
          start_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews_daily_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          images_attached: number
          products_covered: number
          reviews_generated: number
          run_date: string
          status: string
          target_count: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          images_attached?: number
          products_covered?: number
          reviews_generated?: number
          run_date?: string
          status?: string
          target_count?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          images_attached?: number
          products_covered?: number
          reviews_generated?: number
          run_date?: string
          status?: string
          target_count?: number
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quotation_id: string
          sold_at: string
          store: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quotation_id: string
          sold_at?: string
          store: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quotation_id?: string
          sold_at?: string
          store?: string
          value?: number
        }
        Relationships: []
      }
      scrape_history: {
        Row: {
          created_at: string
          domains: string[] | null
          execution_time_seconds: number
          id: string
          products_json: Json
          status: string
          total_pages: number
          total_products: number
          total_urls: number
        }
        Insert: {
          created_at?: string
          domains?: string[] | null
          execution_time_seconds?: number
          id?: string
          products_json?: Json
          status?: string
          total_pages?: number
          total_products?: number
          total_urls?: number
        }
        Update: {
          created_at?: string
          domains?: string[] | null
          execution_time_seconds?: number
          id?: string
          products_json?: Json
          status?: string
          total_pages?: number
          total_products?: number
          total_urls?: number
        }
        Relationships: []
      }
      search_cache: {
        Row: {
          created_at: string
          id: string
          images_json: Json
          query: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          images_json?: Json
          query: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          images_json?: Json
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_image_usage: {
        Row: {
          created_at: string
          id: string
          searches_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          searches_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          searches_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_rules: {
        Row: {
          active: boolean
          created_at: string
          formula_description: string
          id: string
          max_distance_km: number
          max_weight_kg: number
          min_freight: number
          rate_per_km: number
          rate_percent: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          formula_description?: string
          id?: string
          max_distance_km?: number
          max_weight_kg?: number
          min_freight?: number
          rate_per_km?: number
          rate_percent?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          formula_description?: string
          id?: string
          max_distance_km?: number
          max_weight_kg?: number
          min_freight?: number
          rate_per_km?: number
          rate_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          id: string
          max_km: number
          min_km: number
          name: string
          per_km_price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          created_at?: string
          id?: string
          max_km?: number
          min_km?: number
          name: string
          per_km_price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          id?: string
          max_km?: number
          min_km?: number
          name?: string
          per_km_price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_apps: {
        Row: {
          active: boolean
          app_name: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          store_id: string
          updated_at: string
          version: string | null
        }
        Insert: {
          active?: boolean
          app_name?: string
          created_at?: string
          file_name?: string
          file_path: string
          file_size?: number | null
          id?: string
          store_id: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          active?: boolean
          app_name?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          store_id?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_apps_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_banners: {
        Row: {
          active: boolean
          button_label: string | null
          created_at: string
          id: string
          image_desktop_path: string | null
          image_mobile_path: string | null
          image_path: string | null
          is_active: boolean | null
          link: string | null
          link_url: string | null
          position: number | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          button_label?: string | null
          created_at?: string
          id?: string
          image_desktop_path?: string | null
          image_mobile_path?: string | null
          image_path?: string | null
          is_active?: boolean | null
          link?: string | null
          link_url?: string | null
          position?: number | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          button_label?: string | null
          created_at?: string
          id?: string
          image_desktop_path?: string | null
          image_mobile_path?: string | null
          image_path?: string | null
          is_active?: boolean | null
          link?: string | null
          link_url?: string | null
          position?: number | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_path: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_path?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_path?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_coupons: {
        Row: {
          active: boolean
          category_id: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          min_subtotal: number
          product_id: string | null
          starts_at: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          code: string
          created_at?: string
          discount_type: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          category_id?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal?: number
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_coupons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_customers: {
        Row: {
          address: string | null
          cep: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          store_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          store_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          store_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_offers: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          name: string
          priority: number
          product_id: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          name: string
          priority?: number
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          name?: string
          priority?: number
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          name_snapshot: string
          order_id: string
          price_snapshot: number
          product_id: string | null
          quantity: number
          unit_snapshot: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          name_snapshot: string
          order_id: string
          price_snapshot?: number
          product_id?: string | null
          quantity?: number
          unit_snapshot?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          name_snapshot?: string
          order_id?: string
          price_snapshot?: number
          product_id?: string | null
          quantity?: number
          unit_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_tracking: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          address: string | null
          cep: string | null
          checkout_mode: string
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          shipping: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          whatsapp_sent: boolean
        }
        Insert: {
          address?: string | null
          cep?: string | null
          checkout_mode?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Update: {
          address?: string | null
          cep?: string | null
          checkout_mode?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          content_md: string
          created_at: string
          id: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          modules: string[]
          name: string
          price_monthly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          modules?: string[]
          name: string
          price_monthly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          modules?: string[]
          name?: string
          price_monthly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_product_images: {
        Row: {
          created_at: string
          id: string
          path: string
          product_id: string
          sort_order: number
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          product_id: string
          sort_order?: number
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          product_id?: string
          sort_order?: number
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          active: boolean
          best_seller: boolean
          category: string | null
          category_id: string | null
          clicks: number
          created_at: string
          description: string | null
          discount_percentage: number
          featured: boolean
          id: string
          is_promotion: boolean
          min_stock: number
          name: string
          price: number
          promo_price: number
          promotion_limit_per_customer: number | null
          sales: number
          sku: string | null
          source_id: string | null
          status: string
          stock: number
          unit: string | null
          updated_at: string
          views: number
        }
        Insert: {
          active?: boolean
          best_seller?: boolean
          category?: string | null
          category_id?: string | null
          clicks?: number
          created_at?: string
          description?: string | null
          discount_percentage?: number
          featured?: boolean
          id?: string
          is_promotion?: boolean
          min_stock?: number
          name: string
          price?: number
          promo_price?: number
          promotion_limit_per_customer?: number | null
          sales?: number
          sku?: string | null
          source_id?: string | null
          status?: string
          stock?: number
          unit?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          active?: boolean
          best_seller?: boolean
          category?: string | null
          category_id?: string | null
          clicks?: number
          created_at?: string
          description?: string | null
          discount_percentage?: number
          featured?: boolean
          id?: string
          is_promotion?: boolean
          min_stock?: number
          name?: string
          price?: number
          promo_price?: number
          promotion_limit_per_customer?: number | null
          sales?: number
          sku?: string | null
          source_id?: string | null
          status?: string
          stock?: number
          unit?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean
          created_at: string
          domain: string | null
          favicon_path: string | null
          id: string
          name: string
          owner_id: string | null
          plan_id: string | null
          segment: string | null
          slug: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain?: string | null
          favicon_path?: string | null
          id?: string
          name: string
          owner_id?: string | null
          plan_id?: string | null
          segment?: string | null
          slug: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string | null
          favicon_path?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          plan_id?: string | null
          segment?: string | null
          slug?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "store_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          frequency: string
          gateway_id: string | null
          id: string
          name: string
          price: number
          status: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frequency?: string
          gateway_id?: string | null
          id?: string
          name: string
          price?: number
          status?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frequency?: string
          gateway_id?: string | null
          id?: string
          name?: string
          price?: number
          status?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      system_event_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          level: string
          message: string
          metadata: Json
          source: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          level?: string
          message: string
          metadata?: Json
          source: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
          source?: string
        }
        Relationships: []
      }
      system_memory: {
        Row: {
          created_at: string | null
          details: Json | null
          entity: string | null
          entity_id: string | null
          event: string
          id: string
          impact: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          event: string
          id?: string
          impact?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          event?: string
          id?: string
          impact?: string | null
        }
        Relationships: []
      }
      system_theme_settings: {
        Row: {
          accent_color: string
          accent_hover: string
          background_color: string
          border_color: string
          created_at: string
          id: string
          primary_color: string
          primary_hover: string
          surface_color: string
          text_primary: string
          text_secondary: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          accent_hover?: string
          background_color?: string
          border_color?: string
          created_at?: string
          id?: string
          primary_color?: string
          primary_hover?: string
          surface_color?: string
          text_primary?: string
          text_secondary?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          accent_hover?: string
          background_color?: string
          border_color?: string
          created_at?: string
          id?: string
          primary_color?: string
          primary_hover?: string
          surface_color?: string
          text_primary?: string
          text_secondary?: string
          updated_at?: string
        }
        Relationships: []
      }
      talent_applications: {
        Row: {
          area_of_interest: string
          created_at: string
          email: string
          experience: string | null
          full_name: string
          id: string
          metadata: Json
          notes: string | null
          phone: string
          resume_path: string | null
          status: string
        }
        Insert: {
          area_of_interest: string
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          id?: string
          metadata?: Json
          notes?: string | null
          phone: string
          resume_path?: string | null
          status?: string
        }
        Update: {
          area_of_interest?: string
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          metadata?: Json
          notes?: string | null
          phone?: string
          resume_path?: string | null
          status?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          metadata: Json
          path: string | null
          product_id: string | null
          session_id: string
          type: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_id: string
          type: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          device: string
          first_seen_at: string
          id: string
          last_seen_at: string
          score: number
          scroll_depth: number
          session_token: string
          source: string
          temperature: string
          total_clicks: number
          total_pages: number
          total_time_seconds: number
          user_id: string | null
        }
        Insert: {
          device?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          score?: number
          scroll_depth?: number
          session_token: string
          source?: string
          temperature?: string
          total_clicks?: number
          total_pages?: number
          total_time_seconds?: number
          user_id?: string | null
        }
        Update: {
          device?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          score?: number
          scroll_depth?: number
          session_token?: string
          source?: string
          temperature?: string
          total_clicks?: number
          total_pages?: number
          total_time_seconds?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          session_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          session_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          page: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device: string
          first_seen_at: string
          id: string
          last_seen_at: string
          score: number
          scroll_depth: number
          session_id: string
          source: string
          status: string
          temperature: string
          total_clicks: number
          total_pages: number
          total_time_seconds: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          score?: number
          scroll_depth?: number
          session_id: string
          source?: string
          status?: string
          temperature?: string
          total_clicks?: number
          total_pages?: number
          total_time_seconds?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          score?: number
          scroll_depth?: number
          session_id?: string
          source?: string
          status?: string
          temperature?: string
          total_clicks?: number
          total_pages?: number
          total_time_seconds?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_store_access: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_events: {
        Row: {
          category_id: string | null
          created_at: string
          duration: number | null
          event_name: string
          id: string
          metadata: Json
          path: string | null
          product_id: string | null
          session_id: string
          type: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          duration?: number | null
          event_name: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_id: string
          type?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          duration?: number | null
          event_name?: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_id?: string
          type?: string | null
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          consent_given: boolean
          counters: Json
          country: string | null
          created_at: string
          ended_at: string | null
          id: string
          ip: string | null
          referrer: string | null
          score: number
          score_flags: Json
          session_token: string
          started_at: string
          total_time: number
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          consent_given?: boolean
          counters?: Json
          country?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          referrer?: string | null
          score?: number
          score_flags?: Json
          session_token: string
          started_at?: string
          total_time?: number
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          consent_given?: boolean
          counters?: Json
          country?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          ip?: string | null
          referrer?: string | null
          score?: number
          score_flags?: Json
          session_token?: string
          started_at?: string
          total_time?: number
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      visitor_tracking: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          path: string | null
          product_id: string | null
          session_token: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_token: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          path?: string | null
          product_id?: string | null
          session_token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_plan_permissions: {
        Args: { _plan_id: string; _store_id: string }
        Returns: undefined
      }
      bulk_import_products: { Args: { _data: Json }; Returns: number }
      check_rate_limit: {
        Args: {
          _event_type: string
          _key: string
          _max_hits: number
          _window_seconds: number
        }
        Returns: boolean
      }
      classify_user_session_status: {
        Args: { _score: number }
        Returns: string
      }
      count_products_for_ai_generation: { Args: never; Returns: number }
      create_store_order: {
        Args: {
          _address: string
          _cep: string
          _checkout_mode: string
          _coupon_code?: string
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _lines: Json
          _notes: string
        }
        Returns: {
          discount: number
          order_id: string
          shipping: number
          subtotal: number
          total: number
        }[]
      }
      get_admin_role: { Args: { _user_id: string }; Returns: string }
      get_products_for_ai_generation: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      init_store_permissions: {
        Args: { _store_id: string }
        Returns: undefined
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      recalculate_rating_summary: {
        Args: { _product_id: string }
        Returns: undefined
      }
      upsert_checkout_session: {
        Args: {
          _cart_items: Json
          _cep: string
          _complemento: string
          _consent_given: boolean
          _email: string
          _endereco: string
          _ip: string
          _is_persistent: boolean
          _last_step?: string
          _nome: string
          _numero: string
          _observacoes: string
          _route_type: string
          _session_id: string
          _subtotal: number
          _telefone: string
          _total: number
          _user_agent: string
        }
        Returns: {
          checkout_session_id: string
          customer_id: string
          session_id: string
        }[]
      }
      validate_coupon: {
        Args: {
          _category_id: string
          _code: string
          _product_id: string
          _subtotal: number
        }
        Returns: {
          discount: number
          message: string
          ok: boolean
        }[]
      }
      validate_coupon_cart: {
        Args: { _code: string; _lines: Json; _subtotal: number }
        Returns: {
          discount: number
          eligible_subtotal: number
          message: string
          ok: boolean
        }[]
      }
    }
    Enums: {
      admin_role: "master" | "admin" | "operator" | "gerente" | "visualizador"
      app_role: "admin"
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
      admin_role: ["master", "admin", "operator", "gerente", "visualizador"],
      app_role: ["admin"],
    },
  },
} as const
