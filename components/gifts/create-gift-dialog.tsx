"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Gift, Loader2, Plus } from "lucide-react";

import {
  createGift,
  type CreateGiftState,
} from "@/app/events/[eventId]/gifts/actions";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateGiftState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function useCreateGiftAction() {
  const [state, formAction, isPending] = useActionState(
    createGift,
    initialState
  );

  return { formAction, isPending, state };
}

export function CreateGiftDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { formAction, isPending, state } = useCreateGiftAction();

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Adicionar presente
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-4" />
            Novo presente
          </DialogTitle>
          <DialogDescription>
            Adicione uma sugestao para os convidados reservarem.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} />

          <div className="grid gap-2">
            <Label htmlFor="gift-title">Nome do presente</Label>
            <Input
              aria-invalid={Boolean(state.errors?.title)}
              autoComplete="off"
              id="gift-title"
              name="title"
              placeholder="Jogo de panelas"
              required
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-description">Descricao</Label>
            <Textarea
              aria-invalid={Boolean(state.errors?.description)}
              id="gift-description"
              maxLength={500}
              name="description"
              placeholder="Tamanho, cor, modelo ou observacoes importantes."
              rows={3}
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gift-price">Preco estimado</Label>
              <Input
                aria-invalid={Boolean(state.errors?.price)}
                id="gift-price"
                inputMode="decimal"
                name="price"
                placeholder="129,90"
              />
              <FieldError message={state.errors?.price} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gift-product-url">Link do produto</Label>
              <Input
                aria-invalid={Boolean(state.errors?.productUrl)}
                id="gift-product-url"
                name="productUrl"
                placeholder="https://loja.com/item"
                type="url"
              />
              <FieldError message={state.errors?.productUrl} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-image-url">Imagem</Label>
            <Input
              aria-invalid={Boolean(state.errors?.imageUrl)}
              id="gift-image-url"
              name="imageUrl"
              placeholder="https://loja.com/imagem.jpg"
              type="url"
            />
            <FieldError message={state.errors?.imageUrl} />
          </div>

          {state.message && !state.success ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          {state.message && state.success ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {state.message}
            </p>
          ) : null}

          <DialogFooter className="mt-2">
            <Button disabled={isPending} type="submit">
              {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              Adicionar presente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
