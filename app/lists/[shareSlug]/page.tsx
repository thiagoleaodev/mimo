import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, UserRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { SharedGiftListView } from "@/components/lists/shared-gift-list-view";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getEventThemeStyles } from "@/lib/event-theme";
import { prisma } from "@/services/prisma";
import type { Prisma } from "@/services/generated/prisma/client";

type SharedEvent = Prisma.EventGetPayload<{
  include: {
    gifts: {
      include: {
        reservation: {
          include: {
            owner: {
              select: {
                email: true;
                image: true;
                name: true;
              };
            };
          };
        };
      };
    };
    themeConfig: true;
  };
}>;

function formatEventDate(date: Date | null) {
  if (!date) {
    return "Data a definir";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getUserDisplay(user: {
  email?: string;
  user_metadata: Record<string, unknown>;
}) {
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  const name =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : undefined;

  return {
    avatarUrl,
    name: fullName ?? name ?? user.email ?? "Usuario",
  };
}

export default async function SharedGiftListPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/login?next=/lists/${shareSlug}`);
  }

  const currentUser = getUserDisplay(user);
  let event: SharedEvent | null = null;
  let databaseError = false;

  try {
    event = await prisma.event.findUnique({
      where: {
        shareSlug,
      },
      include: {
        gifts: {
          include: {
            reservation: {
              include: {
                owner: {
                  select: {
                    email: true,
                    image: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        themeConfig: true,
      },
    });
  } catch (error) {
    databaseError = true;
    console.error("Unable to load shared list", error);
  }

  if (databaseError) {
    return (
      <main className="min-h-dvh flex-1 bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Nao foi possivel carregar a lista</CardTitle>
              <CardDescription>
                Verifique a DATABASE_URL no .env.local e reinicie o servidor.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-dvh flex-1 bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Lista nao encontrada</CardTitle>
              <CardDescription>
                O link pode estar incorreto ou a lista nao esta mais disponivel.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  const gifts = event.gifts.map((gift) => ({
    description: gift.description,
    id: gift.id,
    imageUrl: gift.imageUrl,
    price: gift.price?.toString() ?? null,
    productUrl: gift.productUrl,
    reserved: Boolean(gift.reservation),
    reservedByCurrentUser: gift.reservation?.owner.email === user.email,
    reservedByImage: gift.reservation?.owner.image ?? null,
    reservedByName: gift.reservation?.owner.name ?? gift.reservation?.owner.email ?? null,
    title: gift.title,
  }));
  const themeStyles = getEventThemeStyles(event.themeConfig);

  return (
    <main className="min-h-dvh flex-1 bg-background" style={themeStyles}>
      <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo priority />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                Lista de presentes
              </p>
            </div>
          </div>

          <Link
            aria-label="Ver seus eventos"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/"
            title="Ver seus eventos"
          >
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={currentUser.name}
                className="size-10 rounded-full border object-cover"
                src={currentUser.avatarUrl}
              />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full border bg-muted">
                <UserRound className="size-4" />
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        {event.themeConfig?.coverImageUrl ? (
          <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="aspect-[16/7] w-full object-cover"
              src={event.themeConfig.coverImageUrl}
            />
          </section>
        ) : null}

        <section className="grid gap-3 rounded-lg border bg-background/90 p-4 shadow-sm backdrop-blur sm:p-6">
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Lista de presentes
          </span>
          <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            {event.title}
          </h1>
          {event.description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {event.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {formatEventDate(event.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              {event.location ?? "Local a definir"}
            </span>
          </div>
        </section>

        <SharedGiftListView gifts={gifts} shareSlug={shareSlug} />
      </div>
    </main>
  );
}
