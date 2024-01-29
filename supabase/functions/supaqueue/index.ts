import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Tables } from "./_supaqueue/database.types.ts";

console.log("Execute Current Job Function is running");

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("supaqueue-secret")!;

    if (!authHeader || authHeader !== Deno.env.get("SUPAQUEUE_SECRET")) {
      throw new Error("Invalid Supaqueue secret");
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseURL = Deno.env.get("SUPABASE_URL");

    if (!supabaseURL) throw Error("Invalid Supabase URL");

    if (!serviceRoleKey) throw new Error("Invalid Supabase service role key");

    const supabase = createClient(supabaseURL, serviceRoleKey);

    const { current_job, job, queue } = (await req.json()) as {
      current_job: Tables<"current_job">;
      job: Tables<"job">;
      queue: Tables<"queue">;
    };

    let success;
    try {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${
        queue.edge_function_name
      }`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          ...Object(queue.default_headers),
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(job.payload),
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
