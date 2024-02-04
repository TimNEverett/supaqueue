import fs from "fs/promises";
import pg from "pg";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
const client = new pg.Client({
    host: `db.${process.env.PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.DB_PASSWORD,
});
// Function to read and replace the placeholder in the SQL file
async function prepareSqlFile(filePath, secret) {
    let sqlContent = await fs.readFile(filePath, "utf8");
    sqlContent = sqlContent.replace(/\[SUPAQUEUE-SECRET\]/g, secret);
    return sqlContent;
}
// Function to apply the SQL to the Supabase database
async function applySql(sqlContent) {
    try {
        await client.connect();
        await client.query(sqlContent);
        console.log("Secret migration applied successfully.");
    }
    catch (error) {
        console.error(`Error applying secret migration:`, error);
    }
    finally {
        await client.end();
    }
}
// Main function to run the script
async function main() {
    try {
        const secret = process.env.SUPAQUEUE_SECRET;
        if (!secret) {
            throw new Error("SUPAQUEUE_SECRET is not set in .env file.");
        }
        const sqlContent = await prepareSqlFile("migrations/secret.sql", secret);
        await applySql(sqlContent);
    }
    catch (error) {
        console.error("An error occurred:", error);
    }
}
await main();
