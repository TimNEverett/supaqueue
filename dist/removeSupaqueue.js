import fs from "fs/promises";
import pg from "pg";
import dotenv from "dotenv";
import { exec } from "child_process";
// Load environment variables from .env file
dotenv.config();
const client = new pg.Client({
    host: `db.${process.env.PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.DB_PASSWORD,
});
// Function to apply the SQL to the Supabase database
async function applySql(sqlContent) {
    try {
        await client.connect();
        await client.query(sqlContent);
        console.log("Migrations applied successfully.");
    }
    catch (error) {
        console.error(`Error applying migrations: ${error}`);
    }
    finally {
        await client.end();
    }
}
async function deleteSupabaseFunction(functionName) {
    const command = `supabase functions delete ${functionName}`;
    console.log("running", command);
    await exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error deleting function ${functionName}: ${error.message}`);
            return;
        }
        // Log standard error output as a warning instead of an error
        if (stderr) {
            console.warn(`Warning: ${stderr}`);
        }
        // Log standard output and confirm deployment
        console.log(`Function ${functionName} deleted successfully:\n${stdout}`);
    });
}
async function removeSupabaseSecret() {
    const command = `supabase secrets unset SUPAQUEUE_SECRET`;
    await exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error removing secret: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error: ${stderr}`);
            return;
        }
        console.log(`Secret successfully removed:\n${stdout}`);
    });
}
// Main function to run the script
async function main() {
    try {
        // remove supaqueue schema from DB, and supaqueue secret from vault
        const removeSQL = await fs.readFile("migrations/remove.sql", "utf8");
        await applySql(removeSQL);
        // remove supaqueue edge function
        deleteSupabaseFunction("supaqueue");
        // remove supaqueue edge function secret
        removeSupabaseSecret();
    }
    catch (error) {
        console.error("An error occurred:", error);
    }
}
main();
