import jwt from "jsonwebtoken";
import { pool } from "./_db.js";

export default async function handler(req, res) {
  try {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    if (!match) return res.status(200).json({ user: null });

    const token = decodeURIComponent(match[1]);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT id, email, "name", image_url, timezone, created_at
       FROM public.app_user WHERE id = $1`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(200).json({ user: null });
    res.status(200).json({ user: rows[0] });
  } catch {
    res.status(200).json({ user: null });
  }
}
