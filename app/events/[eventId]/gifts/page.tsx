import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Gift,
  Lock,
  MapPin,
  Unlock,
} from "lucide-react";

import { EditEventDialog } from "@/components/events/edit-event-dialog";
import { EventThemeDialog } from "@/components/events/event-theme-dialog";
import { EventThemePreview } from "@/components/events/event-theme-preview";
import { ShareListDialog } from "@/components/events/share-list-dialog";
import { CreateGiftDialog } from "@/components/gifts/create-gift-dialog";
import { GiftActionsMenu } from "@/components/gifts/gift-actions-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/services/prisma";
import { sendTelegramLog } from "@/services/telegram-logger";
import type { Prisma } from "@/services/generated/prisma/client";

type EventWithGifts = Prisma.EventGetPayload<{
  include: {
    gifts: {
      include: {
        reservation: true;
      };
    };
    owner: {
      select: {
        email: true;
        name: true;
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

function formatPrice(price: unknown) {
  if (!price) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(price));
}

function formatDateTimeLocal(date: Date | null) {
  if (!date) {
    return null;
  }

  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function GiftListPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  let event: EventWithGifts | null = null;
  let databaseError = false;

  try {
    event = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [{ visibility: "PUBLIC" }, { owner: { email: user.email } }],
      },
      include: {
        gifts: {
          include: {
            reservation: true,
          },
          orderBy: { createdAt: "desc" },
        },
        themeConfig: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    databaseError = true;
    console.error("Unable to load gift list", error);
    await sendTelegramLog({
      event: "DATABASE_ERROR",
      level: "ERROR",
      message: "Erro ao carregar lista de presentes",
      metadata: {
        error,
        eventId,
      },
      route: `/events/${eventId}/gifts`,
      user: user.email,
    });
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
            <CardContent>
              <Button render={<Link href="/" />} variant="outline">
                <ArrowLeft />
                Voltar
              </Button>
            </CardContent>
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
              <CardTitle>Evento nao encontrado</CardTitle>
              <CardDescription>
                O evento pode ter sido removido ou nao estar disponivel para sua
                conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/" />} variant="outline">
                <ArrowLeft />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const isOwner = event.owner.email === user.email;

  return (
    <main className="min-h-dvh flex-1 bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button render={<Link href="/" />} variant="ghost">
            <ArrowLeft />
            Eventos
          </Button>

          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <EventThemeDialog
                eventId={event.id}
                themeConfig={event.themeConfig}
              />
              <CreateGiftDialog eventId={event.id} />
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                    {isOwner ? (
                      <EditEventDialog
                        event={{
                          date: formatDateTimeLocal(event.date),
                          description: event.description,
                          id: event.id,
                          location: event.location,
                          title: event.title,
                          visibility: event.visibility,
                        }}
                      />
                    ) : null}
                  </div>
                  <CardDescription className="mt-2">
                    {event.description ??
                      "Lista de presentes compartilhada para este evento."}
                  </CardDescription>
                </div>
                <EventThemePreview
                  className="h-24 sm:w-36"
                  themeConfig={event.themeConfig}
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4" />
                {formatEventDate(event.date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" />
                {event.location ?? "Local a definir"}
              </span>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Compartilhamento</CardTitle>
              <CardDescription>
                {event.visibility === "PUBLIC"
                  ? "Qualquer convidado com link pode acessar."
                  : "Somente pessoas autorizadas devem receber o link."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                {event.visibility === "PUBLIC" ? (
                  <Unlock className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
                {event.visibility === "PUBLIC" ? "Publico" : "Privado"}
              </span>
              <ShareListDialog shareSlug={event.shareSlug} />
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Lista de presentes</CardTitle>
            <CardDescription>
              {event.gifts.length} {event.gifts.length === 1 ? "item" : "itens"}
              {" "}cadastrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.gifts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {event.gifts.map((gift) => {
                  const price = formatPrice(gift.price);

                  return (
                    <article className="rounded-lg border p-4" key={gift.id}>
                      <div className="flex items-start gap-3">
                        {gift.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="size-14 rounded-md border object-cover"
                            src={gift.imageUrl}
                          />
                        ) : (
                          <span className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted">
                            <Gift className="size-5 text-muted-foreground" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-medium">
                              {gift.title}
                            </h3>
                            <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                              {gift.reservation ? "Reservado" : "Disponivel"}
                            </span>
                          </div>
                          {gift.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {gift.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                          {price ?? "Sem preco"}
                        </span>
                        <div className="flex items-center gap-2">
                          {gift.productUrl ? (
                            <Button
                              render={<Link href={gift.productUrl} />}
                              size="sm"
                              variant="outline"
                            >
                              Ver item
                            </Button>
                          ) : null}
                          {isOwner ? (
                            <GiftActionsMenu
                              giftId={gift.id}
                              giftTitle={gift.title}
                              isReserved={Boolean(gift.reservation)}
                            />
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <Gift className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">
                  Nenhum presente cadastrado ainda.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione sugestoes para seus convidados reservarem.
                </p>
                {isOwner ? (
                  <div className="mt-4 flex justify-center">
                    <CreateGiftDialog eventId={event.id} />
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
