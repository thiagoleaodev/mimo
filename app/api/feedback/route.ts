import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sendTelegramLog } from "@/services/telegram-logger";

const feedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(5, "Mensagem muito curta.")
    .max(1000, "Mensagem muito longa."),
  page: z.string().trim().max(500).optional(),
  type: z.enum(["Bug", "Sugestão", "Dúvida", "Elogio"]),
  userAgent: z.string().trim().max(500).optional(),
});

function getSafePage(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return value.startsWith("/") ? value.slice(0, 500) : undefined;
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { message: "Payload invalido.", success: false },
      { status: 400 }
    );
  }

  const parsed = feedbackSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { message: "Revise os campos do feedback.", success: false },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadata = user?.user_metadata as
    | {
        full_name?: string;
        name?: string;
      }
    | undefined;
  const safePage = getSafePage(parsed.data.page);
  const userAgent =
    request.headers.get("user-agent") ?? parsed.data.userAgent ?? undefined;

  try {
    await sendTelegramLog({
      event: "FEEDBACK_RECEIVED",
      level: "INFO",
      message: `Feedback recebido: ${parsed.data.type}`,
      metadata: {
        date: new Date().toISOString(),
        email: user?.email,
        message: parsed.data.message,
        name: metadata?.full_name ?? metadata?.name,
        page: safePage,
        type: parsed.data.type,
        userAgent,
        userId: user?.id,
      },
      route: safePage,
      user: user
        ? {
            email: user.email,
            id: user.id,
            name: metadata?.full_name ?? metadata?.name,
          }
        : null,
    });
  } catch (error) {
    console.warn("Unable to send feedback log", error);
  }

  return Response.json({ success: true });
}
