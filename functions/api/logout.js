// POST /api/logout — clears the session cookie.
import { json, cookie } from "./_utils.js";

export async function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": cookie("sess", "", { maxAge: 0 }) });
}
