import fs from "fs/promises";
import dotenv from "dotenv";
import { exec } from "child_process";
import { getPgClient } from "./getPgClient.js";
// Load environment variables from .env file
dotenv.config();
const client = getPgClient();
// Function to apply the SQL to the Supabase database
async function applySql(sqlContent) {
    try {
        await client.connect();
        await client.query(sqlContent);
        console.log("Migrations applied successfully.");
    }
    catch (error) {
        console.error(`Error applying migrations:`, error);
    }
    finally {
        await client.end();
    }
}
async function deleteSupabaseFunction(functionName) {
    const command = `supabase functions delete ${functionName}`;
    console.log("running", command);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error deleting function ${functionName}: ${error.message}`);
                reject(error);
            }
            // Log standard error output as a warning instead of an error
            if (stderr) {
                console.warn(`Warning: ${stderr}`);
            }
            // Log standard output and confirm deployment
            console.log(`Function ${functionName} deleted successfully:\n${stdout}`);
            resolve(stdout);
        });
    });
}
async function removeSupabaseSecret() {
    const command = `supabase secrets unset SUPAQUEUE_SECRET`;
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error removing secret: ${error.message}`);
                reject;
            }
            if (stderr) {
                console.error(`Error: ${stderr}`);
            }
            console.log(`Secret successfully removed:\n${stdout}`);
            resolve(stdout);
        });
    });
}
// Main function to run the script
async function main() {
    try {
        // remove supaqueue schema from DB, and supaqueue secret from vault
        const removeSQL = await fs.readFile("migrations/remove.sql", "utf8");
        await applySql(removeSQL);
        // remove supaqueue edge function
        await deleteSupabaseFunction("supaqueue");
        // remove supaqueue edge function secret
        await removeSupabaseSecret();
    }
    catch (error) {
        console.error("An error occurred:", error);
    }
}
await main();
