"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  buttonStyles,
  Field,
  Notice,
  Spinner,
  TextInput,
  cx,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { DEFAULT_PROCESSING } from "@/lib/defaults";
import { saveRun } from "@/lib/db";
import { downloadBlob, formatBytes } from "@/lib/download";
import { getCell, tokenValues } from "@/lib/csv";
import { runRenderJob, type JobProgress } from "@/lib/job";
import { clearStoredSettings, loadSettings, storeSettings } from "@/lib/settings";
import { slugify } from "@/lib/tokens";
import type {
  CropOverride,
  Dataset,
  ProcessingSettings,
  RenderItem,
  RunSummary,
  Template,
} from "@/lib/types";
import { buildExportZip } from "@/lib/zip";
import { ProcessingPanel, SetupPanel } from "./render-controls";
import { RenderPreview } from "./render-preview";

const cloneDefaults = () =>
  JSON.parse(JSON.stringify(DEFAULT_PROCESSING)) as ProcessingSettings;

export function RenderBench({
  dataset,
  template,
  datasets,
  templates,
  onDatasetChange,
  onTemplateChange,
}: {
  dataset: Dataset;
  template: Template;
  datasets: Dataset[];
  templates: Template[];
  onDatasetChange: (id: string) => void;
  onTemplateChange: (id: string) => void;
}) {
  const { refresh } = useWorkspace();
  const [settings, setSettings] = useState<ProcessingSettings>(cloneDefaults);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, CropOverride>>({});
  const [selectedRowId, setSelectedRowId] = useState<string | null>(
    dataset.rows[0]?.id ?? null,
  );
  const [batchName, setBatchName] = useState("");
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [results, setResults] = useState<RenderItem[]>([]);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [runDataset, setRunDataset] = useState<Dataset | null>(null);
  const [runTemplate, setRunTemplate] = useState<Template | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) storeSettings(settings);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    setSelectedRowId(dataset.rows[0]?.id ?? null);
    setOverrides({});
    setResults([]);
    setRun(null);
    setProgress(null);
    setRunDataset(null);
    setRunTemplate(null);
    setRunError(null);
  }, [dataset.id]);

  const selectedRow = dataset.rows.find((row) => row.id === selectedRowId) ?? dataset.rows[0];
  const selectedIndex = selectedRow
    ? dataset.rows.findIndex((row) => row.id === selectedRow.id)
    : 0;
  const override = selectedRow ? overrides[selectedRow.id] : undefined;

  const updateOverride = useCallback(
    (patch: CropOverride) => {
      if (!selectedRow) return;
      setOverrides((current) => ({
        ...current,
        [selectedRow.id]: { ...current[selectedRow.id], ...patch },
      }));
    },
    [selectedRow],
  );

  const resetOverride = useCallback(() => {
    if (!selectedRow) return;
    setOverrides((current) => {
      const next = { ...current };
      delete next[selectedRow.id];
      return next;
    });
  }, [selectedRow]);

  const resetSettings = () => {
    clearStoredSettings();
    setSettings(cloneDefaults());
  };

  const exampleValues = useMemo(
    () =>
      selectedRow
        ? tokenValues(selectedRow.values, dataset.mapping)
        : dataset.rows[0]
          ? tokenValues(dataset.rows[0].values, dataset.mapping)
          : {},
    [selectedRow, dataset.mapping, dataset.rows],
  );

  const completed = useMemo(() => results.filter((item): item is RenderItem => Boolean(item)), [results]);
  const rendered = completed.filter((item) => item.status === "rendered");
  const failed = completed.filter((item) => item.status === "failed");
  const skipped = completed.filter((item) => item.status === "skipped");
  const totalBytes = rendered.reduce((total, item) => total + (item.bytes ?? 0), 0);
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  const overrideCount = Object.keys(overrides).length;

  const startBatch = async () => {
    if (running || !dataset.rows.length) return;

    const jobDataset = dataset;
    const jobTemplate = template;
    const jobSettings = JSON.parse(JSON.stringify(settings)) as ProcessingSettings;
    const jobOverrides = JSON.parse(JSON.stringify(overrides)) as Record<
      string,
      CropOverride
    >;
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const controller = new AbortController();

    abortRef.current = controller;
    setRunError(null);
    setResults([]);
    setRun(null);
    setProgress({
      completed: 0,
      total: jobDataset.rows.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      active: [],
    });
    setRunDataset(jobDataset);
    setRunTemplate(jobTemplate);
    setRunning(true);
    setStopping(false);

    try {
      const items = await runRenderJob({
        runId,
        dataset: jobDataset,
        template: jobTemplate,
        settings: jobSettings,
        overrides: jobOverrides,
        signal: controller.signal,
        onProgress: setProgress,
        onItem: (item, index) => {
          setResults((current) => {
            const next = [...current];
            next[index] = item;
            return next;
          });
        },
      });

      const succeeded = items.filter((item) => item.status === "rendered").length;
      const failedCount = items.filter((item) => item.status === "failed").length;
      const skippedCount = items.filter((item) => item.status === "skipped").length;
      const status = controller.signal.aborted
        ? "cancelled"
        : failedCount > 0
          ? "partial"
          : "completed";

      const summary: RunSummary = {
        id: runId,
        name:
          batchName.trim() ||
          `${jobDataset.name} · ${jobTemplate.name}`,
        datasetId: jobDataset.id,
        datasetName: jobDataset.name,
        templateId: jobTemplate.id,
        templateName: jobTemplate.name,
        settings: jobSettings,
        status,
        total: jobDataset.rows.length,
        succeeded,
        failed: failedCount,
        skipped: skippedCount,
        createdAt: startedAt,
        finishedAt: Date.now(),
      };

      setResults(items);
      setRun(summary);

      if (items.length) {
        try {
          await saveRun(summary, items);
          await refresh();
        } catch (cause) {
          setRunError(
            cause instanceof Error
              ? `Assets rendered, but the batch could not be saved to history: ${cause.message}`
              : "Assets rendered, but the batch could not be saved to history.",
          );
        }
      }
    } catch (cause) {
      setRunError(
        cause instanceof Error
          ? cause.message
          : "The batch stopped unexpectedly. Completed frames remain in the results.",
      );
    } finally {
      setRunning(false);
      setStopping(false);
      abortRef.current = null;
      setProgress((current) =>
        current ? { ...current, active: [] } : current,
      );
    }
  };

  const cancelBatch = () => {
    if (!abortRef.current) return;
    setStopping(true);
    abortRef.current.abort();
  };

  const downloadZip = async () => {
    if (!run || !runDataset || !rendered.length || zipBusy) return;
    setZipBusy(true);
    setRunError(null);
    try {
      const blob = await buildExportZip(run, runDataset, completed);
      downloadBlob(blob, `${slugify(run.name, "desrow-batch")}.zip`);
    } catch (cause) {
      setRunError(
        cause instanceof Error ? cause.message : "The ZIP could not be generated.",
      );
    } finally {
      setZipBusy(false);
    }
  };

  const clearView = () => {
    setResults([]);
    setRun(null);
    setProgress(null);
    setRunDataset(null);
    setRunTemplate(null);
    setRunError(null);
  };

  const resultTemplate = runTemplate ?? template;
  const canSelectResultRow = (rowId: string) =>
    dataset.rows.some((row) => row.id === rowId);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[328px_minmax(0,1fr)]">
      <div className="order-2 space-y-4 xl:order-1">
        <SetupPanel
          dataset={dataset}
          template={template}
          datasets={datasets}
          templates={templates}
          disabled={running}
          onDatasetChange={onDatasetChange}
          onTemplateChange={onTemplateChange}
        />
        <ProcessingPanel
          settings={settings}
          template={template}
          exampleValues={exampleValues}
          onChange={setSettings}
          onReset={resetSettings}
        />
      </div>

      <div className="order-1 min-w-0 space-y-4 xl:order-2">
        {selectedRow ? (
          <RenderPreview
            dataset={dataset}
            template={template}
            settings={settings}
            row={selectedRow}
            index={selectedIndex}
            override={override}
            onSelectRow={setSelectedRowId}
            onOverrideChange={updateOverride}
            onResetOverride={resetOverride}
          />
        ) : (
          <Notice tone="warn">
            This dataset has no records. Re-import the source with at least one data row.
          </Notice>
        )}

        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Batch</span>
              <span className="font-mono text-[9.5px] text-muted-2">
                {dataset.rows.length.toLocaleString()} records
              </span>
            </div>
            <div className="flex items-center gap-2">
              {overrideCount ? (
                <Badge tone="accent">
                  {overrideCount} custom crop{overrideCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              <Badge>{template.width * settings.output.scale} × {template.height * settings.output.scale} px</Badge>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Field label="Batch name" htmlFor="batch-name">
                  <TextInput
                    id="batch-name"
                    value={batchName}
                    onChange={(event) => setBatchName(event.target.value)}
                    placeholder={`${dataset.name} · ${template.name}`}
                    disabled={running}
                  />
                </Field>
              </div>
              <div className="flex shrink-0 gap-2">
                {running ? (
                  <Button variant="danger" size="md" onClick={cancelBatch} disabled={stopping}>
                    {stopping ? <Spinner /> : <Icon name="stop" size={13} />}
                    {stopping ? "Stopping…" : "Cancel"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => void startBatch()}
                    disabled={!dataset.rows.length}
                  >
                    <Icon name="play" size={13} />
                    Render {dataset.rows.length.toLocaleString()} assets
                  </Button>
                )}
              </div>
            </div>

            {progress ? (
              <div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#24272d]">
                  <div
                    className={cx(
                      "h-full rounded-full transition-[width] duration-300",
                      running ? "bg-accent" : failed.length ? "bg-warn" : "bg-ok",
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-2">
                    <span>
                      {progress.completed} / {progress.total}
                    </span>
                    <span className="text-ok">{progress.succeeded} rendered</span>
                    {progress.failed ? <span className="text-danger">{progress.failed} failed</span> : null}
                    {progress.skipped ? <span>{progress.skipped} skipped</span> : null}
                  </div>
                  {running ? (
                    <span className="max-w-[55%] truncate font-mono text-[9.5px] text-muted-2">
                      {progress.active.length
                        ? `Processing ${progress.active[progress.active.length - 1]}`
                        : "Preparing batch…"}
                    </span>
                  ) : (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-2">
                      {run?.status ?? "Finished"}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {runError ? <Notice tone="error">{runError}</Notice> : null}

            {run ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-line bg-black/20 px-3.5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        run.status === "completed"
                          ? "ok"
                          : run.status === "cancelled"
                            ? "warn"
                            : "danger"
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="truncate text-[12px] text-paper">{run.name}</span>
                  </div>
                  <p className="mt-1 font-mono text-[9.5px] text-muted-2">
                    {rendered.length} rendered · {failed.length} failed · {skipped.length} skipped
                    {totalBytes ? ` · ${formatBytes(totalBytes)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void downloadZip()}
                    disabled={!rendered.length || zipBusy}
                  >
                    {zipBusy ? <Spinner /> : <Icon name="archive" size={13} />}
                    Download ZIP
                  </Button>
                  <Link href="/exports" className={buttonStyles("primary", "sm")}>
                    Open exports
                    <Icon name="arrowRight" size={12} />
                  </Link>
                  <Button variant="ghost" size="sm" onClick={clearView}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}

            {running && !completed.length ? (
              <div className="rounded-[9px] border border-dashed border-line px-4 py-8 text-center">
                <Spinner size={18} />
                <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">
                  The first frames are rendering
                </p>
              </div>
            ) : null}

            {completed.length ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-2">
                    Contact sheet
                  </span>
                  <span className="font-mono text-[9px] text-muted-2">
                    {rendered.length} / {completed.length} ready
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
                  {completed.map((item) => (
                    <div
                      key={item.id}
                      className="group overflow-hidden rounded-[8px] border border-line bg-[#0a0b0e] transition-colors hover:border-[#3a3e46]"
                    >
                      <button
                        type="button"
                        className="relative block w-full overflow-hidden"
                        style={{
                          aspectRatio: `${resultTemplate.width} / ${resultTemplate.height}`,
                        }}
                        onClick={() => {
                          if (canSelectResultRow(item.rowId)) {
                            setSelectedRowId(item.rowId);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        title={item.error ?? item.warning ?? item.label}
                      >
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail}
                            alt={item.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center bg-[#0f1115]">
                            <Icon
                              name={item.status === "rendered" ? "image" : "alert"}
                              size={16}
                              className="text-muted-2"
                            />
                          </span>
                        )}
                        <span
                          className={cx(
                            "absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                            item.status === "rendered"
                              ? "bg-ok"
                              : item.status === "failed"
                                ? "bg-danger"
                                : "bg-warn",
                          )}
                        />
                        {item.status === "rendered" && item.blob ? (
                          <span
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[4px] border border-white/15 bg-black/60 text-white/70 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              downloadBlob(item.blob!, item.filename);
                            }}
                            title={`Download ${item.filename}`}
                          >
                            <Icon name="download" size={12} />
                          </span>
                        ) : null}
                      </button>
                      <div className="flex items-center justify-between gap-2 border-t border-line-soft px-2 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-[10px] text-paper-dim" title={item.label}>
                          {item.label}
                        </span>
                        <span
                          className={cx(
                            "shrink-0 font-mono text-[8px] uppercase tracking-[0.08em]",
                            item.status === "rendered"
                              ? "text-muted-2"
                              : item.status === "failed"
                                ? "text-danger"
                                : "text-warn",
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[9px] text-muted-2">
                  ZIP includes assets, a CSV manifest and the processing recipe.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
