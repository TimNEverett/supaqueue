export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  supaqueue: {
    Tables: {
      current_job: {
        Row: {
          created_at: string
          id: string
          is_complete: boolean
          is_successful: boolean | null
          job: string
          worker: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_complete?: boolean
          is_successful?: boolean | null
          job: string
          worker: string
        }
        Update: {
          created_at?: string
          id?: string
          is_complete?: boolean
          is_successful?: boolean | null
          job?: string
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_job_job_fkey"
            columns: ["job"]
            isOneToOne: true
            referencedRelation: "job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "current_job_worker_fkey"
            columns: ["worker"]
            isOneToOne: true
            referencedRelation: "worker"
            referencedColumns: ["id"]
          }
        ]
      }
      job: {
        Row: {
          attempts: number
          created_at: string
          id: string
          payload: Json
          queue: string
          status: Database["supaqueue"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          payload?: Json
          queue: string
          status?: Database["supaqueue"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          payload?: Json
          queue?: string
          status?: Database["supaqueue"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_fkey"
            columns: ["queue"]
            isOneToOne: false
            referencedRelation: "queue"
            referencedColumns: ["id"]
          }
        ]
      }
      queue: {
        Row: {
          api_secret: string | null
          api_url: string
          created_at: string
          default_headers: Json
          id: string
          method: string
          name: string
        }
        Insert: {
          api_secret?: string | null
          api_url: string
          created_at?: string
          default_headers?: Json
          id?: string
          method?: string
          name?: string
        }
        Update: {
          api_secret?: string | null
          api_url?: string
          created_at?: string
          default_headers?: Json
          id?: string
          method?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_api_secret_fkey"
            columns: ["api_secret"]
            isOneToOne: false
            referencedRelation: "decrypted_secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_api_secret_fkey"
            columns: ["api_secret"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          }
        ]
      }
      worker: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          queue: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          queue: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          queue?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_queue_fkey"
            columns: ["queue"]
            isOneToOne: false
            referencedRelation: "queue"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      call_execute_current_job: {
        Args: {
          cur_job: unknown
        }
        Returns: undefined
      }
      complete_current_job: {
        Args: {
          cur_job: unknown
        }
        Returns: undefined
      }
      process_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      job_status: "pending" | "in_progress" | "success" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
