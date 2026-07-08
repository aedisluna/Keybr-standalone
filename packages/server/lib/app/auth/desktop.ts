import { type Context, type Middleware, type Next } from "@fastr/core";
import { type SessionState } from "@fastr/middleware-session";
import { User } from "@keybr/database";
import { Logger } from "@keybr/logger";

const LOCAL_PROVIDER = "local";
const LOCAL_EMAIL = "local@keybr.app";
const LOCAL_NAME = "Me";

let localUserId: Promise<number> | null = null;

/**
 * Ensures that a single local account exists in the database and returns its
 * id. The result is memoized for the lifetime of the process. Used by the
 * desktop (offline) build where there is no e-mail/OAuth based login.
 */
export async function ensureLocalUser(): Promise<number> {
  if (localUserId == null) {
    localUserId = (async () => {
      const user = await User.ensure({
        raw: null,
        provider: LOCAL_PROVIDER,
        id: LOCAL_PROVIDER,
        email: LOCAL_EMAIL,
        name: LOCAL_NAME,
        url: null,
        imageUrl: null,
      });
      return user.id!;
    })().catch((err) => {
      // Do not cache a rejected promise so the next request can retry.
      localUserId = null;
      throw err;
    });
  }
  return localUserId;
}

/**
 * Middleware for the desktop build that transparently logs the user into a
 * single local account if there is no active session yet.
 */
export function desktopAutoLogin(): Middleware<SessionState> {
  return async (ctx: Context<SessionState>, next: Next): Promise<void> => {
    const { session } = ctx.state;
    if (session.get("userId") == null) {
      try {
        const userId = await ensureLocalUser();
        session.start();
        session.set("userId", userId);
      } catch (err: any) {
        Logger.error(err, "Desktop auto-login failed");
      }
    }
    await next();
  };
}
