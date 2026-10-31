import { getCell, tokenValues } from "./csv";
import { computeCrop, effectiveCropSettings, fullImageCrop } from "./crop";
import { proxiedImageUrl } from "./drive";
import { detectFaceCached } from "./face";
import { canvasToBlob, loadImageElement, thumbnailDataUrl } from "./image";
import { renderAsset } from "./render";
import { buildFilename, fileNameWithoutExtension, safeFilename } from "./tokens";
import type {
  CropOverride,
  Dataset,
  FaceBox,
  ProcessingSettings,
  RenderItem,
  Template,
} from "./types";

export interface JobProgress {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  active: string[];
}

export interface RunRenderJobOptions {
  runId: string;
  dataset: Dataset;
  template: Template;
  settings: ProcessingSettings;
  overrides: Record<string, CropOverride>;
  signal?: AbortSignal;
  onProgress?: (progress: JobProgress) => void;
  onItem?: (item: RenderItem, index: number) => void;
}


function uniqueFilename(candidate: string, used: Set<string>): string {
  if (!used.has(candidate.toLowerCase())) {
    used.add(candidate.toLowerCase());
    return candidate;
  }

  const stem = fileNameWithoutExtension(candidate);
  const extension = candidate.slice(stem.length);
  let counter = 2;
  let next = `${stem}-${counter}${extension}`;
  while (used.has(next.toLowerCase())) {
    counter += 1;
    next = `${stem}-${counter}${extension}`;
  }
  used.add(next.toLowerCase());
  return next;
}

export async function runRenderJob(options: RunRenderJobOptions): Promise<RenderItem[]> {
  const { runId, dataset, template, settings, overrides, signal, onProgress, onItem } = options;
  const total = dataset.rows.length;
  const concurrency = Math.max(
    1,
    Math.min(4, Math.round(settings.output.concurrency || 1)),
  );

  const items: Array<RenderItem | undefined> = new Array(total);
  const usedNames = new Set<string>();
  const active = new Set<string>();

  let cursor = 0;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let detectionDisabled = !settings.crop.detectFaces || settings.crop.fitToFrame;
  let detectionErrorReported = false;

  const report = () => {
    onProgress?.({
      completed,
      total,
      succeeded,
      failed,
      skipped,
      active: [...active],
    });
  };

  const processRow = async (index: number): Promise<void> => {
    const row = dataset.rows[index];
    const tokens = tokenValues(row.values, dataset.mapping);
    const label =
      getCell(row.values, dataset.mapping.nameColumn).trim() || `Record ${index + 1}`;
    active.add(label);
    report();

    const base: RenderItem = {
      id: `${runId}:${row.id}`,
      runId,
      rowId: row.id,
      label,
      filename: "",
      sourceUrl: getCell(row.values, dataset.mapping.imageColumn),
      status: "failed",
      createdAt: Date.now(),
    };

    const finish = (item: RenderItem) => {
      items[index] = item;
      completed += 1;
      if (item.status === "rendered") succeeded += 1;
      else if (item.status === "skipped") skipped += 1;
      else failed += 1;
      active.delete(label);
      onItem?.(item, index);
      report();
    };

    const rawLink = getCell(row.values, dataset.mapping.imageColumn).trim();

    if (!rawLink) {
      finish({
        ...base,
        status: "skipped",
        error: "No portrait link in this record.",
        filename: uniqueFilename(
          buildFilename({
            pattern: settings.output.filenamePattern,
            values: tokens,
            index: index + 1,
            format: settings.output.format,
            fallbackLabel: safeFilename(label),
          }),
          usedNames,
        ),
      });
      return;
    }

    const proxied = proxiedImageUrl(rawLink);
    if (!proxied) {
      finish({
        ...base,
        status: "skipped",
        error: "The portrait value is not a supported http(s) link.",
      });
      return;
    }

    try {
      const image = await loadImageElement(proxied);
      let faceBox: FaceBox | null = null;
      let warning: string | undefined;

      if (settings.crop.detectFaces && !detectionDisabled) {
        try {
          faceBox = await detectFaceCached(rawLink, image);
          if (!faceBox) {
            warning = "No face was detected — the manual fallback crop was used.";
          }
        } catch {
          detectionDisabled = true;
          if (!detectionErrorReported) {
            detectionErrorReported = true;
            warning = "Face detection could not start — the manual fallback crop was used.";
          }
        }
      }

      const cropSettings = effectiveCropSettings(settings.crop, overrides[row.id]);
      const crop = cropSettings.fitToFrame
        ? fullImageCrop(image.naturalWidth, image.naturalHeight)
        : computeCrop({
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            frameWidth: template.photo.width * template.width,
            frameHeight: template.photo.height * template.height,
            box: faceBox,
            settings: settings.crop,
            override: overrides[row.id],
          });

      const canvas = await renderAsset({
        template,
        settings,
        values: tokens,
        image,
        crop,
        faceY: cropSettings.faceY,
        scale: settings.output.scale,
      });

      const blob = await canvasToBlob(
        canvas,
        settings.output.format,
        settings.output.jpegQuality / 100,
      );

      finish({
        ...base,
        status: "rendered",
        warning,
        filename: uniqueFilename(
          buildFilename({
            pattern: settings.output.filenamePattern,
            values: tokens,
            index: index + 1,
            format: settings.output.format,
            fallbackLabel: safeFilename(label),
          }),
          usedNames,
        ),
        thumbnail: thumbnailDataUrl(canvas),
        blob,
        bytes: blob.size,
        width: canvas.width,
        height: canvas.height,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "This record could not be rendered.";
      finish({
        ...base,
        status: "failed",
        error: /load|fetch|network/i.test(message)
          ? "The portrait could not be loaded. Check that the file is shared publicly."
          : message,
        filename: uniqueFilename(
          buildFilename({
            pattern: settings.output.filenamePattern,
            values: tokens,
            index: index + 1,
            format: settings.output.format,
            fallbackLabel: safeFilename(label),
          }),
          usedNames,
        ),
      });
    }
  };

  const worker = async () => {
    while (!signal?.aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= total) return;
      await processRow(index);
    }
  };

  report();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, total)) }, () => worker()),
  );

  const order = new Map(dataset.rows.map((row, index) => [row.id, index]));
  return items
    .filter((item): item is RenderItem => Boolean(item))
    .sort((a, b) => (order.get(a.rowId) ?? 0) - (order.get(b.rowId) ?? 0));
}

