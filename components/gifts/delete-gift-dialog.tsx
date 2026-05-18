"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteGift } from "@/app/events/[eventId]/gifts/actions";
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

export function DeleteGiftDialog({
  disabled,
  giftId,
  giftTitle,
}: {
  disabled?: boolean;
  giftId: string;
  giftTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            aria-label={`Excluir ${giftTitle}`}
            disabled={disabled}
            size="icon-sm"
            variant="destructive"
          />
        }
      >
        <Trash2 />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir presente?</DialogTitle>
          <DialogDescription>
            Esta acao remove o presente {giftTitle} da lista. Nao sera possivel
            desfazer.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form action={deleteGift}>
            <input name="giftId" type="hidden" value={giftId} />
            <Button type="submit" variant="destructive">
              <Trash2 />
              Excluir presente
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
