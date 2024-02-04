import fs from "fs/promises";
import pg from "pg";
import dotenv from "dotenv";

type Replacements = {
  [key: string]: string | undefined;
};

// Load environment variables from .env file
dotenv.config();

const client = new pg.Client({
  host: `db.${process.env.PROJECT_REF}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.DB_PASSWORD,
});

// Function to read and replace placeholders in the SQL file
async function prepareSqlFile(filePath: string, replacements: Replacements) {
  let sqlContent = await fs.readFile(filePath, "utf8");
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!value)
      throw new Error(`Value for placeholder ${placeholder} is not defined.`);
    sqlContent = sqlContent.replace(
      new RegExp(`\\[${placeholder}\\]`, "g"),
      value
    );
  }
  return sqlContent;
}

// Function to apply the SQL to the Supabase database
async function applySql(sqlContent: string) {
  try {
    await client.connect();
    await client.query(sqlContent);
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error(`Error applying migrations:`, error);
  } finally {
    await client.end();
  }
}

// Main function to run the script
async function main() {
  try {
    const replacements: Replacements = {
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

await main();
