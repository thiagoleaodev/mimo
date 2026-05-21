"use client";

import { useActionState, useState } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Calendar,
  Loader2,
  MoreHorizontal,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";

import {
  deleteEvent,
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { formAction, isPending, state } = useUpdateEventAction();

  return (
    <>
      <MenuPrimitive.Root modal={false}>
        <MenuPrimitive.Trigger
          render={<Button aria-label="Opcoes do evento" variant="outline" />}
        >
          <MoreHorizontal />
        </MenuPrimitive.Trigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Positioner align="end" sideOffset={8}>
            <MenuPrimitive.Popup className="z-50 grid min-w-44 gap-1 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <MenuPrimitive.Item
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 outline-none data-highlighted:bg-primary/10"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Editar evento
              </MenuPrimitive.Item>
              <MenuPrimitive.Item
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-destructive outline-none data-highlighted:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Excluir evento
              </MenuPrimitive.Item>
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evento?</DialogTitle>
            <DialogDescription>
              Esta acao remove o evento {event.title}, todos os presentes e as
              reservas vinculadas. Nao sera possivel desfazer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={() => setDeleteOpen(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <form action={deleteEvent}>
              <input name="eventId" type="hidden" value={event.id} />
              <Button type="submit" variant="destructive">
                <Trash2 />
                Excluir evento
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
