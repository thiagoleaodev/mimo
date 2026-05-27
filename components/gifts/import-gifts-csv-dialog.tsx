"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import {
  importGiftsFromCsv,
  type ImportGiftCsvState,
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

const initialState: ImportGiftCsvState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function downloadCsvTemplate() {
  const csv = [
    "title,description,price,productUrl,imageUrl",
    "Jogo de panelas,Antiaderente com 5 pecas,249.90,,",
    "Toalha de banho,Branca ou cinza,59.90,,",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = "presentes-mimo.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportGiftsCsvDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    importGiftsFromCsv,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload />
        Importar CSV
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" />
            Importar presentes
          </DialogTitle>
          <DialogDescription>
            Use colunas title, description, price, productUrl e imageUrl. Links
            de lojas com afiliado sao ajustados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} />

          <div className="grid gap-2">
            <Label htmlFor="gift-csv-file">Arquivo CSV</Label>
            <Input
              accept=".csv,text/csv"
              aria-invalid={Boolean(state.errors?.csvFile)}
              id="gift-csv-file"
              name="csvFile"
              required
              type="file"
            />
            <FieldError message={state.errors?.csvFile} />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              Baixe um modelo com as colunas aceitas.
            </span>
            <Button onClick={downloadCsvTemplate} type="button" variant="outline">
              <Download />
              Modelo CSV
            </Button>
          </div>

          {state.errors?.rows?.length ? (
            <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {state.errors.rows.map((error, index) => (
                <p key={`${index}-${error}`}>{error}</p>
              ))}
            </div>
          ) : null}

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
              {isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Importar presentes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
