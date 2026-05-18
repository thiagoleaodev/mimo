import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronRight,
  Gift,
  LogOut,
  MapPin,
} from "lucide-react";

import { GoogleAuthScreen } from "@/components/auth/google-auth-screen";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
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
import type { Event as MimoEvent } from "@/types/prisma";

function getUserDisplay(user: User) {
  const metadata = user.user_metadata as {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };

  return {
    avatarUrl: metadata.avatar_url,
    email: user.email ?? "",
    name: metadata.full_name ?? metadata.name ?? user.email ?? "Usuario",
  };
}

function formatEventDate(date: Date | null) {
  if (!date) {
    return "Data a definir";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function AuthenticatedHome({
  databaseError,
  events,
  user,
}: {
  databaseError?: boolean;
  events: MimoEvent[];
  user: User;
}) {
  const { avatarUrl, email, name } = getUserDisplay(user);

  return (
    <main className="min-h-dvh flex-1 bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              M
            </span>
            Mimo
          </div>

          <div className="flex items-center gap-2">
            <form action="/auth/sign-out" method="post">
              <Button type="submit" variant="ghost">
                <LogOut />
                Sair
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Ola, {name}</CardTitle>
              <CardDescription>
                Comece criando um evento e adicione sugestoes de presentes para
                compartilhar com os convidados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateEventDialog />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Sua conta</CardTitle>
              <CardDescription>
                Autenticado com Google via Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-10 rounded-full border object-cover"
                  src={avatarUrl}
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full border bg-muted">
                  <Gift className="size-4" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
            <CardDescription>
              Acompanhe os eventos criados e continue montando as listas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {databaseError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  Nao foi possivel conectar ao banco de dados.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verifique a DATABASE_URL no .env.local e reinicie o servidor.
                </p>
              </div>
            ) : events.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {events.map((event) => (
                  <Link
                    className="grid gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[1fr_auto] sm:items-center"
                    href={`/events/${event.id}/gifts`}
                    key={event.id}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium">
                          {event.title}
                        </h3>
                        <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                          {event.visibility === "PUBLIC" ? "Publico" : "Privado"}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground sm:justify-end">
                      <div className="grid gap-1">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatEventDate(event.date)}
                        </span>
                        {event.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {event.location}
                          </span>
                        ) : null}
                      </div>
                      <ChevronRight className="size-4" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Nenhum evento criado ainda.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use o botao Criar evento para comecar sua primeira lista.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GoogleAuthScreen />;
  }

  let databaseError = false;
  let events: MimoEvent[] = [];

  if (user.email) {
    try {
      const localUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      events = localUser?.events ?? [];
    } catch (error) {
      databaseError = true;
      console.error("Unable to load user events", error);
    }
  }

  return (
    <AuthenticatedHome
      databaseError={databaseError}
      events={events}
      user={user}
    />
  );
}
