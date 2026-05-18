"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/services/prisma";

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
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return;
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
      return;
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
  } catch (error) {
    console.error("Unable to reserve gift", error);
  }
}
