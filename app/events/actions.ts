"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/services/prisma";
import { createClient } from "@/lib/supabase/server";

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

export type CreateEventState = {
  errors?: Partial<Record<keyof z.infer<typeof eventSchema>, string>>;
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
