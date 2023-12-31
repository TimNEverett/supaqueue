# Supaqueue

## Overview

Supaqueue allows you to queue your edge function calls in your supabase project. The goal is to provide a controlled means of calling edge functions in your supabase backend, giving consistent behaviour.

#### Key Features:

- queue workers (number of workers determines number of concurrent calls)
- automatic retries (currently hardcoded to 3)
- create processing pipelines (using the job dependencies add-on)

#### The Supaqueue Schema and `Supaqueue.sql` File

This file adds all tables, functions, triggers and enumerated types to your project. These entities are all added under the `supaqueue` schema to keep them isolated. There is also one public postgres function called `end_current_job` that is used by the edge function to mark the job as complete.

(Note that the only the postgres and service_role roles are granted priveleges to this schema)

#### The `supaqueue` Edge Function

This edge function is deployed to your supabase project. This function formats the information from the relevant tables to make an edge function call defined in the queue and then calls the edge function. It also updates the status of the `current_job` table and captures if the edge function call was successful or not.

## Installation

#### Instructions

1. Clone the supaqueue repo

```bash
git clone git@github.com:TimNEverett/supaqueue.git # using ssh keys
```

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
# This command will prompt you for your supabase project ref and database password.
```

5. If successful, you should see in your supabase dashboard:

- a `supaqueue` schema with tables, triggers, functions, and an enumerated type
- a supabase edge function called `supaqueue`
- a secret in your vault called `supaqueue_secret`
- a corresponding secret in your edge Deno env variables called `SUPAQUEUE_SECRET`

#### Explanation of the installation process

This `supaqueue:install` command will do the following:

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

## How the queue works

### The Queue

The best way to think about a Queue in supaqueue is a way to call your edge function, like one of your supabase edge functions. The Queue record contains the information about the edge function (URL, headers, api-secret, etc).

### The Job

Jobs belong to a queue. This is analagous to making a call to the edge function. The Job contains the payload for that specific API call (attached as the request body. The job record also tracks the status and number of attempts for the given job.

When the job gets picked up to be processed, the status goes from `pending` to `in-progress`. If the job succeeded, the status moves to `successful`. If the job failed but has not hit the max attempts (currently set to 3) the status moves back into `pending`, to be retried. If the job failed and has hit the max attempts (currently hard coded at 3), the status goes to `failed`.

### The Worker

A worker belongs to a queue. When a worker starts processing a job, that worker becomes `locked`. This indicates that the worker is busy and cannot be used to process other jobs until it becomes unlocked.

The number of workers for a given queue represents the number of jobs that can be processed in parallel.

By adding more workers to a queue, you are enabling the queue to be processed more quickly. By limiting the number of workers, you are limiting the rate of which your system will call that edge function.

### The current job table

The current job record joins a worker to a job and tracks the status of the edge function call, marking it as complete and also tracking if that particular call succeeded or failed.

When a record is inserted into the `current_job` table, it gathers the new record along with the associated job and queue records and sends them as inputs to the `supaqueue` edge function.

Once the edge function marks the current job as complete, the job status is updated, the associated worker is unlocked, and the `current_job` record is deleted.

Unique constraints on the worker and job columns of the `current_job` table ensure that each worker can only process one job at a time, and prevents multiple workers from processing the same job at the same time.

#### Process Flow

TODO: show a process flow chart here.

# Acknowledgements

Big thanks to my brother [scotteverett](https://github.com/scotteverett) for concepting/testing supaqueue with me, and being the first user.

Supaqueue was greatly inspired by [Rodrigo Mansueli's blog](https://blog.mansueli.com/), particularly his post titled [Building a Queue System with Supabase and PostgreSQL](https://mansueli.hashnode.dev/building-a-queue-system-with-supabase-and-postgresql).
