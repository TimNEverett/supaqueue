# Job Dependencies

This add-on gives even more control over the orchestration of jobs in queues, by creating dependencies between jobs. In other words, you can make a job wait until another job (or set of jobs) has successfully completed.

This is incredibly useful when orchestration pipelines of processing, or dealing with an unknown cardinality of tasks.

### Features

- support for 1-1, many-1, 1-many, or many-many dependencies between jobs.
- jobs can depend on jobs from any queue.

### Installation

1. Install base supaqueue in your project.
2. Run `job_dependencies.sql` in your project (via dashboard, psql or migrations)

### Usage

Add the jobs to a queue in supaqueue and delay their execution by setting their status to `null`.

Create dependencies between jobs by adding records to the `supaqueue.job_dependencies` table. When creating dependencies, set the `source` as the id of the job that needs to execute first. Set the `target` as the id of the of the job that needs to wait for the source job to complete.

Lastly, update the status of your jobs to `pending` and call the `supabaqueue.process_jobs()` function to begin processing the jobs.

### Example: Document Summarization Pipeline

We have an app that allows users to upload a document which is then summarized by an LLM.

Here is how the pipeline would work.

1. We execute a job that splits up the document into paragraphs.
2. We queue up N jobs (1 for each paragraph) to summarize the paragraphs with an LLM api call.
3. We queue up a job that takes the summaries from step 2 and turns it into a final summary using another LLM api call. We make this job dependent all jobs from step 2.
4. We set the status from all jobs from 2 and 3 to `pending` and start processing the queue.

The queue will first work through all the jobs from step 2. Once they are complete, the queue will pick up the final job.

The need the queue to process these jobs because we don't know ahead of time how many paragraphs each document will have, it could be 3 or 50.

The queue give us to control over how many paragraphs we can process at one time, and also ensures that we don't execute the final step until all the paragraph summaries are ready.
