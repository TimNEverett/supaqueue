# TODO

## Changes

- [x] make all trigger function names follow the format [before/after]-[insert/update]-[table_name]-tg-fn
- [x] make all trigger names follow the format [before/after]-[insert/update]-[table_name]-tg
- [x] extract all functions currently in tg functions into their own functions (for resusability)
  - e.g: process-jobs is good
- [x] update all trigger functions to be wrappers that use other named functions (for readability and resuability)
- [x] ensure there are unique constraints on the job and worker columns of the current_job table
- [x] test out using the 'skip locked' line in the process jobs functions
- [x] update the vault secret from supabase_serevice_role key to supaqueue_secret

  - [x] in the vault
  - [x] in the pg function that calls the edge function
  - [x] in the edge funciton itself (must be added to env variables)

- [x] add an 'updated_at' column and tg to the jobs table, default now()s
  - [x] sort the jobs in the process_jobs table on updated_at
  - [x] add attempts filtering to the processing jobs fn.
- [ ] support HTTP Methods (pass payload as body of req)
  - [x] POST
  - [x] GET (currently payload gets passed as query params, not body)
  - [ ] PATCH
  - [ ] DELETE
- [ ] support explicit body and query params

  - should I make different paths? or use if/else in one function call?

- [x] UPDATE THE `migration.sql` file with changes
- [x] update the readme.md file with changes.

## Testing

- [x] multiple concurrent queues
- [ ] long running api calls
- [x] adding a job to the queue while queue is being processed
- [ ] adding an API secret to the queue
- [ ] calling a real edge function.

## Feature Ideas

- [ ] timebase rate limiting per queue
- [ ] capturing the results of a job in the job table
- [ ] capturing an array of errors from a job in the job table
- [ ] add cron to 'kick' the queue every minute.
- [ ] adding in crons to clean up jobs table every [day/week/month]
- [ ] host the edge function in a node package, and make it importable to a custom edge function, scuh that users don't need to copy and paste code, just update version # for updated edge function.
