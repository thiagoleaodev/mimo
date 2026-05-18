"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ShareListDialog({ shareSlug }: { shareSlug: string }) {
  const [copied, setCopied] = useState(false);
  const sharePath = `/lists/${shareSlug}`;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return sharePath;
    }

    return new URL(sharePath, window.location.origin).toString();
  }, [sharePath]);

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <LinkIcon />
        Link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link da lista</DialogTitle>
          <DialogDescription>
            Envie este link para os convidados visualizarem e reservarem
            presentes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Input readOnly value={shareUrl} />
          <p className="text-xs text-muted-foreground">
            Convidados precisam entrar com Google para acessar a lista.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={copyShareUrl} type="button" variant="outline">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button render={<Link href={sharePath} />}>
            <ExternalLink />
            Abrir lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
