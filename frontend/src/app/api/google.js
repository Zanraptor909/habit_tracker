import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { pool } from "../_db.js";
import { sessionCookie } from "../_cookie.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: "Missing credential" });

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name || null;
    const image_url = payload.picture || null;

    // Upsert into app_user (matches your schema)
    const upsertSql = `
      INSERT INTO public.app_user (email, "name", image_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE
        SET "name" = COALESCE(EXCLUDED."name", public.app_user."name"),
            image_url = COALESCE(EXCLUDED.image_url, public.app_user.image_url)
      RETURNING id, email, "name", image_url, timezone, created_at
    `;
    const { rows } = await pool.query(upsertSql, [email, name, image_url]);
    const user = rows[0];

    // Issue our own session JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.setHeader("Set-Cookie", sessionCookie(token));
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid Google credential" });
  }
}
