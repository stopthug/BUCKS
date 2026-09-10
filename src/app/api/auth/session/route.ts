import { handle, ok } from "@/lib/api/respond";
import { destroySession, getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle("auth/session", async () => {
    const session = await getSession();
    if (!session) return ok({ authenticated: false });
    return ok({ authenticated: true, address: session.address });
  });
}

export async function DELETE() {
  return handle("auth/logout", async () => {
    await destroySession();
    return ok({ authenticated: false });
  });
}
