import { NextResponse, type NextRequest } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramLog } from "@/services/telegram-logger";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = getSafeRedirectPath(searchParams.get("next"));

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    await sendTelegramLog({
      event: "AUTH_ERROR",
      level: "WARN",
      message: "Erro ao iniciar login com Google",
      metadata: {
        error,
        hasRedirectUrl: Boolean(data.url),
        next,
      },
      route: "/auth/sign-in/google",
    });

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth");

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
