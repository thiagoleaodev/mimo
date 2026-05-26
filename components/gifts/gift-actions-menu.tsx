"use client";

import { useState } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CircleX, MoreHorizontal, Trash2 } from "lucide-react";

import {
  cancelGiftReservationAsOwner,
  deleteGift,
} from "@/app/events/[eventId]/gifts/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GiftActionsMenu({
  giftId,
  giftTitle,
  isReserved,
}: {
  giftId: string;
  giftTitle: string;
  isReserved: boolean;
}) {
  const [cancelReservationOpen, setCancelReservationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <MenuPrimitive.Root modal={false}>
        <MenuPrimitive.Trigger
          render={
            <Button
              aria-label={`Detalhes de ${giftTitle}`}
              size="icon-sm"
              variant="outline"
            />
          }
        >
          <MoreHorizontal />
        </MenuPrimitive.Trigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Positioner align="end" sideOffset={8}>
            <MenuPrimitive.Popup className="z-50 grid min-w-48 gap-1 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              {isReserved ? (
                <MenuPrimitive.Item
                  className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-destructive outline-none data-highlighted:bg-destructive/10"
                  onClick={() => setCancelReservationOpen(true)}
                >
                  <CircleX className="size-4" />
                  Cancelar reserva
                </MenuPrimitive.Item>
              ) : null}
              <MenuPrimitive.Item
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-destructive outline-none data-highlighted:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Excluir presente
              </MenuPrimitive.Item>
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>

      <Dialog
        open={cancelReservationOpen}
        onOpenChange={setCancelReservationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva?</DialogTitle>
            <DialogDescription>
              Esta acao libera o presente {giftTitle} para que outro convidado
              possa reservar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={() => setCancelReservationOpen(false)}
              type="button"
              variant="outline"
            >
              Voltar
            </Button>
            <form action={cancelGiftReservationAsOwner}>
              <input name="giftId" type="hidden" value={giftId} />
              <Button type="submit" variant="destructive">
                <CircleX />
                Cancelar reserva
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir presente?</DialogTitle>
            <DialogDescription>
              Esta acao remove o presente {giftTitle} da lista. Nao sera
              possivel desfazer.
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
    </>
  );
}
