import { SESSION_COOKIE, verificarSessionCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/errors";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = verificarSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);

  return jsonOk({ authenticated: Boolean(session), session });
}

