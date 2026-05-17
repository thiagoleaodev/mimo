import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle>Não foi possível entrar</CardTitle>
          <CardDescription>
            A sessão do Google não pôde ser confirmada. Tente iniciar o acesso
            novamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Voltar para o login
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
