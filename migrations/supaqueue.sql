CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE SCHEMA IF NOT EXISTS "supaqueue";

CREATE TYPE "supaqueue"."job_status" AS ENUM (
    'pending',
    'in_progress',
    'success',
    'failed'
);

ALTER TYPE "supaqueue"."job_status" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."after_insert_current_job_tg_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  execute call_execute_current_job(NEW);
  return NEW;
END;
$$;

ALTER FUNCTION "supaqueue"."after_insert_current_job_tg_fn"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."after_insert_job_tg_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  execute process_jobs();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "supaqueue"."after_insert_job_tg_fn"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."after_update_current_job_tg_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  execute complete_current_job(NEW);
  RETURN NEW;
END;
$$;

ALTER FUNCTION "supaqueue"."after_update_current_job_tg_fn"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."after_update_worker_tg_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.locked = true AND NEW.locked = false THEN
    -- clean up the current job
    DELETE FROM supaqueue.current_job WHERE worker = OLD.id;
    -- now that worker is available, check for more jobs
    execute process_jobs();
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "supaqueue"."after_update_worker_tg_fn"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "supaqueue"."current_job" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "worker" "uuid" NOT NULL,
    "job" "uuid" NOT NULL,
    "is_complete" boolean DEFAULT false NOT NULL,
    "is_successful" boolean
);

ALTER TABLE "supaqueue"."current_job" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."call_execute_current_job"("cur_job" "supaqueue"."current_job") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  job_record job%rowtype;
  queue_record queue%rowtype;
  payload json;
  headers json;
  secret text;
BEGIN
  
  select decrypted_secret from vault.decrypted_secrets where name = 'supaqueue_secret' into secret;

  headers := json_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer [SUPABASE-ANON-KEY]', secret
  );

  select * into job_record from job where id = cur_job.job;

  select * into queue_record from queue where id = job_record.queue;

  payload := json_build_object(
    'queue', row_to_json(queue_record),
    'job', row_to_json(job_record),
    'current_job', row_to_json(cur_job)
  );

  perform net.http_post(
    url:='https://[SUPABASE-PROJECT-REF].supabase.co/functions/v1/execute_current_job',
    headers:= headers::jsonb,
    body:= payload::jsonb
  ) as request_id;
END;
$$;

ALTER FUNCTION "supaqueue"."call_execute_current_job"("cur_job" "supaqueue"."current_job") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF cur_job.is_complete = true THEN
    UPDATE supaqueue.worker
    SET locked = false
    WHERE id = cur_job.worker;
  END IF;
  
  -- update the job status
  IF cur_job.is_complete = true AND cur_job.is_successful = true THEN
    -- succeeded
    UPDATE supaqueue.job
    SET status = 'success'
    WHERE id = cur_job.job;
  ELSIF cur_job.is_complete = true AND cur_job.is_successful = false AND (SELECT attempts FROM supaqueue.job WHERE id = cur_job.job) < 3 THEN
    -- failed and retrying
    UPDATE supaqueue.job
    SET status = 'pending'
    WHERE id = cur_job.job;
  ELSIF cur_job.is_complete = true AND cur_job.is_successful = false THEN
    -- failed and no more retries
    UPDATE supaqueue.job
    SET status = 'failed'
    WHERE id = cur_job.job;
  END IF;
END;
$$;

ALTER FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."process_jobs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  worker_id uuid;
  job_id uuid;
BEGIN
  -- Get all unlocked workers and skip any that are currently locked by other transactions
  FOR worker_id IN SELECT id FROM supaqueue.worker WHERE locked = false FOR UPDATE SKIP LOCKED LOOP
    -- Check if there are pending jobs for the worker's queue
    SELECT id INTO job_id FROM supaqueue.job WHERE queue = (SELECT queue FROM supaqueue.worker WHERE id = worker_id) AND status = 'pending' AND attempts < 3 ORDER BY updated_at LIMIT 1 FOR UPDATE SKIP LOCKED;
    -- Insert current_job record for the pending job
    IF job_id IS NOT NULL THEN
      INSERT INTO supaqueue.current_job (worker, job) VALUES (worker_id, job_id);
      UPDATE supaqueue.worker SET locked = true WHERE id = worker_id;
      UPDATE supaqueue.job SET status = 'in_progress', attempts = attempts + 1 WHERE id = job_id;
    END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION "supaqueue"."process_jobs"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "supaqueue"."updated_at_tg_fn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "supaqueue"."updated_at_tg_fn"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "supaqueue"."job" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "queue" "uuid" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "status" "supaqueue"."job_status" DEFAULT 'pending'::"supaqueue"."job_status" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "supaqueue"."job" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "supaqueue"."queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "api_url" "text" NOT NULL,
    "api_secret" "uuid",
    "default_headers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "method" "text" DEFAULT 'POST'::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL
);

ALTER TABLE "supaqueue"."queue" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "supaqueue"."worker" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "queue" "uuid" NOT NULL
);

ALTER TABLE "supaqueue"."worker" OWNER TO "postgres";

ALTER TABLE ONLY "supaqueue"."current_job"
    ADD CONSTRAINT "current_job_job_key" UNIQUE ("job");

ALTER TABLE ONLY "supaqueue"."current_job"
    ADD CONSTRAINT "current_job_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "supaqueue"."current_job"
    ADD CONSTRAINT "current_job_worker_key" UNIQUE ("worker");

ALTER TABLE ONLY "supaqueue"."job"
    ADD CONSTRAINT "job_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "supaqueue"."queue"
    ADD CONSTRAINT "queue_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "supaqueue"."worker"
    ADD CONSTRAINT "worker_pkey" PRIMARY KEY ("id");

CREATE OR REPLACE TRIGGER "after_insert_current_job_tg" AFTER INSERT ON "supaqueue"."current_job" FOR EACH ROW EXECUTE FUNCTION "supaqueue"."after_insert_current_job_tg_fn"();

CREATE OR REPLACE TRIGGER "after_insert_job_tg" AFTER INSERT ON "supaqueue"."job" FOR EACH ROW EXECUTE FUNCTION "supaqueue"."after_insert_job_tg_fn"();

CREATE OR REPLACE TRIGGER "after_update_current_job_tg" AFTER UPDATE ON "supaqueue"."current_job" FOR EACH ROW WHEN ("new"."is_complete") EXECUTE FUNCTION "supaqueue"."after_update_current_job_tg_fn"();

CREATE OR REPLACE TRIGGER "after_update_worker_tg" AFTER UPDATE OF "locked" ON "supaqueue"."worker" FOR EACH ROW EXECUTE FUNCTION "supaqueue"."after_update_worker_tg_fn"();

CREATE OR REPLACE TRIGGER "job_updated_at_tg" BEFORE UPDATE ON "supaqueue"."job" FOR EACH ROW EXECUTE FUNCTION "supaqueue"."updated_at_tg_fn"();

ALTER TABLE ONLY "supaqueue"."current_job"
    ADD CONSTRAINT "current_job_job_fkey" FOREIGN KEY ("job") REFERENCES "supaqueue"."job"("id");

ALTER TABLE ONLY "supaqueue"."current_job"
    ADD CONSTRAINT "current_job_worker_fkey" FOREIGN KEY ("worker") REFERENCES "supaqueue"."worker"("id");

ALTER TABLE ONLY "supaqueue"."job"
    ADD CONSTRAINT "job_queue_fkey" FOREIGN KEY ("queue") REFERENCES "supaqueue"."queue"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "supaqueue"."queue"
    ADD CONSTRAINT "queue_api_secret_fkey" FOREIGN KEY ("api_secret") REFERENCES "vault"."secrets"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "supaqueue"."worker"
    ADD CONSTRAINT "worker_queue_fkey" FOREIGN KEY ("queue") REFERENCES "supaqueue"."queue"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "supaqueue"."current_job" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "supaqueue"."job" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "supaqueue"."queue" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "supaqueue"."worker" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "supaqueue" TO "postgres";
GRANT USAGE ON SCHEMA "supaqueue" TO "anon";
GRANT USAGE ON SCHEMA "supaqueue" TO "authenticated";
GRANT USAGE ON SCHEMA "supaqueue" TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer) TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer) TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer) TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer, "queue_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer, "queue_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."add_jobs"("num_jobs" integer, "queue_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."after_insert_current_job_tg_fn"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."after_insert_current_job_tg_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."after_insert_current_job_tg_fn"() TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."after_insert_job_tg_fn"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."after_insert_job_tg_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."after_insert_job_tg_fn"() TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."after_update_current_job_tg_fn"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."after_update_current_job_tg_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."after_update_current_job_tg_fn"() TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."after_update_worker_tg_fn"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."after_update_worker_tg_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."after_update_worker_tg_fn"() TO "service_role";

GRANT ALL ON TABLE "supaqueue"."current_job" TO "anon";
GRANT ALL ON TABLE "supaqueue"."current_job" TO "authenticated";
GRANT ALL ON TABLE "supaqueue"."current_job" TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."call_execute_current_job"("cur_job" "supaqueue"."current_job") TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."call_execute_current_job"("cur_job" "supaqueue"."current_job") TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."call_execute_current_job"("cur_job" "supaqueue"."current_job") TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."process_jobs"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."process_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."process_jobs"() TO "service_role";

GRANT ALL ON FUNCTION "supaqueue"."updated_at_tg_fn"() TO "anon";
GRANT ALL ON FUNCTION "supaqueue"."updated_at_tg_fn"() TO "authenticated";
GRANT ALL ON FUNCTION "supaqueue"."updated_at_tg_fn"() TO "service_role";

GRANT ALL ON TABLE "supaqueue"."job" TO "anon";
GRANT ALL ON TABLE "supaqueue"."job" TO "authenticated";
GRANT ALL ON TABLE "supaqueue"."job" TO "service_role";

GRANT ALL ON TABLE "supaqueue"."queue" TO "anon";
GRANT ALL ON TABLE "supaqueue"."queue" TO "authenticated";
GRANT ALL ON TABLE "supaqueue"."queue" TO "service_role";

GRANT ALL ON TABLE "supaqueue"."worker" TO "anon";
GRANT ALL ON TABLE "supaqueue"."worker" TO "authenticated";
GRANT ALL ON TABLE "supaqueue"."worker" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "supaqueue" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;