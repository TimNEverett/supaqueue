export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  supaqueue: {
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
          status: Database["supaqueue"]["Enums"]["job_status"];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          payload?: Json;
          queue: string;
          status?: Database["supaqueue"]["Enums"]["job_status"];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          payload?: Json;
          queue?: string;
          status?: Database["supaqueue"]["Enums"]["job_status"];
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
          created_at: string;
          default_headers: Json;
          edge_function_name: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          default_headers?: Json;
          edge_function_name: string;
          id?: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          default_headers?: Json;
          edge_function_name?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
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
}

export type Tables<
  supaqueueTableNameOrOptions extends
    | keyof (Database["supaqueue"]["Tables"] & Database["supaqueue"]["Views"])
    | { schema: keyof Database },
  TableName extends supaqueueTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[supaqueueTableNameOrOptions["schema"]]["Tables"] &
        Database[supaqueueTableNameOrOptions["schema"]]["Views"])
    : never = never
> = supaqueueTableNameOrOptions extends { schema: keyof Database }
  ? (Database[supaqueueTableNameOrOptions["schema"]]["Tables"] &
      Database[supaqueueTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : supaqueueTableNameOrOptions extends keyof (Database["supaqueue"]["Tables"] &
      Database["supaqueue"]["Views"])
  ? (Database["supaqueue"]["Tables"] &
      Database["supaqueue"]["Views"])[supaqueueTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  supaqueueTableNameOrOptions extends
    | keyof Database["supaqueue"]["Tables"]
    | { schema: keyof Database },
  TableName extends supaqueueTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[supaqueueTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = supaqueueTableNameOrOptions extends { schema: keyof Database }
  ? Database[supaqueueTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : supaqueueTableNameOrOptions extends keyof Database["supaqueue"]["Tables"]
  ? Database["supaqueue"]["Tables"][supaqueueTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  supaqueueTableNameOrOptions extends
    | keyof Database["supaqueue"]["Tables"]
    | { schema: keyof Database },
  TableName extends supaqueueTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[supaqueueTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = supaqueueTableNameOrOptions extends { schema: keyof Database }
  ? Database[supaqueueTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : supaqueueTableNameOrOptions extends keyof Database["supaqueue"]["Tables"]
  ? Database["supaqueue"]["Tables"][supaqueueTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  supaqueueEnumNameOrOptions extends
    | keyof Database["supaqueue"]["Enums"]
    | { schema: keyof Database },
  EnumName extends supaqueueEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[supaqueueEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = supaqueueEnumNameOrOptions extends { schema: keyof Database }
  ? Database[supaqueueEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : supaqueueEnumNameOrOptions extends keyof Database["supaqueue"]["Enums"]
  ? Database["supaqueue"]["Enums"][supaqueueEnumNameOrOptions]
  : never;
