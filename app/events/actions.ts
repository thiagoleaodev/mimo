"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/services/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  backgroundTypeOptions,
  eventThemeOptions,
} from "@/lib/event-theme";

const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um nome com pelo menos 3 caracteres.")
    .max(120, "Use no máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres.")
    .optional(),
  date: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: "Informe uma data válida.",
    }),
  location: z
    .string()
    .trim()
    .max(160, "Use no máximo 160 caracteres.")
    .optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"], {
    error: "Escolha se o evento será privado ou público.",
  }),
});

const updateEventSchema = eventSchema.extend({
  eventId: z.string().min(1, "Evento invalido."),
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor valida.");

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Informe uma URL valida.");

const eventThemeSchema = z.object({
  accentColor: hexColorSchema,
  backgroundType: z.enum(
    backgroundTypeOptions.map((option) => option.value),
    { error: "Escolha um estilo de fundo valido." }
  ),
  backgroundValue: hexColorSchema,
  coverImageUrl: optionalUrl,
  eventId: z.string().min(1, "Evento invalido."),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  theme: z.enum(eventThemeOptions.map((option) => option.value), {
    error: "Escolha um tema valido.",
  }),
});

export type CreateEventState = {
  errors?: Partial<Record<keyof z.infer<typeof eventSchema>, string>>;
  message?: string;
  success?: boolean;
};

export type UpdateEventState = {
  errors?: Partial<Record<keyof z.infer<typeof updateEventSchema>, string>>;
  message?: string;
  success?: boolean;
};

export type UpdateEventThemeState = {
  errors?: Partial<Record<keyof z.infer<typeof eventThemeSchema>, string>>;
  message?: string;
  success?: boolean;
};

function emptyToUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

export async function createEvent(
  _previousState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    location: formData.get("location"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors as CreateEventState["errors"],
      message: "Revise os campos destacados.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      message: "Faça login com Google para criar um evento.",
      success: false,
    };
  }

  const metadata = user.user_metadata as {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };

  try {
    const owner = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        image: metadata.avatar_url,
        name: metadata.full_name ?? metadata.name ?? user.email,
      },
      update: {
        image: metadata.avatar_url,
        name: metadata.full_name ?? metadata.name ?? user.email,
      },
    });

    await prisma.event.create({
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        description: emptyToUndefined(parsed.data.description),
        location: emptyToUndefined(parsed.data.location),
        ownerId: owner.id,
        title: parsed.data.title,
        visibility: parsed.data.visibility,
      },
    });
  } catch (error) {
    console.error("Unable to create event", error);

    return {
      message:
        "Nao foi possivel conectar ao banco de dados. Verifique a DATABASE_URL.",
      success: false,
    };
  }

  revalidatePath("/");

  return {
    message: "Evento criado com sucesso.",
    success: true,
  };
}

export async function updateEvent(
  _previousState: UpdateEventState,
  formData: FormData
): Promise<UpdateEventState> {
  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    location: formData.get("location"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors as UpdateEventState["errors"],
      message: "Revise os campos destacados.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      message: "Faca login com Google para editar o evento.",
      success: false,
    };
  }

  try {
    const event = await prisma.event.findFirst({
      where: {
        id: parsed.data.eventId,
        owner: {
          email: user.email,
        },
      },
      select: {
        id: true,
        shareSlug: true,
      },
    });

    if (!event) {
      return {
        message: "Voce nao tem permissao para editar este evento.",
        success: false,
      };
    }

    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : null,
        description: emptyToUndefined(parsed.data.description),
        location: emptyToUndefined(parsed.data.location),
        title: parsed.data.title,
        visibility: parsed.data.visibility,
      },
    });

    revalidatePath("/");
    revalidatePath(`/events/${event.id}/gifts`);
    revalidatePath(`/lists/${event.shareSlug}`);

    return {
      message: "Evento atualizado com sucesso.",
      success: true,
    };
  } catch (error) {
    console.error("Unable to update event", error);

    return {
      message:
        "Nao foi possivel conectar ao banco de dados. Verifique a DATABASE_URL.",
      success: false,
    };
  }
}

export async function updateEventTheme(
  _previousState: UpdateEventThemeState,
  formData: FormData
): Promise<UpdateEventThemeState> {
  const parsed = eventThemeSchema.safeParse({
    accentColor: formData.get("accentColor"),
    backgroundType: formData.get("backgroundType"),
    backgroundValue: formData.get("backgroundValue"),
    coverImageUrl: formData.get("coverImageUrl"),
    eventId: formData.get("eventId"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    theme: formData.get("theme"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error)
        .fieldErrors as UpdateEventThemeState["errors"],
      message: "Revise os campos destacados.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      message: "Faca login com Google para personalizar o evento.",
      success: false,
    };
  }

  try {
    const event = await prisma.event.findFirst({
      where: {
        id: parsed.data.eventId,
        owner: {
          email: user.email,
        },
      },
      select: {
        id: true,
        shareSlug: true,
      },
    });

    if (!event) {
      return {
        message: "Voce nao tem permissao para editar este evento.",
        success: false,
      };
    }

    await prisma.eventThemeConfig.upsert({
      where: {
        eventId: event.id,
      },
      create: {
        accentColor: parsed.data.accentColor,
        backgroundType: parsed.data.backgroundType,
        backgroundValue: parsed.data.backgroundValue,
        coverImageUrl: emptyToUndefined(parsed.data.coverImageUrl),
        eventId: event.id,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        theme: parsed.data.theme,
      },
      update: {
        accentColor: parsed.data.accentColor,
        backgroundType: parsed.data.backgroundType,
        backgroundValue: parsed.data.backgroundValue,
        coverImageUrl: emptyToUndefined(parsed.data.coverImageUrl),
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        theme: parsed.data.theme,
      },
    });

    revalidatePath(`/events/${event.id}/gifts`);
    revalidatePath(`/lists/${event.shareSlug}`);

    return {
      message: "Identidade visual salva.",
      success: true,
    };
  } catch (error) {
    console.error("Unable to update event theme", error);

    return {
      message:
        "Nao foi possivel conectar ao banco de dados. Verifique a DATABASE_URL.",
      success: false,
    };
  }
}
