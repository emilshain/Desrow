"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { PortraitThumb } from "@/components/portrait-thumb";
import {
  Badge,
  Button,
  buttonStyles,
  EmptyState,
  Modal,
  Notice,
  TextInput,
  cx,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { getCell } from "@/lib/csv";
import { deleteDataset } from "@/lib/db";
import { formatRelative } from "@/lib/download";
import { normalizeImageUrl } from "@/lib/drive";
import type { Dataset } from "@/lib/types";

const PAGE_SIZE = 200;

export function DatasetBrowser({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { datasets, loading, refresh } = useWorkspace();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = datasets.find((dataset) => dataset.id === selectedId) ?? datasets[0];

  useEffect(() => {
    setQuery("");
    setLimit(PAGE_SIZE);
  }, [active?.id]);

  const stats = useMemo(() => {
    if (!active) return { linked: 0, named: 0 };
    let linked = 0;
    let named = 0;
    for (const row of active.rows) {
      if (normalizeImageUrl(getCell(row.values, active.mapping.imageColumn))) linked += 1;
      if (getCell(row.values, active.mapping.nameColumn).trim()) named += 1;
    }
    return { linked, named };
  }, [active]);

  const filteredRows = useMemo(() => {
    if (!active) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return active.rows;
    return active.rows.filter((row) =>
      Object.values(row.values).some((value) => value.toLowerCase().includes(needle)),
    );
  }, [active, query]);

  const otherColumns = active
    ? active.columns.filter(
        (column) =>
          column !== active.mapping.nameColumn && column !== active.mapping.imageColumn,
      )
    : [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const nextDataset = datasets.find((dataset) => dataset.id !== deleteTarget.id);
      await deleteDataset(deleteTarget.id);
      if (active?.id === deleteTarget.id) onSelect(nextDataset?.id ?? "");
      await refresh();
      setDeleteTarget(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The dataset could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !datasets.length) {
    return (
      <div className="panel px-6 py-16 text-center text-[12px] text-muted-2">
        Opening local workspace…
      </div>
    );
  }

  if (!datasets.length) {
    return (
      <EmptyState
        icon="source"
        title="No datasets yet"
        description="Import a CSV or a public Google Sheet above. Desrow keeps the original rows and column names, and uses only the two columns you map."
        action={
          <a href="#source-import" className={buttonStyles("primary", "sm")}>
            Choose a source
          </a>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="panel h-fit overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <span className="eyebrow">Datasets</span>
          <span className="mono-meta">{datasets.length}</span>
        </div>
        <div className="max-h-[540px] overflow-y-auto p-2">
          {datasets.map((dataset) => {
            const isActive = active?.id === dataset.id;
            return (
              <div
                key={dataset.id}
                className={cx(
                  "group relative mb-1 rounded-[9px] border transition-colors last:mb-0",
                  isActive
                    ? "border-[rgba(229,211,174,0.24)] bg-[rgba(229,211,174,0.055)]"
                    : "border-transparent hover:border-line-soft hover:bg-white/[0.025]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(dataset.id)}
                  className="w-full px-3 py-2.5 text-left"
                  aria-pressed={isActive}
                >
                  <span
                    className={cx(
                      "block truncate pr-6 text-[12.5px]",
                      isActive ? "text-paper" : "text-paper-dim",
                    )}
                  >
                    {dataset.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-mono text-[9.5px] text-muted-2">
                    <span className="uppercase">
                      {dataset.sourceKind === "csv" ? "CSV" : "Sheet"}
                    </span>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-2" />
                    {dataset.rows.length.toLocaleString()} rows
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(dataset)}
                  className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-[5px] text-muted-2 transition-colors hover:bg-[rgba(224,122,95,0.1)] hover:text-danger group-hover:flex"
                  aria-label={`Delete ${dataset.name}`}
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {active ? (
        <section className="panel min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[16px] font-medium text-paper">{active.name}</h2>
                <Badge>{active.sourceKind === "csv" ? "CSV" : "Google Sheet"}</Badge>
              </div>
              <p
                className="mt-1.5 max-w-xl truncate font-mono text-[10px] text-muted-2"
                title={active.sourceRef}
              >
                {active.sourceRef}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted-2">
                <span>{active.rows.length.toLocaleString()} records</span>
                <span>{stats.linked.toLocaleString()} linked</span>
                <span>{active.columns.length} columns</span>
                <span>updated {formatRelative(active.updatedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/render"
                onClick={() => onSelect(active.id)}
                className={buttonStyles("primary", "sm")}
              >
                Open in render
                <Icon name="arrowRight" size={12} />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(active)}
                aria-label="Delete dataset"
                className="px-2"
              >
                <Icon name="trash" size={14} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-line-soft bg-black/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-2">
              <span className="text-muted">Name</span> ← {active.mapping.nameColumn || "—"}
              <span className="mx-1 h-3 w-px bg-line" />
              <span className="text-muted">Portrait</span> ←{" "}
              {active.mapping.imageColumn || "—"}
            </div>
            <div className="relative w-full sm:w-[220px]">
              <Icon
                name="search"
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2"
              />
              <TextInput
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Filter records"
                className="h-[32px] pl-8 text-[12px]"
                aria-label="Filter records"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line-soft bg-[#0b0c0f]">
                  <th className="w-10 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                    #
                  </th>
                  <th className="w-12 px-2 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                    Portrait
                  </th>
                  <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                    {active.mapping.nameColumn || "Name"}
                  </th>
                  <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                    {active.mapping.imageColumn || "Portrait link"}
                  </th>
                  {otherColumns.map((column) => (
                    <th
                      key={column}
                      className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, limit).map((row, index) => {
                  const name = getCell(row.values, active.mapping.nameColumn);
                  const link = getCell(row.values, active.mapping.imageColumn);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line-soft/70 transition-colors last:border-0 hover:bg-white/[0.018]"
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-2">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-2 py-1.5">
                        <PortraitThumb url={link} alt={name} className="h-[40px] w-[32px]" />
                      </td>
                      <td className="max-w-[220px] px-3 py-2">
                        <span className="block truncate text-[12px] text-paper">
                          {name || <span className="text-muted-2">—</span>}
                        </span>
                      </td>
                      <td className="max-w-[290px] px-3 py-2">
                        <span
                          className={cx(
                            "block truncate font-mono text-[9.5px]",
                            link ? "text-muted-2" : "text-danger/80",
                          )}
                          title={link}
                        >
                          {link || "No portrait link"}
                        </span>
                      </td>
                      {otherColumns.map((column) => (
                        <td key={column} className="max-w-[200px] px-3 py-2">
                          <span
                            className="block truncate text-[11.5px] text-muted"
                            title={row.values[column]}
                          >
                            {row.values[column] || "—"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!filteredRows.length ? (
            <div className="px-5 py-12 text-center text-[12px] text-muted-2">
              No records match “{query}”.
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-black/10 px-5 py-3">
            <span className="font-mono text-[10px] text-muted-2">
              Showing {Math.min(limit, filteredRows.length).toLocaleString()} of{" "}
              {filteredRows.length.toLocaleString()}
            </span>
            {limit < filteredRows.length ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                Load more
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete dataset?"
        description={`“${deleteTarget?.name ?? ""}” and its ${deleteTarget?.rows.length.toLocaleString() ?? 0} records will be removed from this browser. Existing exports are kept.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Keep dataset
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete dataset"}
            </Button>
          </>
        }
      >
        {error ? <Notice tone="error">{error}</Notice> : null}
      </Modal>
    </div>
  );
}
