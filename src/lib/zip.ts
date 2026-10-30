import JSZip from "jszip";
import type { Dataset, RenderItem, RunSummary } from "./types";

function csvCell(value: string): string {
  const raw = value ?? "";
  // Neutralise spreadsheet formulas before escaping the cell.
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildManifest(
  dataset: Dataset | null,
  items: RenderItem[],
): string {
  const columns = dataset?.columns ?? [];
  const header = [
    "filename",
    "label",
    "status",
    "error",
    "portrait_link",
    ...columns,
  ];
  const rowsByRowId = new Map(dataset?.rows.map((row) => [row.id, row.values]) ?? []);

  const lines = items.map((item) => {
    const values = rowsByRowId.get(item.rowId) ?? {};
    return [
      item.filename,
      item.label,
      item.status,
      item.error ?? "",
      item.sourceUrl,
      ...columns.map((column) => values[column] ?? ""),
    ]
      .map(csvCell)
      .join(",");
  });

  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export async function buildExportZip(
  run: RunSummary,
  dataset: Dataset | null,
  items: RenderItem[],
): Promise<Blob> {
  const zip = new JSZip();
  const rendered = items.filter((item) => item.status === "rendered" && item.blob);

  for (const item of rendered) {
    if (item.blob) zip.file(item.filename, item.blob);
  }

  zip.file("manifest.csv", buildManifest(dataset, items));
  zip.file(
    "desrow-settings.json",
    JSON.stringify(
      {
        app: "Desrow",
        exportedAt: new Date().toISOString(),
        run: {
          id: run.id,
          name: run.name,
          dataset: dataset?.name ?? run.datasetName,
          template: run.templateName,
          total: run.total,
          rendered: rendered.length,
        },
        processing: run.settings,
      },
      null,
      2,
    ),
  );

  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
