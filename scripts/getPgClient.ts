import pg from "pg";
export const getPgClient = () => {
  return new pg.Client({
    host: "aws-0-ca-central-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    user: `postgres.${process.env.PROJECT_REF}`,
    password: process.env.DB_PASSWORD,
  });
};
