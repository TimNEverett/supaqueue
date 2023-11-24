# Supaqueue

## Overview

Supaqueue is a way to add api call queues to any supabase project. This is an especially useful way to have your backend make calls to your supabase edge functions in a controlled manner.

This project consists of:

- the supaqueue schema defined in the `supaqueue.sql` file.

- a supaqueue secret that is added to your project's vault.

- the `supaqueue` supabase edge function

### The Supaqueue Schema and `Supaqueue.sql` File

This file adds all tables, functions, triggers and enumerated types to your project. These entities are all added under the 'supaqueue' schema to keep them isolated. There is also one public postgres function called `end_current_job` that is used by the edge function to mark the job as complete.

(Note that the only the postgres, and service_role roles are also granted priveleges to this schema)

### The `supaqueue` Edge Function

This edge function is added to your supabase project folder and deployed. This function formats the information from the relevant tables to make an API call defined in the queue. It also updates the status of the current_job table and captures if the api call was successful or not.

## Installation

#### Instructions

1. Clone the supaqueue repo
2. Install dependencies

```bash
pnpm install # or yarn install
```

3. login to supabase

```bash
pnpm supabase login # or yarn supabase login
```

4. Install supaqueue

```bash
pnpm supaqueue:install # or yarn supaqueue:install
```

- this command will prompt you for your supabase project ref and database password.

5. If successful, you should see in your supabase dashboard:

- a `supaqueue` schema with tables, triggers, functions, and an enumerated type
- a supabase edge function called `supaqueue`
- a secret in your vault called `supaqueue_secret`
- a corresponding secret in your edge Deno env variables called `SUPAQUEUE_SECRET`

#### Explanation

This command will do the following:

1. Link to your supabase project
2. Generate a supaqueue_secret
3. Save the supaqueue_secret to your supabase project's secrets
4. Retrieve your project's anon key
5. Update the sql files with your project ref, anon key and apply migrations to your database.
6. Add the supaqueue_secret to your vault.
7. Deploy the supaqueue edge function.

## Usage

1. Create a queue in the `supaqueue.queue` table.
2. Add a worker(s) that belong to the queue
3. Insert a job into the `supaqueue.job` table.

e.g:

```sql

INSERT INTO supaqueue.job
(queue, payload) VALUES ('[your queue id]', '{"arg1": "val"}'::jsonb);

```

## How the queue works

### The Queue

The best way to think about a Queue in a supaqueue is that it is an API integration for a specific endpoint, like one of your supabase edge functions. The Queue record contains the information about the API endpoint (URL, HTTP method, headers, etc).

### The Job

Jobs belong to a queue. This is analagous to making an api call. The Job contains the payload for that specific API call (on POST requests the payload is attached as the request body, on GET requests, the payload is attached as query params). The job record also tracks the status and number of attempts for the given job.

When the job gets picked up to be processed, the status goes from `pending` to `in-progress`. If the job succeeded, the status moves to `successful`. If the job failed but has not hit the max attempts (currently set to 3) the status moves back into `pending`, to be retried. If the job failed and has hit the max attempts (currently hard coded at 3), the status goes to `failed`.

### The Worker

A worker belongs to a queue. When a worker starts processing a job, that worker becomes `locked`. This indicates that the worker is busy and cannot be used to process other jobs until it becomes unlocked.

The number of workers for a given queue represents the number of jobs that can be processed in parallel.

By adding more workers to a queue, you are enabling the queue to be processed more quickly. By limiting the number of workers, you are limiting the rate of which your system will call that API.

### The current job table

The current job record joins a worker to a job and tracks the status of the API call, marking it as complete and also tracking if that particular call succeeded or failed.

When a record is inserted into the `current_job` table, it gathers the new record along with the associated job and queue records and sends them as inputs to the `supaqueue` edge function.

Once the edge function marks the current job as complete, the job status is updated, the associated worker is unlocked, and the `current_job` record is deleted.

Unique constraints on the worker and job columns of the `current_job` table ensure that each worker can only process one job at a time, and prevents multiple workers from processing the same job at the same time.

### Functions

TODO: list out all functions and describe their purpose

### Triggers

TODO: list out all triggers and describe when they fire and their side effects.

#### Process Flow

TODO: show a process flow chart here.
