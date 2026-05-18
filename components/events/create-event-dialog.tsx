"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarPlus, Loader2, Plus } from "lucide-react";

import {
  createEvent,
  type CreateEventState,
} from "@/app/events/actions";
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
import { cn } from "@/lib/utils";

const initialState: CreateEventState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function useCreateEventAction() {
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialState
  );

  return { formAction, isPending, state };
}

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { formAction, isPending, state } = useCreateEventAction();

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button />}
      >
        <Plus />
        Criar evento
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-4" />
            Novo evento
          </DialogTitle>
          <DialogDescription>
            Preencha as informações principais para iniciar a lista de presentes.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Nome do evento</Label>
            <Input
              aria-invalid={Boolean(state.errors?.title)}
              autoComplete="off"
              id="title"
              name="title"
              placeholder="Chá de casa nova"
              required
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              aria-invalid={Boolean(state.errors?.description)}
              id="description"
              maxLength={500}
              name="description"
              placeholder="Conte rapidamente o contexto do evento."
              rows={4}
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="date">Data e horário</Label>
              <Input
                aria-invalid={Boolean(state.errors?.date)}
                id="date"
                name="date"
                type="datetime-local"
              />
              <FieldError message={state.errors?.date} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">Visibilidade</Label>
              <select
                aria-invalid={Boolean(state.errors?.visibility)}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                )}
                defaultValue="PRIVATE"
                id="visibility"
                name="visibility"
              >
                <option value="PRIVATE">Privado</option>
                <option value="PUBLIC">Público</option>
              </select>
              <FieldError message={state.errors?.visibility} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Local</Label>
            <Input
              aria-invalid={Boolean(state.errors?.location)}
              autoComplete="street-address"
              id="location"
              name="location"
              placeholder="Endereço, cidade ou link"
            />
            <FieldError message={state.errors?.location} />
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
              Criar evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
