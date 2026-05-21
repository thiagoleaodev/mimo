import "server-only";

export const telegramLogLevels = ["INFO", "WARN", "ERROR", "CRITICAL"] as const;

export const telegramLogEvents = [
  "USER_CREATED",
  "EVENT_CREATED",
  "EVENT_DELETED",
  "FEEDBACK_RECEIVED",
  "GIFT_CREATED",
  "GIFT_RESERVED",
  "GIFT_CANCELLED",
  "SHARE_REQUEST_CREATED",
  "SHARE_REQUEST_ACCEPTED",
  "SHARE_REQUEST_REJECTED",
  "AUTH_ERROR",
  "DATABASE_ERROR",
  "UNKNOWN_ERROR",
] as const;

export type TelegramLogLevel = (typeof telegramLogLevels)[number];
export type TelegramLogEvent = (typeof telegramLogEvents)[number];

type TelegramLogUser = {
  email?: string | null;
  id?: string | null;
  name?: string | null;
};

type TelegramLogInput = {
  event: TelegramLogEvent;
  level: TelegramLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  route?: string;
  user?: string | TelegramLogUser | null;
};

const SENSITIVE_KEY_PATTERN =
  /(password|senha|token|secret|cookie|authorization|auth|session|jwt|bearer|api[_-]?key|credit|card|cartao|cvv|cvc|bank|banco|account|iban|pix|payload|body|request)/i;

const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 5;
const MAX_STRING_LENGTH = 300;
const TELEGRAM_TIMEOUT_MS = 5_000;

function isTelegramLoggerEnabled() {
  return process.env.TELEGRAM_LOGGER_ENABLED === "true";
}

function truncate(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) {
    return value;
  }

  if (value instanceof Error) {
    return {
      message: truncate(value.message),
      name: value.name,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return truncate(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (depth >= MAX_DEPTH) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue, depth + 1);
  }

  return sanitized;
}

export function sanitizeTelegramMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return sanitizeValue(metadata) as Record<string, unknown>;
}

function formatUser(user?: TelegramLogInput["user"]) {
  if (!user) {
    return undefined;
  }

  if (typeof user === "string") {
    return user;
  }

  return user.email ?? user.name ?? user.id ?? undefined;
}

function getLogTitle(level: TelegramLogLevel) {
  if (level === "CRITICAL") {
    return "🚨 CRITICO NO MIMO";
  }

  if (level === "ERROR") {
    return "🚨 ERRO NO MIMO";
  }

  if (level === "WARN") {
    return "⚠️ ALERTA NO MIMO";
  }

  return "ℹ️ LOG DO MIMO";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return undefined;
  }

  return JSON.stringify(metadata, null, 2);
}

function buildTelegramMessage(input: TelegramLogInput) {
  const sanitizedMetadata = sanitizeTelegramMetadata(input.metadata);
  const formattedUser = formatUser(input.user);
  const metadata = formatMetadata(sanitizedMetadata);
  const lines = [
    getLogTitle(input.level),
    "",
    `Nivel: ${input.level}`,
    `Evento: ${input.event}`,
    `Ambiente: ${process.env.NODE_ENV ?? "unknown"}`,
    `Mensagem: ${input.message}`,
  ];

  if (formattedUser) {
    lines.push(`Usuario: ${formattedUser}`);
  }

  if (input.route) {
    lines.push(`Rota: ${input.route}`);
  }

  lines.push(`Data: ${formatDate(new Date())}`);

  if (metadata) {
    lines.push("", "Metadata:", metadata);
  }

  return lines.join("\n");
}

export async function sendTelegramLog(input: TelegramLogInput) {
  if (!isTelegramLoggerEnabled()) {
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        body: JSON.stringify({
          chat_id: chatId,
          disable_web_page_preview: true,
          text: buildTelegramMessage(input),
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.warn("Unable to send Telegram log", response.status);
    }
  } catch (error) {
    console.warn("Unable to send Telegram log", error);
  } finally {
    clearTimeout(timeout);
  }
}
