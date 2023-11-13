export type CurrentJob = Database["public"]["Tables"]["current_job"]["Row"];
export type Job = Database["public"]["Tables"]["job"]["Row"];
export type Queue = Database["public"]["Tables"]["queue"]["Row"];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      current_job: {
        Row: {
          created_at: string;
          id: string;
          is_complete: boolean;
          is_successful: boolean | null;
          job: string;
          worker: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_complete?: boolean;
          is_successful?: boolean | null;
          job: string;
          worker: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_complete?: boolean;
          is_successful?: boolean | null;
          job?: string;
          worker?: string;
        };
        Relationships: [
          {
            foreignKeyName: "current_job_job_fkey";
            columns: ["job"];
            isOneToOne: true;
            referencedRelation: "job";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "current_job_worker_fkey";
            columns: ["worker"];
            isOneToOne: true;
            referencedRelation: "worker";
            referencedColumns: ["id"];
          }
        ];
      };
      job: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          payload: Json;
          queue: string;
          status: Database["public"]["Enums"]["job_status"];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          payload?: Json;
          queue: string;
          status?: Database["public"]["Enums"]["job_status"];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          payload?: Json;
          queue?: string;
          status?: Database["public"]["Enums"]["job_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_queue_fkey";
            columns: ["queue"];
            isOneToOne: false;
            referencedRelation: "queue";
            referencedColumns: ["id"];
          }
        ];
      };
      queue: {
        Row: {
          api_secret: string | null;
          api_url: string;
          created_at: string;
          default_headers: Json;
          id: string;
          method: string;
          name: string;
        };
        Insert: {
          api_secret?: string | null;
          api_url: string;
          created_at?: string;
          default_headers?: Json;
          id?: string;
          method?: string;
          name?: string;
        };
        Update: {
          api_secret?: string | null;
          api_url?: string;
          created_at?: string;
          default_headers?: Json;
          id?: string;
          method?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "queue_api_secret_fkey";
            columns: ["api_secret"];
            isOneToOne: false;
            referencedRelation: "decrypted_secrets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_api_secret_fkey";
            columns: ["api_secret"];
            isOneToOne: false;
            referencedRelation: "secrets";
            referencedColumns: ["id"];
          }
        ];
      };
      worker: {
        Row: {
          created_at: string;
          id: string;
          locked: boolean;
          queue: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locked?: boolean;
          queue: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locked?: boolean;
          queue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_queue_fkey";
            columns: ["queue"];
            isOneToOne: false;
            referencedRelation: "queue";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_jobs:
        | {
            Args: {
              num_jobs: number;
            };
            Returns: undefined;
          }
        | {
            Args: {
              num_jobs: number;
              queue_id: string;
            };
            Returns: undefined;
          };
      call_execute_current_job: {
        Args: {
          cur_job: unknown;
        };
        Returns: undefined;
      };
      complete_current_job: {
        Args: {
          cur_job: unknown;
        };
        Returns: undefined;
      };
      process_jobs: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      job_status: "pending" | "in_progress" | "success" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string;
          name: string;
          owner: string;
          metadata: Json;
        };
        Returns: undefined;
      };
      extension: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      filename: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      foldername: {
        Args: {
          name: string;
        };
        Returns: unknown;
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits?: number;
          levels?: number;
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
