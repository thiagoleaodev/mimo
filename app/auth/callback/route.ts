import { NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramLog } from "@/services/telegram-logger";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }

    await sendTelegramLog({
      event: "AUTH_ERROR",
      level: "WARN",
      message: "Erro ao trocar codigo OAuth por sessao",
      metadata: {
        error,
        next,
      },
      route: "/auth/callback",
    });
  } else {
    await sendTelegramLog({
      event: "AUTH_ERROR",
      level: "WARN",
      message: "Callback OAuth sem codigo",
      metadata: {
        next,
      },
      route: "/auth/callback",
    });
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
