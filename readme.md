# Supaqueue

## Overview

Supaqueue is a way to add api call queues to any supabase project. This is an especially useful way to have your backend make calls to your supabase edge functions in a controlled manner.

This project consists of:

- the supaqueue schema defined in the `migration.sql` file.

- the `execute_current_job` supabase edge function

### The Supaqueue Schema and `Migration.sql` File

This file adds all tables, functions, triggers and enumerated types to your project. These entities are all added under the 'supaqueue' schema to keep them isolated. (Note that the postgres, authenticated, anon, and service_role roles are also granted priveleges to this schema)

### The `execute_current_job` Edge Function

This edge function is added to your supabase project folder and deployed. This function formats the information from the relevant tables to make an API call defined in the queue. It also updates the status of the current_job table and captures if the api call was successful or not.

## Installation

1. Install the supaqueue schema:
   a. find the `[PROJECT-REF]` section of the file and replace with your project ref.
   b. find the `[SUPABASE-ANON-KEY]`
   c. run the migration file (via dashboard or psql cmd)
2. Install the edge function:
   a. copy the `execute_current_job` dir into your project's `supabase/functions` dir
   b. in your project root run `supabase functions deploy execute_current_job`
3. Add your supaqueue secret to the vault:
   a. Go to your project dashboard and go into Settings -> Vault
   b. create a secret called `supabase_secret`
4. Add your supabaqueue secret to your edge function env variables
   a. in the terminal run `supabase secrets add SUPAQUEUE_SECRET=[YOUR SECRET]` (replace with your secret)

## Usage

1. Create a queue in the `supaqueue.queue` table.
2. Add a worker(s) that belong to the queue
3. Insert a job into the `supaqueue.job` table.

## How the queue works

### The Queue

The best way to think about a Queue in a supaqueue is that it is an API integration for a specific endpoint. The Queue record contains the information about the API endpoint (URL, HTTP method, headers, etc).

### The Job

Jobs belong to a queue. This is analagous to making an api call. The Job contains the payload for that specific API call to the API (i.e: queue). The job record also tracks the status and attempts counts for the given job.

When the job gets picked up to be processed, the status goes from `pending` to `in-progress`. If the job succeeded, the status moves to `successful`. If the job failed but has not hit the max attempts (currently set to 3) the status moves back into a pending state, to be retried. If the job failed and has hit the max attempts, the status goes to `failed`.

### The Worker

A worker belongs to a queue. When a worker starts processing a job is gets `locked`. This indicates that the worker is busy and cannot be used to process other jobs until it becomes unlocked.

The number of workers for a given queue represents the number of jobs that can be processed in parallel.

By adding more workers to a queue, you are enable the queue to be processed more quickly. By limiting the number of workers, you limit the rate of which your system will hit the API. This is incredibly useful when working with queues that have strict rate limits and/or your system has spikes in request to a particular endpoint that needs to be controlled.

### The current job table

This table is a place for jobs being processed to be tracked. The current job record joins a worker to a job and tracks the status of the API call, marking it as complete and also tracking if it succeeded or failed.

When a record is inserted into the `current_job` table, it gathers the new record along with the associated job and queue records and send thems as inputs to the `execute_current_job` edge function

Once the edge function marks the current job as complete, the job status is updated, the associated worker is unlocked, and the current_job record is deleted.

Unique constraints on the worker and job columns of the current_job table ensure that each worker can only process one job at a time, and that each job can only be processed once at a time (no chance of multiple workers processing the same job twice)

### Functions

jobs_insert_tg_fn
after_insert_current_job
complete_current_job
delete_current_job
process_jobs

### Triggers

after_insert_jobs

- runs after insert on the job table

current_job_insert_tg

- runs after insert on the current_job table

current_job_complete_trigger ()

- runs after update on the current_job table

delete_current_job_trigger

- runs after update on the worker table
