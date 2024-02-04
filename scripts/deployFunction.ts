import { exec } from "child_process";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Function to deploy the Supabase Edge Function
function deploySupabaseFunction(functionName: string) {
  const command = `supabase functions deploy ${functionName}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(
        `Error deploying function ${functionName}: ${error.message}`
      );
      return;
    }
    // Log standard error output as a warning instead of an error
    if (stderr) {
      console.warn(`Warning: ${stderr}`);
    }
    // Log standard output and confirm deployment
    console.log(`Function ${functionName} deployed successfully:\n${stdout}`);
  });
}

// Main function to run the script
function main() {
  try {
    deploySupabaseFunction("supaqueue");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
