# Supaqueue

Supaqueue provides a controlled means of calling edge functions in your supabase backend. This is very useful for edge function workloads that are "spiky" or are subject to rate limiting.

Key Features:

- queues (calls to an edge function)
- workers (number of workers determines number of concurrent calls in a queue)
- automatic retries
- create processing pipelines (using the job dependencies add-on)

Supaqueue consists of:

1. the supaqueue schema defined in the `supaqueue.sql` file.

2. a supaqueue secret that is added to your project's vault, used to ensure only your supabase backend can use the `supaqueue` edge function.

3. the `supaqueue` supabase edge function

### `Supaqueue.sql`

A migration file that installs the 'supaqueue' schema.

There is also one public postgres function called `end_current_job` that is used by the edge function to mark the job as complete.

_Note: that the only the `postgres`, and `service_role` roles are granted priveleges to this schema which means by default the supabase fe client cannot interact with supaque directly._

### The `supaqueue` edge function

The `supaqueue` edge function makes a call to your edge function along with updating the status of the current_job table and tracking whether the edge function call returned successful or not.

_Note: the `supabase service role key` is by default added as a bearer token when calling your edge function. This means if your edge function uses that token to instantiate a supabase client, it will bypass RLS._

## Installation

1. Clone the supaqueue repo locally
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

#### What is added to my supabase project?

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

## Supaqueue Explanation

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
