import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Gift, LogOut, UserRound } from "lucide-react";

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
import type { Prisma } from "@/services/generated/prisma/client";

type UserWithCounts = Prisma.UserGetPayload<{
  include: {
    _count: {
      select: {
        events: true;
        ownedReservations: true;
      };
    };
  };
}>;

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
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
    email: user.email ?? "",
    name: fullName ?? name ?? user.email ?? "Usuario",
  };
}

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentUser = getUserDisplay(user);
  let databaseError = false;
  let users: UserWithCounts[] = [];

  try {
    users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            events: true,
            ownedReservations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
  } catch (error) {
    databaseError = true;
    console.error("Unable to load users", error);
  }

  return (
    <main className="min-h-dvh flex-1 bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <Button render={<Link href="/" />} variant="ghost">
            <ArrowLeft />
            Eventos
          </Button>

          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="ghost">
              <LogOut />
              Sair
            </Button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Minha conta</CardTitle>
              <CardDescription>
                Dados do usuario autenticado com Google.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-12 rounded-full border object-cover"
                  src={currentUser.avatarUrl}
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full border bg-muted">
                  <UserRound className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                Pessoas registradas localmente no banco do Mimo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {databaseError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Nao foi possivel carregar os usuarios.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Verifique a DATABASE_URL no .env.local e reinicie o servidor.
                  </p>
                </div>
              ) : users.length > 0 ? (
                <div className="divide-y rounded-lg border">
                  {users.map((appUser) => (
                    <article
                      className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={appUser.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {appUser.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="size-10 rounded-full border object-cover"
                            src={appUser.image}
                          />
                        ) : (
                          <span className="flex size-10 items-center justify-center rounded-full border bg-muted">
                            <UserRound className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {appUser.name ?? appUser.email ?? "Usuario"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {appUser.email ?? "Sem email"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-1 text-xs text-muted-foreground sm:justify-items-end">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDate(appUser.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Gift className="size-3.5" />
                          {appUser._count.events} eventos,{" "}
                          {appUser._count.ownedReservations} reservas
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">
                    Nenhum usuario salvo no banco.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O primeiro registro sera criado quando o usuario criar um
                    evento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
