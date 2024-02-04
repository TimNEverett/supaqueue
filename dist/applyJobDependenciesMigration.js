import fs from "fs/promises";
import dotenv from "dotenv";
import { getPgClient } from "./getPgClient.js";
// Load environment variables from .env file
dotenv.config();
const client = getPgClient();
// Function to read and replace the placeholder in the SQL file
async function prepareSqlFile(filePath) {
    const sqlContent = await fs.readFile(filePath, "utf8");
    return sqlContent;
}
// Function to apply the SQL to the Supabase database
async function applySql(sqlContent) {
    try {
        await client.connect();
        await client.query(sqlContent);
        console.log("job_dependencies migration applied successfully.");
    }
    catch (error) {
        console.error("Error applying job_dependencies migration:", error);
    }
    finally {
        await client.end();
    }
}
// Main function to run the script
async function main() {
    try {
        const sqlContent = await prepareSqlFile("add-ons/job_dependencies/job_dependencies.sql");
        await applySql(sqlContent);
    }
    catch (error) {
        console.error("An error occurred:", error);
    }
}
await main();
