import { Database } from "./database.types.ts";

export type Job = Database["supaqueue"]["Tables"]["job"]["Row"];
export type CurrentJob = Database["supaqueue"]["Tables"]["current_job"]["Row"];
export type Queue = Database["supaqueue"]["Tables"]["queue"]["Row"];
