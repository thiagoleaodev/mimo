"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { Prisma } from "@/services/generated/prisma/client";
import { prisma } from "@/services/prisma";

type ReserveGiftResult = {
  message: string;
  status: "error" | "success";
};

export async function reserveGift(formData: FormData) {
  const parsed = z
    .object({
      giftId: z.string().min(1),
      shareSlug: z.string().min(1),
    })
    .safeParse({
      giftId: formData.get("giftId"),
      shareSlug: formData.get("shareSlug"),
    });

  if (!parsed.success) {
    return {
      message: "Nao foi possivel identificar o presente.",
      status: "error",
    } satisfies ReserveGiftResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      message: "Entre novamente para reservar este presente.",
      status: "error",
    } satisfies ReserveGiftResult;
  }

  const metadata = user.user_metadata as {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };

  try {
    const gift = await prisma.gift.findFirst({
      where: {
        id: parsed.data.giftId,
        event: {
          shareSlug: parsed.data.shareSlug,
        },
      },
      select: {
        id: true,
        reservation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!gift || gift.reservation) {
      return {
        message: "Este presente ja foi reservado.",
        status: "error",
      } satisfies ReserveGiftResult;
    }

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

    await prisma.giftReservation.create({
      data: {
        giftId: gift.id,
        ownerId: owner.id,
      },
    });

    revalidatePath(`/lists/${parsed.data.shareSlug}`);

    return {
      message: "Reserva confirmada.",
      status: "success",
    } satisfies ReserveGiftResult;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        message: "Este presente ja foi reservado.",
        status: "error",
      } satisfies ReserveGiftResult;
    }

    console.error("Unable to reserve gift", error);

    return {
      message: "Nao foi possivel reservar agora. Tente novamente.",
      status: "error",
    } satisfies ReserveGiftResult;
  }
}
