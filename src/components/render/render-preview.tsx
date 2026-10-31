"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Slider,
  Spinner,
  Toggle,
  cx,
} from "@/components/ui";
import { getCell, tokenValues } from "@/lib/csv";
import {
  effectiveCropSettings,
  forcedFitToFrame,
  resolveCrop,
} from "@/lib/crop";
import { proxiedImageUrl } from "@/lib/drive";
import { detectFaceCached } from "@/lib/face";
import { loadImageElement } from "@/lib/image";
import { renderAsset } from "@/lib/render";
import type {
  CropOverride,
  Dataset,
  DatasetRow,
  DetectionStatus,
  ProcessingSettings,
  Template,
} from "@/lib/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const detectionCopy: Record<DetectionStatus, { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "accent" }> = {
  detected: { label: "Face detected", tone: "ok" },
  "not-detected": { label: "No face · fallback crop", tone: "warn" },
  disabled: { label: "Detection off", tone: "neutral" },
  error: { label: "Detector unavailable", tone: "danger" },
  pending: { label: "Detecting…", tone: "neutral" },
};

export function RenderPreview({
  dataset,
  template,
  settings,
  row,
  index,
  override,
  onSelectRow,
  onOverrideChange,
  onResetOverride,
}: {
  dataset: Dataset;
  template: Template;
  settings: ProcessingSettings;
  row: DatasetRow;
  index: number;
  override?: CropOverride;
  onSelectRow: (id: string) => void;
  onOverrideChange: (patch: CropOverride) => void;
  onResetOverride: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionStatus>("pending");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const labels = useMemo(
    () =>
      dataset.rows.map(
        (entry, rowIndex) =>
          getCell(entry.values, dataset.mapping.nameColumn).trim() ||
          `Record ${rowIndex + 1}`,
      ),
    [dataset],
  );

  const effective = effectiveCropSettings(settings.crop, override);
  const forcedFit = forcedFitToFrame(settings.crop, override);
  const [resolvedFit, setResolvedFit] = useState(false);
  const [autoFit, setAutoFit] = useState(false);
  const fit = forcedFit ?? resolvedFit;
  const fitIsAutomatic = fit && forcedFit === null && autoFit;
  const hasOverride = Boolean(override && Object.keys(override).length);
  const name = getCell(row.values, dataset.mapping.nameColumn).trim() || `Record ${index + 1}`;
  const sourceUrl = getCell(row.values, dataset.mapping.imageColumn).trim();

  useEffect(() => {
    let cancelled = false;
    setPreviewState("loading");
    setError(null);
    setResolvedFit(forcedFit === true);
    setAutoFit(false);

    const proxied = proxiedImageUrl(sourceUrl);
    if (!proxied) {
      setPreviewState("error");
      setError("This record has no usable portrait link.");
      setDetection("disabled");
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const image = await loadImageElement(proxied);
          let box = null;
          let status: DetectionStatus = settings.crop.detectFaces ? "pending" : "disabled";
          let score: number | null = null;

          if (forcedFit === true) {
            status = "disabled";
          } else if (settings.crop.detectFaces) {
            try {
              box = await detectFaceCached(sourceUrl, image);
              status = box ? "detected" : "not-detected";
              score = box?.confidence ?? null;
            } catch {
              status = "error";
            }
          }

          if (cancelled) return;
          setDetection(status);
          setConfidence(score);

          const resolved = resolveCrop({
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            frameWidth: template.photo.width * template.width,
            frameHeight: template.photo.height * template.height,
            box,
            settings: settings.crop,
            override,
          });
          setResolvedFit(resolved.fitToFrame);
          setAutoFit(resolved.auto);

          const rendered = await renderAsset({
            template,
            settings,
            values: tokenValues(row.values, dataset.mapping),
            image,
            crop: resolved.crop,
            fitToFrame: resolved.fitToFrame,
            faceY: resolved.settings.faceY,
            scale: Math.min(1, 1000 / template.width, 760 / template.height),
          });
          if (cancelled) return;

          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = rendered.width;
          canvas.height = rendered.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(rendered, 0, 0);
          setPreviewState("ready");
        } catch (cause) {
          if (cancelled) return;
          setPreviewState("error");
          setError(
            cause instanceof Error
              ? cause.message
              : "The preview could not be rendered.",
          );
        }
      })();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dataset, row, template, settings, override, sourceUrl]);

  useEffect(() => {
    const element = overlayRef.current;
    if (!element) return;

    if (fit) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const base = effectiveCropSettings(settings.crop, override);
      const next = clamp(base.faceScale + (event.deltaY < 0 ? 2 : -2), 8, 100);
      onOverrideChange({ faceScale: next });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [settings.crop, override, onOverrideChange, fit]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    const frameWidth = rect.width * template.photo.width;
    const frameHeight = rect.height * template.photo.height;
    if (frameWidth <= 0 || frameHeight <= 0) return;

    const base = effectiveCropSettings(settings.crop, override);
    const startX = event.clientX;
    const startY = event.clientY;
    setDragging(true);

    const move = (moveEvent: PointerEvent) => {
      const dx = ((moveEvent.clientX - startX) / frameWidth) * 100;
      const dy = ((moveEvent.clientY - startY) / frameHeight) * 100;
      onOverrideChange({
        // Fit mode locks horizontal centring; only vertical placement moves.
        ...(fit ? {} : { faceX: Math.round(clamp(base.faceX + dx, 0, 100)) }),
        faceY: Math.round(clamp(base.faceY + dy, 0, 100)),
      });
    };
    const stop = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const detectionInfo = fit
    ? {
        label: fitIsAutomatic ? "Fit in frame · auto" : "Fit in frame · centred",
        tone: "accent" as const,
      }
    : detectionCopy[detection];

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Frame preview</span>
          <span className="font-mono text-[9.5px] text-muted-2">
            {index + 1} / {dataset.rows.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={index <= 0}
            onClick={() => onSelectRow(dataset.rows[index - 1].id)}
            aria-label="Previous record"
          >
            <Icon name="chevronLeft" size={13} />
          </Button>
          <select
            value={row.id}
            onChange={(event) => onSelectRow(event.target.value)}
            className="select h-8 max-w-[190px] text-[11px]"
            aria-label="Select record"
          >
            {dataset.rows.map((entry, rowIndex) => (
              <option key={entry.id} value={entry.id}>
                {String(rowIndex + 1).padStart(2, "0")} · {labels[rowIndex]}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={index >= dataset.rows.length - 1}
            onClick={() => onSelectRow(dataset.rows[index + 1].id)}
            aria-label="Next record"
          >
            <Icon name="arrowRight" size={13} />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0">
          <div className="checker flex min-h-[320px] items-center justify-center rounded-[10px] border border-line p-4">
            <div
              ref={frameRef}
              className="relative w-full max-w-[460px] overflow-hidden rounded-[2px] bg-[#0c0d10] shadow-[0_16px_50px_-24px_rgba(0,0,0,0.9)]"
              style={{ aspectRatio: `${template.width} / ${template.height}` }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-label={`Preview for ${name}`}
              />

              {sourceUrl ? (
                <div
                  ref={overlayRef}
                  onPointerDown={beginDrag}
                  className={cx(
                    "group absolute cursor-move border border-transparent transition-colors hover:border-[rgba(229,211,174,0.55)]",
                    dragging && "border-[rgba(229,211,174,0.85)]",
                  )}
                  style={{
                    left: `${template.photo.x * 100}%`,
                    top: `${template.photo.y * 100}%`,
                    width: `${template.photo.width * 100}%`,
                    height: `${template.photo.height * 100}%`,
                  }}
                  title={
                    fit
                      ? "Drag vertically to place the fitted portrait"
                      : "Drag to reposition · scroll to zoom"
                  }
                >
                  <span
                    className={cx(
                      "pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/65 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/70 backdrop-blur transition-opacity",
                      dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {fit ? "Fit · drag vertically" : "Drag portrait · scroll to zoom"}
                  </span>
                </div>
              ) : null}

              {previewState === "loading" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-accent backdrop-blur-[1px]">
                  <Spinner size={18} />
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/50">
                    Grading frame
                  </span>
                </div>
              ) : null}

              {previewState === "error" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0b0d] px-6 text-center">
                  <Icon name="image" size={20} className="text-muted-2" />
                  <p className="text-[12px] text-paper-dim">Preview unavailable</p>
                  <p className="max-w-[280px] text-[10.5px] leading-relaxed text-muted-2">
                    {error}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Badge tone={detectionInfo.tone}>
              {detectionInfo.label}
              {!fit && detection === "detected" && confidence !== null
                ? ` · ${Math.round(confidence * 100)}%`
                : ""}
            </Badge>
            <span
              className="max-w-[55%] truncate font-mono text-[9px] text-muted-2"
              title={sourceUrl}
            >
              {sourceUrl || "No portrait link"}
            </span>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="eyebrow">Record</p>
                <h3 className="mt-1.5 truncate text-[14px] font-medium text-paper">{name}</h3>
              </div>
              {hasOverride ? <Badge tone="accent">Custom crop</Badge> : null}
            </div>
            <dl className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
              {dataset.columns
                .filter((column) => column !== dataset.mapping.imageColumn)
                .map((column) => (
                  <div key={column} className="flex items-baseline justify-between gap-3">
                    <dt className="max-w-[45%] truncate font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-2">
                      {column}
                    </dt>
                    <dd
                      className="max-w-[55%] truncate text-right text-[10.5px] text-paper-dim"
                      title={row.values[column]}
                    >
                      {row.values[column] || "—"}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="border-t border-line-soft pt-3.5">
            <div className="flex items-center justify-between">
              <span className="field-label">Crop override</span>
              <button
                type="button"
                onClick={onResetOverride}
                disabled={!hasOverride}
                className="font-mono text-[9px] text-muted-2 transition-colors hover:text-paper disabled:opacity-40"
              >
                Reset
              </button>
            </div>
            <div className="mt-3">
              <div className="rounded-[9px] border border-line bg-black/20 px-3 py-2.5">
                <Toggle
                  label="Fit this record"
                  hint={
                    fitIsAutomatic
                      ? "The system fitted this record because the face crop would be clipped. Turn this off to force a face crop for this record only."
                      : fit
                        ? "This portrait is contained in the frame and centred horizontally. Other records keep the batch placement."
                        : "Override the batch placement for this record only. The whole portrait is contained and centred horizontally."
                  }
                  checked={fit}
                  onChange={(fitToFrame) => onOverrideChange({ fitToFrame })}
                />
              </div>
            </div>
            <div className="mt-3 space-y-4">
              {fit ? null : (
                <>
                  <Slider
                    label="Face height"
                    value={Math.round(effective.faceScale)}
                    min={8}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(faceScale) => onOverrideChange({ faceScale })}
                  />
                  <Slider
                    label="Face X"
                    value={Math.round(effective.faceX)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(faceX) => onOverrideChange({ faceX })}
                  />
                </>
              )}
              <Slider
                label={fit ? "Vertical placement" : "Face Y"}
                value={Math.round(effective.faceY)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(faceY) => onOverrideChange({ faceY })}
              />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-2">
              {fit
                ? "Fit mode scales the whole portrait inside the frame, always centred horizontally. Overrides apply to this record only and are used by the batch."
                : "Overrides apply to this record only and are used by the batch. Drag or scroll directly on the frame to set position and zoom."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
