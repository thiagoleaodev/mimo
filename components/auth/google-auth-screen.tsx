import {
  CalendarDays,
  CheckCircle2,
  Gift,
  Link2,
  ListChecks,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 2.99-4.28 2.99-7.42Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.22-2.5c-.89.6-2.03.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.93a6.01 6.01 0 0 1 0-3.86V7.49H3.08a10 10 0 0 0 0 9.02l3.33-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.85-2.85C16.95 2.99 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.49l3.33 2.58C7.2 7.71 9.4 5.95 12 5.95Z"
        fill="#EA4335"
      />
    </svg>
  );
}

const previewGifts = [
  {
    accent: "bg-emerald-500",
    icon: CheckCircle2,
    name: "Jogo de jantar",
    status: "Reservado",
  },
  {
    accent: "bg-sky-500",
    icon: Gift,
    name: "Cafeteira",
    status: "Disponivel",
  },
  {
    accent: "bg-rose-500",
    icon: Sparkles,
    name: "Toalhas de banho",
    status: "Disponivel",
  },
];

const steps = [
  {
    description: "Defina nome, data, local e se a lista sera publica ou privada.",
    icon: CalendarDays,
    title: "Crie o evento",
  },
  {
    description: "Cadastre presentes manualmente, por link ou importe varios via CSV.",
    icon: ListChecks,
    title: "Monte a lista",
  },
  {
    description: "Envie o link para convidados reservarem itens sem duplicidade.",
    icon: Link2,
    title: "Compartilhe",
  },
];

const highlights = [
  {
    icon: Lock,
    text: "Reservas protegidas para um presente nao ser escolhido duas vezes.",
  },
  {
    icon: Users,
    text: "Convidados entram com Google antes de acessar e reservar.",
  },
  {
    icon: Gift,
    text: "Organizador pode editar a lista enquanto o evento acontece.",
  },
];

export function GoogleAuthScreen() {
  return (
    <main className="min-h-dvh flex-1 bg-background text-foreground">
      <section className="relative isolate min-h-[92dvh] overflow-hidden border-b bg-[#f8fbff] px-4 py-5 sm:px-6">
        <div className="absolute inset-0 -z-10 opacity-80">
          <div className="absolute left-1/2 top-24 grid w-[min(58rem,92vw)] -translate-x-1/2 gap-3 sm:top-28 sm:grid-cols-3">
            {previewGifts.map((gift, index) => {
              const Icon = gift.icon;

              return (
                <div
                  className="rounded-lg border bg-white/82 p-4 shadow-sm backdrop-blur-sm"
                  key={gift.name}
                  style={{ transform: `translateY(${index % 2 ? 28 : 0}px)` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-md ${gift.accent} text-white`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{gift.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {gift.status}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-12 left-1/2 w-[min(44rem,86vw)] -translate-x-1/2 rounded-lg border bg-white/78 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Cha de casa nova</p>
                <p className="text-xs text-muted-foreground">
                  12 presentes cadastrados - 7 reservados
                </p>
              </div>
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                Link compartilhado
              </span>
            </div>
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BrandLogo alt="" priority />
            Mimo
          </div>
          <Button
            nativeButton={false}
            render={<a href="/auth/sign-in/google" />}
            variant="outline"
          >
            <GoogleIcon />
            Entrar
          </Button>
        </nav>

        <div className="mx-auto flex min-h-[calc(92dvh-4rem)] w-full max-w-4xl flex-col items-center justify-center py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-md border bg-white/82 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
            <Sparkles className="size-3.5 text-rose-500" />
            Lista de presentes simples para eventos sociais
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight sm:text-6xl">
            Mimo
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Crie eventos, organize sugestoes de presentes e compartilhe uma
            lista onde cada convidado reserva o item que pretende levar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 px-4"
              nativeButton={false}
              render={<a href="/auth/sign-in/google" />}
            >
              <GoogleIcon />
              Criar evento com Google
            </Button>
            <Button
              className="h-11 px-4"
              nativeButton={false}
              render={<a href="#como-funciona" />}
              variant="outline"
            >
              Ver como funciona
            </Button>
          </div>
        </div>
      </section>

      <section
        className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3"
        id="como-funciona"
      >
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <article className="rounded-lg border bg-card p-5" key={step.title}>
              <span className="flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-medium">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="border-y bg-muted/35 px-4 py-12 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold leading-tight">
              Menos mensagens repetidas, mais clareza para todos.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O Mimo centraliza a lista do evento e mostra o que ainda esta
              disponivel. O organizador acompanha tudo sem planilhas soltas ou
              combinados perdidos em conversas.
            </p>
          </div>
          <div className="grid gap-3">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <div
                  className="flex items-start gap-3 rounded-lg border bg-background p-4"
                  key={highlight.text}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {highlight.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold leading-tight">
            Comece pelo primeiro evento.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Entre com Google para criar sua lista, adicionar presentes e
            compartilhar com os convidados.
          </p>
          <Button
            className="mt-6 h-11 px-4"
            nativeButton={false}
            render={<a href="/auth/sign-in/google" />}
          >
            <GoogleIcon />
            Criar evento
          </Button>
        </div>
      </section>
    </main>
  );
}
