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

#### Install the supaqueue schema:

1. Go to migrations/supaqueue.sql.
2. find the `[PROJECT-REF]` section of the file and replace with your project ref.
3. find the `[SUPABASE-ANON-KEY]` and replace it with the yoru projects supabase anon key.
4. run the migration file (via dashboard or psql cmd)

#### Install the edge function:

1. copy the `execute_current_job` dir into your project's `supabase/functions` dir
2. in your project root run `supabase functions deploy execute_current_job`

#### Add your supaqueue secret to the vault:

1. Go to your project dashboard and go into Settings -> Vault
2. create a secret called `supaqueue_secret`

#### Add your supabaqueue secret to your edge function env variables

1.  in the terminal run `supabase secrets set SUPAQUEUE_SECRET=[YOUR SECRET]` (replace with your secret)
2.  use `supabase secrets list` to verify the secret has successfully been added.

## Usage

1. Create a queue in the `supaqueue.queue` table.
2. Add a worker(s) that belong to the queue
3. Insert a job into the `supaqueue.job` table.

## How the queue works

### The Queue

The best way to think about a Queue in a supaqueue is that it is an API integration for a specific endpoint, like one of your supabase dge functions. The Queue record contains the information about the API endpoint (URL, HTTP method, headers, etc).

### The Job

Jobs belong to a queue. This is analagous to making an api call. The Job contains the payload for that specific API call (on POST requests the payload is attached as the request body, on GET requests, the payload is attached as query params). The job record also tracks the status and number of attempts for the given job.

When the job gets picked up to be processed, the status goes from `pending` to `in-progress`. If the job succeeded, the status moves to `successful`. If the job failed but has not hit the max attempts (currently set to 3) the status moves back into `pending`, to be retried. If the job failed and has hit the max attempts, the status goes to `failed`.

### The Worker

A worker belongs to a queue. When a worker starts processing a job, that work becomes `locked`. This indicates that the worker is busy and cannot be used to process other jobs until it becomes unlocked.

The number of workers for a given queue represents the number of jobs that can be processed in parallel.

By adding more workers to a queue, you are enable the queue to be processed more quickly. By limiting the number of workers, you limit the rate of which your system will hit that API.

### The current job table

The current job record joins a worker to a job and tracks the status of the API call, marking it as complete and also tracking if it succeeded or failed.

When a record is inserted into the `current_job` table, it gathers the new record along with the associated job and queue records and send them as inputs to the `execute_current_job` edge function.

Once the edge function marks the current job as complete, the job status is updated, the associated worker is unlocked, and the current_job record is deleted.

Unique constraints on the worker and job columns of the current_job table ensure that each worker can only process one job at a time, and prevents multiple workers from processing the same job at the same time.

### Functions

TODO: list out all functions and describe their purpose

### Triggers

TODO: list out all triggers and describe when they fire and their side effects.

#### Process Flow

TODO: show a process flow chart here.
