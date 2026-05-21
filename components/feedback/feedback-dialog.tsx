"use client";

import { FormEvent, useId, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const feedbackTypes = ["Bug", "Sugestão", "Dúvida", "Elogio"] as const;

type FeedbackType = (typeof feedbackTypes)[number];
type FeedbackStatus = {
  message: string;
  type: "error" | "success";
};

export function FeedbackDialog() {
  const messageId = useId();
  const typeId = useId();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("Bug");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FeedbackStatus | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 5) {
      setStatus({
        message: "Escreva uma mensagem com pelo menos 5 caracteres.",
        type: "error",
      });
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/feedback", {
        body: JSON.stringify({
          message: trimmedMessage,
          page: window.location.href,
          type: feedbackType,
          userAgent: navigator.userAgent,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setStatus({
          message: "Nao foi possivel enviar agora. Tente novamente.",
          type: "error",
        });
        return;
      }

      setMessage("");
      setStatus({
        message: "Feedback enviado. Obrigado por ajudar nos testes.",
        type: "success",
      });
    } catch {
      setStatus({
        message: "Nao foi possivel enviar agora. Tente novamente.",
        type: "error",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="fixed bottom-4 right-4 z-40 shadow-lg sm:bottom-6 sm:right-6"
            variant="default"
          />
        }
      >
        <MessageSquare />
        Feedback
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Enviar feedback
          </DialogTitle>
          <DialogDescription>
            Conte rapidamente o que encontrou durante os testes.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={typeId}>Tipo do feedback</Label>
            <select
              className={cn(
                "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              )}
              id={typeId}
              name="type"
              onChange={(event) =>
                setFeedbackType(event.target.value as FeedbackType)
              }
              value={feedbackType}
            >
              {feedbackTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={messageId}>Mensagem</Label>
            <Textarea
              id={messageId}
              maxLength={1000}
              name="message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva o bug, sugestao, duvida ou elogio."
              required
              rows={5}
              value={message}
            />
            <p className="text-xs text-muted-foreground">
              Evite enviar senhas, tokens, dados bancarios ou informacoes
              sensiveis.
            </p>
          </div>

          {status ? (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                status.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              {status.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
