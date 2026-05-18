"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/services/prisma";

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

const giftSchema = z.object({
  description: z
    .string()
    .trim()
    .max(500, "Use no maximo 500 caracteres.")
    .optional(),
  eventId: z.string().min(1, "Evento invalido."),
  imageUrl: optionalUrl,
  price: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const normalizedValue = value.replace(",", ".");
      return /^\d+(\.\d{1,2})?$/.test(normalizedValue);
    }, "Informe um valor valido, como 129,90.")
    .refine((value) => {
      if (!value) {
        return true;
      }

      return Number(value.replace(",", ".")) <= 999999.99;
    }, "Informe um valor menor."),
  productUrl: optionalUrl,
  title: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(120, "Use no maximo 120 caracteres."),
});

export type CreateGiftState = {
  errors?: Partial<Record<keyof z.infer<typeof giftSchema>, string>>;
  message?: string;
  success?: boolean;
};

function emptyToUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

function normalizePrice(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(",", ".");
}

export async function createGift(
  _previousState: CreateGiftState,
  formData: FormData
): Promise<CreateGiftState> {
  const parsed = giftSchema.safeParse({
    description: formData.get("description"),
    eventId: formData.get("eventId"),
    imageUrl: formData.get("imageUrl"),
    price: formData.get("price"),
    productUrl: formData.get("productUrl"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors as CreateGiftState["errors"],
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
      message: "Faca login com Google para adicionar presentes.",
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
      },
    });

    if (!event) {
      return {
        message: "Voce nao tem permissao para editar este evento.",
        success: false,
      };
    }

    await prisma.gift.create({
      data: {
        description: emptyToUndefined(parsed.data.description),
        eventId: event.id,
        imageUrl: emptyToUndefined(parsed.data.imageUrl),
        price: normalizePrice(parsed.data.price),
        productUrl: emptyToUndefined(parsed.data.productUrl),
        title: parsed.data.title,
      },
    });
  } catch (error) {
    console.error("Unable to create gift", error);

    return {
      message:
        "Nao foi possivel conectar ao banco de dados. Verifique a DATABASE_URL.",
      success: false,
    };
  }

  revalidatePath(`/events/${parsed.data.eventId}/gifts`);

  return {
    message: "Presente adicionado com sucesso.",
    success: true,
  };
}

export async function deleteGift(formData: FormData) {
  const giftId = z.string().min(1).safeParse(formData.get("giftId"));

  if (!giftId.success) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return;
  }

  try {
    const gift = await prisma.gift.findFirst({
      where: {
        id: giftId.data,
        event: {
          owner: {
            email: user.email,
          },
        },
      },
      select: {
        eventId: true,
        reservation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!gift || gift.reservation) {
      return;
    }

    await prisma.gift.delete({
      where: {
        id: giftId.data,
      },
    });

    revalidatePath(`/events/${gift.eventId}/gifts`);
  } catch (error) {
    console.error("Unable to delete gift", error);
  }
}
