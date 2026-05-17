import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleAuthScreen } from "@/components/auth/google-auth-screen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar | Mimo",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <GoogleAuthScreen />;
}
