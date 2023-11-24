import fs from "fs/promises";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Function to read and replace the placeholder in the SQL file
async function prepareSqlFile(filePath, secret) {
  let sqlContent = await fs.readFile(filePath, "utf8");
  sqlContent = sqlContent.replace(/\[SUPAQUEUE-SECRET\]/g, secret);
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
    console.log("Secret migration applied successfully.");
  } catch (error) {
    console.error(`Error applying secret migration: ${error.message}`);
  } finally {
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
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
