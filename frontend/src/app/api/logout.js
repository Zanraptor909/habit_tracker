import { clearCookie } from "./_cookie.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", clearCookie());
  res.status(200).json({ ok: true });
}
