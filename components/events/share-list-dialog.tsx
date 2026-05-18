"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, LinkIcon } from "lucide-react";
import QRCode from "qrcode";

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const sharePath = `/lists/${shareSlug}`;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return sharePath;
    }

    return new URL(sharePath, window.location.origin).toString();
  }, [sharePath]);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 220,
    })
      .then((url) => {
        if (active) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setQrCodeUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [shareUrl]);

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

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Input readOnly value={shareUrl} />
            <p className="text-xs text-muted-foreground">
              Convidados precisam entrar com Google para acessar a lista.
            </p>
          </div>

          <div className="grid justify-items-center gap-3 rounded-lg border bg-muted/30 p-4">
            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`QR code para ${shareUrl}`}
                className="size-44 rounded-md border bg-white p-2"
                src={qrCodeUrl}
              />
            ) : (
              <div className="grid size-44 place-items-center rounded-md border bg-background text-sm text-muted-foreground">
                Gerando QR code
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Escaneie para abrir a lista de presentes.
            </p>
          </div>
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
