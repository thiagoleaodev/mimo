import type { User } from "@supabase/supabase-js";
import { Gift, LogOut, Plus } from "lucide-react";

import { GoogleAuthScreen } from "@/components/auth/google-auth-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function getUserDisplay(user: User) {
  const metadata = user.user_metadata as {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };

  return {
    avatarUrl: metadata.avatar_url,
    email: user.email ?? "",
    name: metadata.full_name ?? metadata.name ?? user.email ?? "Usuário",
  };
}

function AuthenticatedHome({ user }: { user: User }) {
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

          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="ghost">
              <LogOut />
              Sair
            </Button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Olá, {name}</CardTitle>
              <CardDescription>
                Comece criando um evento e adicione sugestões de presentes para
                compartilhar com os convidados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>
                <Plus />
                Criar evento
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Sua conta</CardTitle>
              <CardDescription>Autenticado com Google via Supabase.</CardDescription>
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

  return <AuthenticatedHome user={user} />;
}
