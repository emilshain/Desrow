"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Button,
  Field,
  Notice,
  Segmented,
  Spinner,
  TextInput,
  cx,
} from "@/components/ui";
import { parseCsv, type ParsedTable } from "@/lib/csv";
import { isGoogleSheetsUrl, parseSheetGid } from "@/lib/sheets";
import type { SourceKind } from "@/lib/types";

export interface StagedImport {
  kind: SourceKind;
  sourceRef: string;
  suggestedName: string;
  table: ParsedTable;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function ImportPanel({ onParsed }: { onParsed: (staged: StagedImport) => void }) {
  const [mode, setMode] = useState<"file" | "sheet">("file");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptTable = (
    table: ParsedTable,
    meta: { kind: SourceKind; sourceRef: string; suggestedName: string },
  ) => {
    if (!table.columns.length) {
      setError("No columns were found. The first row must contain column headings.");
      return;
    }
    if (!table.rows.length) {
      setError("That source has no data rows.");
      return;
    }
    setError(null);
    onParsed({ ...meta, table });
  };

  const readFile = async (file: File) => {
    setError(null);
    if (!/\.csv$/i.test(file.name)) {
      setError("Choose a .csv file. Google Sheets exports can be downloaded as CSV.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That CSV is larger than 10 MB. Split it into smaller batches.");
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const table = parseCsv(text);
      acceptTable(table, {
        kind: "csv",
        sourceRef: file.name,
        suggestedName: file.name.replace(/\.csv$/i, ""),
      });
    } catch {
      setError("That file could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const fetchSheet = async () => {
    setError(null);
    if (!isGoogleSheetsUrl(sheetUrl)) {
      setError(
        "Paste a Google Sheets link, for example https://docs.google.com/spreadsheets/d/…/edit.",
      );
      return;
    }

    setBusy(true);
    try {
      const gid = parseSheetGid(sheetUrl);
      const params = new URLSearchParams({ url: sheetUrl.trim() });
      if (gid) params.set("gid", gid);

      const response = await fetch(`/api/sheets?${params.toString()}`);
      if (!response.ok) {
        let message = "The sheet could not be fetched.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Non-JSON error body.
        }
        setError(message);
        return;
      }

      const text = await response.text();
      const table = parseCsv(text);
      acceptTable(table, {
        kind: "sheet",
        sourceRef: sheetUrl.trim(),
        suggestedName: "Google Sheet import",
      });
    } catch {
      setError("The sheet could not be fetched. Check your connection and the sharing settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Step 01 · Source</p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.01em] text-paper">
            Import rows and portrait links
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-2">
            One record per row. Every column becomes a template token.
          </p>
        </div>
        <Segmented
          label="Import source"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError(null);
          }}
          options={[
            { value: "file", label: "CSV file" },
            { value: "sheet", label: "Google Sheet" },
          ]}
        />
      </div>

      <div className="mt-5">
        {mode === "file" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
            className={cx(
              "flex min-h-[172px] flex-col items-center justify-center rounded-[12px] border border-dashed px-6 py-8 text-center transition-colors",
              dragging
                ? "border-[rgba(229,211,174,0.55)] bg-[rgba(229,211,174,0.045)]"
                : "border-line bg-black/15",
            )}
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.025] text-accent">
              {busy ? <Spinner /> : <Icon name="upload" size={17} />}
            </span>
            <p className="text-[13.5px] font-medium text-paper">
              {busy ? "Reading source…" : "Drop a CSV here"}
            </p>
            <p className="mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted-2">
              Header row required. Include one column for the person&apos;s name and one
              for a public portrait link. Up to 5,000 records.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              Browse file
            </Button>
          </div>
        ) : (
          <div className="rounded-[12px] border border-line bg-black/15 p-5">
            <Field
              label="Public Google Sheets URL"
              hint="Share → Anyone with the link → Viewer. Private sheets need sign-in and cannot be fetched."
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  value={sheetUrl}
                  onChange={(event) => setSheetUrl(event.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0"
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void fetchSheet();
                  }}
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void fetchSheet()}
                  disabled={busy || !sheetUrl.trim()}
                  className="shrink-0"
                >
                  {busy ? <Spinner /> : <Icon name="link" size={14} />}
                  Fetch sheet
                </Button>
              </div>
            </Field>
            <p className="mt-4 border-t border-line-soft pt-3 font-mono text-[10px] leading-relaxed text-muted-2">
              Reads the sheet&apos;s CSV export · gid honoured · nothing is stored by the
              proxy
            </p>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </section>
  );
}
