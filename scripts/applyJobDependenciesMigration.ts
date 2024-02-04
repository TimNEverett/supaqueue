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
async function prepareSqlFile(filePath: string) {
  let sqlContent = await fs.readFile(filePath, "utf8");
  return sqlContent;
}

// Function to apply the SQL to the Supabase database
async function applySql(sqlContent: string) {
  try {
    await client.connect();
    await client.query(sqlContent);
    console.log("job_dependencies migration applied successfully.");
  } catch (error) {
    console.error(`Error applying job_dependencies migration: ${error}`);
  } finally {
    await client.end();
  }
}

// Main function to run the script
async function main() {
  try {
    const sqlContent = await prepareSqlFile(
      "add-ons/job_dependencies/job_dependencies.sql"
    );
    await applySql(sqlContent);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
