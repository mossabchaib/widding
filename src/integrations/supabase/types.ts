export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          slug: string
          name_ar: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_ar: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_ar?: string
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          client_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string
          wilaya: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          wilaya: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          wilaya?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          id: string
          user_id: string
          business_name: string
          service_type: string
          is_active: boolean
          subscription_expires_at: string | null
          commerce_register_number: string | null
          commerce_register_url: string | null
          verified: boolean
          created_at: string
          avatar_url: string | null
          bio: string | null
          views: number
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          service_type: string
          is_active?: boolean
          subscription_expires_at?: string | null
          commerce_register_number?: string | null
          commerce_register_url?: string | null
          verified?: boolean
          created_at?: string
          avatar_url?: string | null
          bio?: string | null
          views?: number
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          service_type?: string
          is_active?: boolean
          subscription_expires_at?: string | null
          commerce_register_number?: string | null
          commerce_register_url?: string | null
          verified?: boolean
          created_at?: string
          avatar_url?: string | null
          bio?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          id: string
          client_id: string
          service_id: string
          provider_id: string
          message: string | null
          status: Database["public"]["Enums"]["request_status"]
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          provider_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          provider_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          client_id: string
          service_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          price: number
          wilaya: string
          category: string
          category_id: string | null
          photos: string[]
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name: string
          description?: string | null
          price?: number
          wilaya: string
          category: string
          category_id?: string | null
          photos?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name?: string
          description?: string | null
          price?: number
          wilaya?: string
          category?: string
          category_id?: string | null
          photos?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          provider_id: string
          receipt_url: string
          commerce_doc_url: string | null
          plan_name: string | null
          plan_days: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          receipt_url: string
          commerce_doc_url?: string | null
          plan_name?: string | null
          plan_days?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          receipt_url?: string
          commerce_doc_url?: string | null
          plan_name?: string | null
          plan_days?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_provider_views: {
        Args: {
          provider_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      request_status: "new" | "accepted" | "rejected" | "completed"
      subscription_status: "pending" | "active" | "expired" | "rejected"
      app_role: "admin" | "provider" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][TableName]["Update"]

export type Enums<
  EnumName extends keyof Database["public"]["Enums"],
> = Database["public"]["Enums"][EnumName]