create table
  supaqueue.job_dependencies (
    created_at timestamp with time zone not null default now(),
    source uuid not null,
    target uuid not null,
    constraint job_dependencies_pkey primary key (source, target),
    constraint job_dependencies_source_fkey foreign key (source) references supaqueue.job (id) on update cascade on delete cascade,
    constraint job_dependencies_target_fkey foreign key (target) references supaqueue.job (id) on update cascade on delete cascade
  ) tablespace pg_default;

create
or replace function "supaqueue"."process_jobs" () returns "void" language "plpgsql" security definer as $$
DECLARE
  worker_id uuid;
  job_id uuid;
BEGIN
  -- Get all unlocked workers and skip any that are currently locked by other transactions
  FOR worker_id IN SELECT id FROM supaqueue.worker WHERE locked = false FOR UPDATE SKIP LOCKED LOOP
    -- Check if there are pending jobs for the worker's queue
    SELECT sj.id INTO job_id 
    FROM supaqueue.job as sj
    WHERE 
      queue = (SELECT queue FROM supaqueue.worker WHERE id = worker_id) 
      AND status = 'pending' 
      AND attempts < 3 
      AND (SELECT count(*) from supaqueue.job_dependencies where target = sj.id) = 0
      ORDER BY updated_at LIMIT 1 FOR UPDATE SKIP LOCKED;
    -- Insert current_job record for the pending job
    IF job_id IS NOT NULL THEN
      INSERT INTO supaqueue.current_job (worker, job) VALUES (worker_id, job_id);
      UPDATE supaqueue.worker SET locked = true WHERE id = worker_id;
      UPDATE supaqueue.job SET status = 'in_progress', attempts = attempts + 1 WHERE id = job_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "supaqueue"."complete_current_job"("cur_job" "supaqueue"."current_job") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- update the job status
  IF cur_job.is_complete = true AND cur_job.is_successful = true THEN
    -- succeeded
    DELETE from supaqueue.job_dependencies where source = cur_job.job;

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
  
  IF cur_job.is_complete = true THEN
    UPDATE supaqueue.worker
    SET locked = false
    WHERE id = cur_job.worker;
  END IF;
END;
$$;