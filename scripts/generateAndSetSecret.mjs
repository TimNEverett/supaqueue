import { randomBytes } from "crypto";
import { exec } from "child_process";
import fs from "fs/promises";

// Function to generate a random secret
function generateSecret() {
  return randomBytes(16).toString("hex");
}

// Function to set the secret in the Supabase project
function setSupabaseSecret(secret) {
  const command = `supabase secrets set SUPAQUEUE_SECRET=${secret}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error setting secret: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(`Secret set successfully:\n${stdout}`);
  });
}

// Main function to run the script
async function main() {
  try {
    const secret = generateSecret();
    setSupabaseSecret(secret);
    await fs.writeFile(".env", `SUPAQUEUE_SECRET=${secret}\n`, { flag: "a" });
    console.log("SUPAQUEUE_SECRET saved to .env file.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
