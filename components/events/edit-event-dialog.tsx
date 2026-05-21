"use client";

import { useActionState } from "react";
import { Calendar, Loader2, Save } from "lucide-react";

import {
  updateEvent,
  type UpdateEventState,
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

type EditEventDialogProps = {
  event: {
    date: string | null;
    description: string | null;
    id: string;
    location: string | null;
    title: string;
    visibility: "PRIVATE" | "PUBLIC";
  };
};

const initialState: UpdateEventState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function useUpdateEventAction() {
  const [state, formAction, isPending] = useActionState(
    updateEvent,
    initialState
  );

  return { formAction, isPending, state };
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const { formAction, isPending, state } = useUpdateEventAction();

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Calendar />
        Editar evento
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4" />
            Editar evento
          </DialogTitle>
          <DialogDescription>
            Atualize as informacoes principais da lista.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input name="eventId" type="hidden" value={event.id} />

          <div className="grid gap-2">
            <Label htmlFor="edit-event-title">Nome do evento</Label>
            <Input
              aria-invalid={Boolean(state.errors?.title)}
              autoComplete="off"
              defaultValue={event.title}
              id="edit-event-title"
              name="title"
              required
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-event-description">Descricao</Label>
            <Textarea
              aria-invalid={Boolean(state.errors?.description)}
              defaultValue={event.description ?? ""}
              id="edit-event-description"
              maxLength={500}
              name="description"
              rows={4}
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-event-date">Data e horario</Label>
              <Input
                aria-invalid={Boolean(state.errors?.date)}
                defaultValue={event.date ?? ""}
                id="edit-event-date"
                name="date"
                type="datetime-local"
              />
              <FieldError message={state.errors?.date} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-event-visibility">Visibilidade</Label>
              <select
                aria-invalid={Boolean(state.errors?.visibility)}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                )}
                defaultValue={event.visibility}
                id="edit-event-visibility"
                name="visibility"
              >
                <option value="PRIVATE">Privado</option>
                <option value="PUBLIC">Publico</option>
              </select>
              <FieldError message={state.errors?.visibility} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-event-location">Local</Label>
            <Input
              aria-invalid={Boolean(state.errors?.location)}
              autoComplete="street-address"
              defaultValue={event.location ?? ""}
              id="edit-event-location"
              name="location"
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
              {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              Salvar alteracoes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
