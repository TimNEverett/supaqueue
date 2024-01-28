# Supaqueue

## Overview

Supaqueue enables the queueing of edge function calls in your supabase project. The goal is to provide a controlled means of calling edge functions in your supabase backend, giving consistent behaviour.

#### Key Features:

- queues (calls to an edge function)
- workers (number of workers determines number of concurrent calls in a queue)
- automatic retries
- create processing pipelines (using the job dependencies add-on)

#### Supaqueue is incredibly useful when:

- your edge functions rely on 3rd party APIs and you risk ratelimiting
- your edge function workload sizes are hard to predict, or vary greatly based on user actions.
- you need to run your edge functions in a particular order.

#### This project consists of:

- the supaqueue schema defined in the `supaqueue.sql` file.

- a supaqueue secret that is added to your project's vault.

- the `supaqueue` supabase edge function

### The Supaqueue Schema and `Supaqueue.sql` File

This file adds all tables, functions, triggers and enumerated types to your project. These entities are all added under the 'supaqueue' schema to keep them isolated. There is also one public postgres function called `end_current_job` that is used by the edge function to mark the job as complete.

Note: that the only the `postgres`, and `service_role` roles are granted priveleges to this schema which means by default the supabase fe client cannot interact with supaque directly.

### The `supaqueue` Edge Function

This edge function is added to your supabase project folder and deployed. This function formats the information from the relevant tables to make an edge function call defined in the queue. It also updates the status of the current_job table and captures if the api call was successful or not.

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

The `pnpm supaqueue:install` command will do the following:

1. Link to your supabase project (using your project ref and db password)
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

## Removing Supaqueue

To remove supaqueue run:

```bash
pnpm supaqueue:install # or yarn supaqueue:install
```

This command will:

1. perform a `DROP SCHEMA IF EXISTS supaqueue CASCADE;` on the database. NOTE: This will drop foreign key relationships to any tables in the supaqueue schema which could impact the functionality of your other schemas.
2. Remove the supaqueue secret from the vault
3. Delete the supaqueue edge function.

## How the queue works

### The Queue

A Queue in a supaqueue is a queue of calls that will eventually be made to a specific edge function. The Queue record contains general information needed to make the edge function call (function name, custom default headers, etc).

### The Job

Jobs belong to a queue. This is analagous to making an edge function call. The Job contains the payload for that specific edce function call. The job record also tracks the status and number of attempts for the given job.

#### Job Life Cycle

1. When the job gets picked up to be processed, the status goes from `pending` to `in-progress`.
2. If the job succeeded, the status moves to `successful`.
3. If the job failed but has not hit the max attempts (currently set to 3) the status moves back into `pending`, to be retried.
4. If the job failed and has hit the max attempts (currently hard coded at 3), the status goes to `failed`.

### The Worker

A worker belongs to a queue. When a worker starts processing a job, that worker becomes `locked`. This indicates that the worker is busy and cannot be used to process other jobs until it becomes unlocked.

The number of workers for a given queue represents the number of jobs that can be processed in parallel.

By adding more workers to a queue, you are enabling the queue to be processed more quickly. By limiting the number of workers, you are limiting the rate of which your system will call that edge function.

### The current job table

The current job record joins a worker to a job and tracks the status of the edge function call, marking it as complete and also tracking if that particular call succeeded or failed.

When a record is inserted into the `current_job` table, it gathers the new record along with the associated job and queue records and sends them as inputs to the `supaqueue` edge function.

Once the edge function marks the current job as complete, the job status is updated, the associated worker is unlocked, and the `current_job` record is deleted.

Unique constraints on the worker and job columns of the `current_job` table ensure that each worker can only process one job at a time, and prevents multiple workers from processing the same job at the same time.

# Acknowledgements

Big thanks to my brother [scotteverett](https://github.com/scotteverett) for concepting/testing supaqueue with me, and being the first user.

Supaqueue was greatly inspired by [Rodrigo Mansueli's blog](https://blog.mansueli.com/), particularly his post titled [Building a Queue System with Supabase and PostgreSQL](https://mansueli.hashnode.dev/building-a-queue-system-with-supabase-and-postgresql).
