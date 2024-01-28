import { createClient } from "supabase";
import type { CurrentJob, Job, Queue } from "./_supaqueue/database.aliases.ts";

console.log("Execute Current Job Function is running");

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("supaqueue-secret")!;

    if (!authHeader || authHeader !== Deno.env.get("SUPAQUEUE_SECRET")) {
      throw new Error("Invalid Supaqueue secret");
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      throw new Error("Invalid Supabase service role key");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    const { current_job, job, queue } = (await req.json()) as {
      current_job: CurrentJob;
      job: Job;
      queue: Queue;
    };

    let success;
    try {
      let url = queue.api_url;
      if (queue.method == "GET") {
        Object.entries(new Object(job.payload)).forEach(([key, value], idx) => {
          url += `${idx == 0 ? "?" : "&"}${key}=${value}`;
        });
      }
      const resp = await fetch(url, {
        method: queue.method,
        headers: {
          ...Object(queue.default_headers),
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: queue.method == "POST" ? JSON.stringify(job.payload) : undefined,
      });
      const status = resp.status;
      console.log(
        "API status",
        JSON.stringify({ status, queueId: queue.id, jobId: job.id }, null, 2)
      );
      success = resp.ok;
    } catch (error) {
      console.log("API CALL ERROR", error);
      success = false;
    }

    const { error } = await supabase.rpc("end_current_job", {
      cur_job_id: current_job.id,
      _is_complete: true,
      _is_successful: success,
    });

    if (error) {
      throw error;
    }

    return new Response(null, {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
