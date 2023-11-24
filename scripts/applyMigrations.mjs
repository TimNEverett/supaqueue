import fs from "fs/promises";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Function to read and replace placeholders in the SQL file
async function prepareSqlFile(filePath, replacements) {
  let sqlContent = await fs.readFile(filePath, "utf8");
  for (const [placeholder, value] of Object.entries(replacements)) {
    sqlContent = sqlContent.replace(
      new RegExp(`\\[${placeholder}\\]`, "g"),
      value
    );
  }
  return sqlContent;
}

// Function to apply the SQL to the Supabase database
async function applySql(sqlContent) {
  const connectionString = `postgresql://postgres:${process.env.DB_PASSWORD}@db.${process.env.PROJECT_REF}.supabase.co:5432/postgres`;

  const client = new pg.Client({
    connectionString,
  });

  try {
    await client.connect();
    await client.query(sqlContent);
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error(`Error applying migrations: ${error.message}`);
  } finally {
    await client.end();
  }
}

// Main function to run the script
async function main() {
  try {
    const replacements = {
      PROJECT_REF: process.env.PROJECT_REF,
      ANON_KEY: process.env.SUPABASE_ANON_KEY,
    };
    const sqlContent = await prepareSqlFile(
      "migrations/supaqueue.sql",
      replacements
    );
    await applySql(sqlContent);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
