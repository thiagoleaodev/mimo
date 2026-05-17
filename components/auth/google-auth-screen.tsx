import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function GoogleAuthScreen() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border bg-card shadow-sm md:grid-cols-[1fr_380px]">
        <div className="flex min-h-[260px] flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-8 md:min-h-[520px]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary-foreground text-primary">
              M
            </span>
            Mimo
          </div>

          <div className="max-w-md space-y-3">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Organize presentes sem complicar o evento.
            </h1>
            <p className="text-sm leading-6 text-primary-foreground/72 sm:text-base">
              Entre com sua conta Google para criar eventos, montar listas e
              acompanhar reservas em poucos passos.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full rounded-lg border-0 bg-transparent shadow-none ring-0">
            <CardHeader className="px-0 text-center sm:text-left">
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>
                Use uma conta Google para acessar o Mimo.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Button
                className="h-11 w-full gap-2"
                nativeButton={false}
                render={<a href="/auth/sign-in/google" />}
                variant="outline"
              >
                <GoogleIcon />
                Continuar com Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
