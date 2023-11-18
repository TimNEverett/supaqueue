# Add ons

There are various add-ons that can be installed to supaqueue to enable extra features/functionality.

Add-ons will contain sql files that should be applied to the database after the main supaqueue.sql file.

Add-ons may also need to replace or add more edge functions, depending on the set of features.

# Available Add ons

### Job Dependencies

This add-on gives even more control over the orchestration of jobs in queues, by creating dependencies between jobs. In other words, you can make a job wait until another job (or set of jobs) has successfully completed.

This is incredibly useful when orchestration pipelines of processing, or dealing with an unknown cardinality of tasks.
