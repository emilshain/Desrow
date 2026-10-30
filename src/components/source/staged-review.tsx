"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { PortraitThumb } from "@/components/portrait-thumb";
import {
  Badge,
  Button,
  Field,
  Notice,
  Select,
  Spinner,
  TextInput,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import {
  detectMapping,
  getCell,
  type ColumnMapping,
} from "@/lib/csv";
import { saveDataset } from "@/lib/db";
import { uid } from "@/lib/defaults";
import { normalizeImageUrl } from "@/lib/drive";
import type { Dataset } from "@/lib/types";
import type { StagedImport } from "./import-panel";

export function StagedReview({
  staged,
  onCancel,
  onSaved,
}: {
  staged: StagedImport;
  onCancel: () => void;
  onSaved: (dataset: Dataset) => void;
}) {
  const { refresh } = useWorkspace();
  const [name, setName] = useState(staged.suggestedName);
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    detectMapping(staged.table.columns, staged.table.rows),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(staged.suggestedName);
    setMapping(detectMapping(staged.table.columns, staged.table.rows));
    setError(null);
  }, [staged]);

  const stats = useMemo(() => {
    let withPortrait = 0;
    let withName = 0;
    for (const row of staged.table.rows) {
      if (normalizeImageUrl(getCell(row, mapping.imageColumn))) withPortrait += 1;
      if (getCell(row, mapping.nameColumn).trim()) withName += 1;
    }
    return { withPortrait, withName, total: staged.table.rows.length };
  }, [staged, mapping]);

  const previewRows = staged.table.rows.slice(0, 3);
  const canSave =
    Boolean(name.trim()) &&
    Boolean(mapping.nameColumn) &&
    Boolean(mapping.imageColumn) &&
    stats.total > 0 &&
    !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const now = Date.now();
      const dataset: Dataset = {
        id: uid(),
        name: name.trim(),
        sourceKind: staged.kind,
        sourceRef: staged.sourceRef,
        columns: staged.table.columns,
        mapping,
        rows: staged.table.rows.map((values) => ({ id: uid(), values })),
        createdAt: now,
        updatedAt: now,
      };
      await saveDataset(dataset);
      await refresh();
      onSaved(dataset);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The dataset could not be saved to this browser.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Review import</p>
            <Badge tone="accent">{staged.kind === "csv" ? "CSV" : "Google Sheet"}</Badge>
          </div>
          <p className="mt-1.5 truncate text-[12.5px] text-paper-dim" title={staged.sourceRef}>
            {staged.sourceRef}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost btn-sm h-7 w-7 shrink-0 p-0"
          aria-label="Discard import"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <Field label="Dataset name" htmlFor="dataset-name">
            <TextInput
              id="dataset-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Autumn cohort portraits"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name column"
              htmlFor="name-column"
              hint="Used for labels and {{name}} filename tokens."
            >
              <Select
                id="name-column"
                value={mapping.nameColumn}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, nameColumn: event.target.value }))
                }
              >
                <option value="">Select a column</option>
                {staged.table.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Portrait link column"
              htmlFor="image-column"
              hint="Google Drive share links and direct image URLs are supported."
            >
              <Select
                id="image-column"
                value={mapping.imageColumn}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, imageColumn: event.target.value }))
                }
              >
                <option value="">Select a column</option>
                {staged.table.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {staged.table.warnings.length ? (
            <Notice tone="warn">{staged.table.warnings.join(" ")}</Notice>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Rows", value: stats.total.toLocaleString() },
              { label: "Named", value: stats.withName.toLocaleString() },
              { label: "Linked", value: stats.withPortrait.toLocaleString() },
            ].map((item) => (
              <div key={item.label} className="panel-flat px-3.5 py-3">
                <div className="eyebrow">{item.label}</div>
                <div className="mt-1.5 font-serif text-[24px] leading-none text-paper">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {stats.withPortrait < stats.total ? (
            <p className="text-[11px] leading-relaxed text-muted-2">
              {stats.total - stats.withPortrait} record
              {stats.total - stats.withPortrait === 1 ? "" : "s"} have no usable http(s)
              portrait link. They can still be saved, but will be skipped during render
              with a reason.
            </p>
          ) : null}
        </div>

        <div className="rounded-[12px] border border-line bg-[#0a0b0e] p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">First records</span>
            <span className="mono-meta">{staged.table.columns.length} columns</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {previewRows.map((row, index) => (
              <div key={index} className="flex items-center gap-3">
                <PortraitThumb
                  url={getCell(row, mapping.imageColumn)}
                  alt=""
                  className="h-[42px] w-[34px] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-paper">
                    {getCell(row, mapping.nameColumn).trim() || "— no name —"}
                  </p>
                  <p
                    className="mt-0.5 truncate font-mono text-[9.5px] text-muted-2"
                    title={getCell(row, mapping.imageColumn)}
                  >
                    {getCell(row, mapping.imageColumn) || "No portrait link"}
                  </p>
                </div>
                <span className="font-mono text-[9px] text-muted-2">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
            {!previewRows.length ? (
              <p className="text-[12px] text-muted-2">No rows to preview.</p>
            ) : null}
          </div>
          <p className="mt-4 border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-muted-2">
            Only the mapped name and portrait link drive the run. Every column stays
            available as a <span className="font-mono text-paper-dim">{"{{token}}"}</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-black/20 px-5 py-3.5 sm:px-6">
        <p className="text-[11px] text-muted-2">
          Saved locally in IndexedDB. Nothing leaves this browser.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={() => void save()} disabled={!canSave}>
            {saving ? <Spinner /> : <Icon name="check" size={14} />}
            Save dataset
          </Button>
        </div>
      </div>
    </section>
  );
}
