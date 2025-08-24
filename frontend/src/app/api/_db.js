import pkg from "pg";
const { Pool } = pkg;

// Use pooled connections; works on Vercel, Render, etc.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // or supply PGHOST, PGUSER, etc.
  // ssl: { rejectUnauthorized: false } // enable if your provider requires SSL
});
