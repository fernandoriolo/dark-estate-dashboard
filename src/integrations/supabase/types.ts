﻿export type Json =
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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_users: number | null
          name: string
          phone: string | null
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          name: string
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_users?: number | null
          name?: string
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_active: boolean | null
          name: string
          template_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_address: string | null
          client_cpf: string | null
          client_email: string | null
          client_id: string | null
          client_marital_status: string | null
          client_name: string
          client_nationality: string | null
          client_phone: string | null
          company_id: string | null
          contract_city: string | null
          contract_duration: string | null
          contract_file_name: string | null
          contract_file_path: string | null
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          data_fim: string
          data_inicio: string
          guarantor_address: string | null
          guarantor_cpf: string | null
          guarantor_email: string | null
          guarantor_marital_status: string | null
          guarantor_name: string | null
          guarantor_nationality: string | null
          guarantor_phone: string | null
          id: string
          is_active: boolean | null
          landlord_address: string | null
          landlord_cpf: string | null
          landlord_email: string | null
          landlord_marital_status: string | null
          landlord_name: string | null
          landlord_nationality: string | null
          landlord_phone: string | null
          numero: string
          payment_day: string | null
          payment_method: string | null
          property_address: string
          property_area: number | null
          property_city: string | null
          property_id: string | null
          property_state: string | null
          property_title: string
          property_type: string | null
          property_zip_code: string | null
          proximo_vencimento: string | null
          status: string | null
          template_id: string | null
          template_name: string
          tipo: string
          updated_at: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          client_address?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_id?: string | null
          client_marital_status?: string | null
          client_name: string
          client_nationality?: string | null
          client_phone?: string | null
          company_id?: string | null
          contract_city?: string | null
          contract_duration?: string | null
          contract_file_name?: string | null
          contract_file_path?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_fim: string
          data_inicio: string
          guarantor_address?: string | null
          guarantor_cpf?: string | null
          guarantor_email?: string | null
          guarantor_marital_status?: string | null
          guarantor_name?: string | null
          guarantor_nationality?: string | null
          guarantor_phone?: string | null
          id?: string
          is_active?: boolean | null
          landlord_address?: string | null
          landlord_cpf?: string | null
          landlord_email?: string | null
          landlord_marital_status?: string | null
          landlord_name?: string | null
          landlord_nationality?: string | null
          landlord_phone?: string | null
          numero: string
          payment_day?: string | null
          payment_method?: string | null
          property_address: string
          property_area?: number | null
          property_city?: string | null
          property_id?: string | null
          property_state?: string | null
          property_title: string
          property_type?: string | null
          property_zip_code?: string | null
          proximo_vencimento?: string | null
          status?: string | null
          template_id?: string | null
          template_name: string
          tipo: string
          updated_at?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          client_address?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_id?: string | null
          client_marital_status?: string | null
          client_name?: string
          client_nationality?: string | null
          client_phone?: string | null
          company_id?: string | null
          contract_city?: string | null
          contract_duration?: string | null
          contract_file_name?: string | null
          contract_file_path?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_fim?: string
          data_inicio?: string
          guarantor_address?: string | null
          guarantor_cpf?: string | null
          guarantor_email?: string | null
          guarantor_marital_status?: string | null
          guarantor_name?: string | null
          guarantor_nationality?: string | null
          guarantor_phone?: string | null
          id?: string
          is_active?: boolean | null
          landlord_address?: string | null
          landlord_cpf?: string | null
          landlord_email?: string | null
          landlord_marital_status?: string | null
          landlord_name?: string | null
          landlord_nationality?: string | null
          landlord_phone?: string | null
          numero?: string
          payment_day?: string | null
          payment_method?: string | null
          property_address?: string
          property_area?: number | null
          property_city?: string | null
          property_id?: string | null
          property_state?: string | null
          property_title?: string
          property_type?: string | null
          property_zip_code?: string | null
          proximo_vencimento?: string | null
          status?: string | null
          template_id?: string | null
          template_name?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imoveisvivareal: {
        Row: {
          andar: number | null
          ano_construcao: number | null
          bairro: string | null
          banheiros: number | null
          blocos: number | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string | null
          descricao: string | null
          endereco: string | null
          features: string[] | null
          garagem: number | null
          id: number
          imagens: string[] | null
          listing_id: string | null
          numero: string | null
          preco: number | null
          quartos: number | null
          suite: number | null
          tamanho_m2: number | null
          tipo_categoria: string | null
          tipo_imovel: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          andar?: number | null
          ano_construcao?: number | null
          bairro?: string | null
          banheiros?: number | null
          blocos?: number | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string | null
          descricao?: string | null
          endereco?: string | null
          features?: string[] | null
          garagem?: number | null
          id?: number
          imagens?: string[] | null
          listing_id?: string | null
          numero?: string | null
          preco?: number | null
          quartos?: number | null
          suite?: number | null
          tamanho_m2?: number | null
          tipo_categoria?: string | null
          tipo_imovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          andar?: number | null
          ano_construcao?: number | null
          bairro?: string | null
          banheiros?: number | null
          blocos?: number | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string | null
          descricao?: string | null
          endereco?: string | null
          features?: string[] | null
          garagem?: number | null
          id?: number
          imagens?: string[] | null
          listing_id?: string | null
          numero?: string | null
          preco?: number | null
          quartos?: number | null
          suite?: number | null
          tamanho_m2?: number | null
          tipo_categoria?: string | null
          tipo_imovel?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveisvivareal_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveisvivareal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado_civil: string | null
          estimated_value: number | null
          id: string
          imovel_interesse: string | null
          interest: string | null
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          property_id: string | null
          source: string
          stage: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          estimated_value?: number | null
          id?: string
          imovel_interesse?: string | null
          interest?: string | null
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          source: string
          stage?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          estimated_value?: number | null
          id?: string
          imovel_interesse?: string | null
          interest?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          source?: string
          stage?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          area: number
          bathrooms: number | null
          bedrooms: number | null
          city: string
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          price: number
          property_purpose: string | null
          proprietario_cpf: string | null
          proprietario_email: string | null
          proprietario_endereco: string | null
          proprietario_estado_civil: string | null
          proprietario_nome: string | null
          state: string
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          area: number
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price: number
          property_purpose?: string | null
          proprietario_cpf?: string | null
          proprietario_email?: string | null
          proprietario_endereco?: string | null
          proprietario_estado_civil?: string | null
          proprietario_nome?: string | null
          state: string
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          area?: number
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price?: number
          property_purpose?: string | null
          proprietario_cpf?: string | null
          proprietario_email?: string | null
          proprietario_endereco?: string | null
          proprietario_estado_civil?: string | null
          proprietario_nome?: string | null
          state?: string
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string | null
          id: string
          image_order: number | null
          image_url: string
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_order?: number | null
          image_url: string
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_order?: number | null
          image_url?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          permission_key: string
          permission_name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key: string
          permission_name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key?: string
          permission_name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chats: {
        Row: {
          contact_avatar: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          id: string
          instance_id: string | null
          is_archived: boolean | null
          last_message: string | null
          last_message_time: string | null
          lead_id: string | null
          property_id: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean | null
          last_message?: string | null
          last_message_time?: string | null
          lead_id?: string | null
          property_id?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean | null
          last_message?: string | null
          last_message_time?: string | null
          lead_id?: string | null
          property_id?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chats_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          chat_count: number | null
          company_id: string | null
          contact_count: number | null
          created_at: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          last_seen: string | null
          message_count: number | null
          phone_number: string | null
          profile_name: string | null
          profile_pic_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          chat_count?: number | null
          company_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          last_seen?: string | null
          message_count?: number | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          chat_count?: number | null
          company_id?: string | null
          contact_count?: number | null
          created_at?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          last_seen?: string | null
          message_count?: number | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          caption: string | null
          chat_id: string | null
          contact_phone: string | null
          content: string | null
          created_at: string | null
          delivered_at: string | null
          from_me: boolean
          id: string
          instance_id: string | null
          media_url: string | null
          message_id: string | null
          message_type: string | null
          read_at: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          chat_id?: string | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          from_me: boolean
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          read_at?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          chat_id?: string | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          read_at?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: {
        Args: { user_uuid?: string }
        Returns: string
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_whatsapp_stats: {
        Args: { user_id_param?: string }
        Returns: {
          total_instances: number
          connected_instances: number
          total_chats: number
          total_messages: number
          unread_messages: number
        }[]
      }
      has_permission: {
        Args: { permission_key_param: string }
        Returns: boolean
      }
      is_manager: {
        Args: { user_uuid?: string }
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
