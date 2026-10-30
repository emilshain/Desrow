"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  buttonStyles,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  Spinner,
  cx,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { deleteRun, getRunItems } from "@/lib/db";
import { downloadBlob, formatBytes, formatDateTime } from "@/lib/download";
import { slugify } from "@/lib/tokens";
import type { RenderItem, RunSummary } from "@/lib/types";
import { buildExportZip } from "@/lib/zip";

function statusTone(status: RunSummary["status"]) {
  if (status === "completed") return "ok" as const;
  if (status === "partial") return "danger" as const;
  if (status === "cancelled") return "warn" as const;
  return "warn" as const;
}

function statusLabel(status: RunSummary["status"]) {
  if (status === "running") return "Interrupted";
  if (status === "cancelled") return "Cancelled";
  if (status === "partial") return "Partial";
  return "Completed";
}

export default function ExportsPage() {
  const { runs, datasets, refresh, loading } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<RenderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RunSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runs.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !runs.some((run) => run.id === selectedId)) {
      setSelectedId(runs[0].id);
    }
  }, [runs, selectedId]);

  const selected = runs.find((run) => run.id === selectedId) ?? null;
  const dataset = selected
    ? datasets.find((entry) => entry.id === selected.datasetId) ?? null
    : null;

  useEffect(() => {
    if (!selected) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setItemsLoading(true);
    setError(null);

    getRunItems(selected.id)
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "This batch could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const rendered = useMemo(
    () => items.filter((item) => item.status === "rendered"),
    [items],
  );
  const failed = items.filter((item) => item.status === "failed").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const totalBytes = rendered.reduce((total, item) => total + (item.bytes ?? 0), 0);
  const aspect =
    rendered[0]?.width && rendered[0]?.height
      ? rendered[0].width / rendered[0].height
      : 3 / 4;

  const removeRun = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const next = runs.find((run) => run.id !== deleteTarget.id);
      await deleteRun(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelectedId(next?.id ?? null);
      await refresh();
      setDeleteTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The batch could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const downloadZip = async () => {
    if (!selected || !rendered.length || zipBusy) return;
    setZipBusy(true);
    setError(null);
    try {
      const blob = await buildExportZip(selected, dataset, items);
      downloadBlob(blob, `${slugify(selected.name, "desrow-batch")}.zip`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The ZIP could not be generated.",
      );
    } finally {
      setZipBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Exports"
        title="Contact sheets, kept."
        description="Every completed batch is stored in this browser with its full-resolution frames, a CSV manifest and the recipe used to make it."
        actions={
          <Link href="/render" className={buttonStyles("primary", "md")}>
            <Icon name="play" size={13} />
            New batch
          </Link>
        }
      />

      {!runs.length && !loading ? (
        <EmptyState
          icon="archive"
          title="No batches exported yet"
          description="Run a batch from the render bench. Rendered frames, failures and the processing recipe are saved here automatically."
          action={
            <Link href="/render" className={buttonStyles("secondary", "sm")}>
              Open the render bench
            </Link>
          }
        />
      ) : null}

      {runs.length ? (
        <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="panel h-fit overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <span className="eyebrow">Batches</span>
              <span className="mono-meta">{runs.length}</span>
            </div>
            <div className="max-h-[620px] overflow-y-auto p-2">
              {runs.map((run) => {
                const active = selected?.id === run.id;
                return (
                  <div
                    key={run.id}
                    className={cx(
                      "mb-1 rounded-[8px] border transition-colors last:mb-0",
                      active
                        ? "border-[rgba(229,211,174,0.22)] bg-[rgba(229,211,174,0.05)]"
                        : "border-transparent hover:border-line-soft hover:bg-white/[0.025]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(run.id)}
                      className="w-full px-3 py-2.5 text-left"
                      aria-pressed={active}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cx(
                            "truncate text-[12px]",
                            active ? "text-paper" : "text-paper-dim",
                          )}
                        >
                          {run.name}
                        </span>
                        <span
                          className={cx(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            run.status === "completed"
                              ? "bg-ok"
                              : run.status === "partial"
                                ? "bg-danger"
                                : "bg-warn",
                          )}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-muted-2">
                          {run.succeeded}/{run.total} frames
                        </span>
                        <span className="font-mono text-[9px] text-muted-2">
                          {formatDateTime(run.createdAt)}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {selected ? (
            <section className="panel min-w-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow">Batch</span>
                    <Badge tone={statusTone(selected.status)}>
                      {statusLabel(selected.status)}
                    </Badge>
                  </div>
                  <h2 className="mt-2 truncate text-[17px] font-medium text-paper">
                    {selected.name}
                  </h2>
                  <p className="mt-1 font-mono text-[9.5px] text-muted-2">
                    {selected.datasetName} · {selected.templateName} ·{" "}
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void downloadZip()}
                    disabled={!rendered.length || zipBusy}
                  >
                    {zipBusy ? <Spinner /> : <Icon name="archive" size={13} />}
                    Download ZIP
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(selected)}
                    aria-label="Delete batch"
                    className="px-2 text-muted-2 hover:text-danger"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-line-soft border-b border-line-soft sm:grid-cols-4">
                {[
                  { label: "Rendered", value: rendered.length.toLocaleString() },
                  { label: "Failed", value: failed.toLocaleString() },
                  { label: "Skipped", value: skipped.toLocaleString() },
                  { label: "Stored size", value: formatBytes(totalBytes) },
                ].map((stat) => (
                  <div key={stat.label} className="px-4 py-3">
                    <div className="eyebrow">{stat.label}</div>
                    <div className="mt-1 font-mono text-[12px] text-paper-dim">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft bg-black/10 px-5 py-2.5 font-mono text-[9px] text-muted-2">
                <span>
                  {selected.settings.output.format.toUpperCase()} ·{" "}
                  {selected.settings.output.scale}× · quality{" "}
                  {selected.settings.output.jpegQuality}
                </span>
                <span>
                  Face detection {selected.settings.crop.detectFaces ? "on" : "off"}
                </span>
                <span>Grain {selected.settings.grain.amount}%</span>
                <span>Curve {selected.settings.tone.curve.length} points</span>
              </div>

              <div className="p-4">
                {error ? (
                  <div className="mb-3">
                    <Notice tone="error">{error}</Notice>
                  </div>
                ) : null}

                {itemsLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-16 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">
                    <Spinner />
                    Loading batch assets
                  </div>
                ) : items.length ? (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                        Assets
                      </span>
                      <span className="font-mono text-[9px] text-muted-2">
                        manifest.csv + desrow-settings.json included
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-[8px] border border-line bg-[#0a0b0e]"
                        >
                          <div
                            className="relative overflow-hidden bg-[#0f1115]"
                            style={{ aspectRatio: `${aspect}` }}
                          >
                            {item.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.thumbnail}
                                alt={item.label}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center">
                                <Icon name="alert" size={17} className="text-muted-2" />
                              </span>
                            )}
                            {item.status === "rendered" && item.blob ? (
                              <button
                                type="button"
                                onClick={() => downloadBlob(item.blob!, item.filename)}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[4px] border border-white/15 bg-black/60 text-white/75 backdrop-blur transition-colors hover:bg-black/80"
                                aria-label={`Download ${item.filename}`}
                              >
                                <Icon name="download" size={12} />
                              </button>
                            ) : null}
                          </div>
                          <div className="border-t border-line-soft px-2 py-1.5">
                            <div className="truncate text-[10px] text-paper-dim" title={item.filename}>
                              {item.label || item.filename}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <span
                                className={cx(
                                  "font-mono text-[8px] uppercase tracking-[0.06em]",
                                  item.status === "rendered"
                                    ? "text-muted-2"
                                    : item.status === "failed"
                                      ? "text-danger"
                                      : "text-warn",
                                )}
                                title={item.error ?? item.warning}
                              >
                                {item.status}
                              </span>
                              <span className="shrink-0 font-mono text-[8px] text-muted-2">
                                {item.bytes ? formatBytes(item.bytes) : ""}
                              </span>
                            </div>
                            {item.error ? (
                              <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-danger/80">
                                {item.error}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-12 text-center text-[12px] text-muted-2">
                    No items were stored for this batch.
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete batch?"
        description={`“${deleteTarget?.name ?? ""}” and all of its stored frames will be removed from this browser. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Keep batch
            </Button>
            <Button variant="danger" onClick={() => void removeRun()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete batch"}
            </Button>
          </>
        }
      />
    </div>
  );
}
