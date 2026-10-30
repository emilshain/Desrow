import Papa from "papaparse";
import { looksLikeLink } from "./drive";

export const MAX_ROWS = 5000;

export interface ParsedTable {
  columns: string[];
  rows: Record<string, string>[];
  warnings: string[];
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const trimmed = header.trim() || `Column ${index + 1}`;
    const count = seen.get(trimmed.toLowerCase()) ?? 0;
    seen.set(trimmed.toLowerCase(), count + 1);
    return count === 0 ? trimmed : `${trimmed} (${count + 1})`;
  });
}

export function parseCsv(text: string): ParsedTable {
  const warnings: string[] = [];
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const rawHeaders = (result.meta.fields ?? []).filter(
    (header) => header && header !== "__parsed_extra",
  );
  const columns = dedupeHeaders(rawHeaders);

  const rows = result.data
    .slice(0, MAX_ROWS)
    .map((raw) => {
      const values: Record<string, string> = {};
      rawHeaders.forEach((header, index) => {
        values[columns[index]] = String(raw[header] ?? "").trim();
      });
      return values;
    })
    .filter((values) => Object.values(values).some((value) => value.length > 0));

  if (result.data.length > MAX_ROWS) {
    warnings.push(
      `Only the first ${MAX_ROWS.toLocaleString()} rows were imported (${result.data.length.toLocaleString()} found).`,
    );
  }
  if (!columns.length) {
    warnings.push("No header row was found. The first row must contain column names.");
  }
  if (result.errors.length) {
    const first = result.errors[0];
    warnings.push(`CSV warning: ${first.message}${first.row ? ` (row ${first.row + 1})` : ""}.`);
  }

  return { columns, rows, warnings };
}

const NAME_HINTS = [
  "full name",
  "fullname",
  "display name",
  "attendee",
  "participant",
  "employee",
  "student",
  "member",
  "person",
  "name",
];

const IMAGE_HINTS = [
  "headshot",
  "portrait",
  "photo",
  "picture",
  "image",
  "img",
  "drive",
  "link",
  "url",
];

function normalized(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface ColumnMapping {
  nameColumn: string;
  imageColumn: string;
}

export function detectMapping(
  columns: string[],
  rows: Record<string, string>[],
): ColumnMapping {
  const sample = rows.slice(0, 120);

  const imageScore = (column: string): number => {
    const header = normalized(column);
    let score = IMAGE_HINTS.reduce(
      (total, hint) => (header.includes(hint) ? total + 6 : total),
      0,
    );
    const values = sample.map((row) => row[column]).filter(Boolean);
    const links = values.filter(looksLikeLink).length;
    if (values.length && links / values.length >= 0.35) score += 10;
    if (values.some((value) => /drive\.google\.com\/file\/d\//.test(value))) score += 8;
    return score;
  };

  const nameScore = (column: string): number => {
    const header = normalized(column);
    let score = NAME_HINTS.reduce(
      (total, hint) => (header === hint ? total + 12 : header.includes(hint) ? total + 4 : total),
      0,
    );
    const values = sample.map((row) => row[column]).filter(Boolean);
    if (values.some((value) => value.includes(" ") && !looksLikeLink(value))) score += 3;
    if (values.every((value) => /^\d+$/.test(value))) score -= 8;
    return score;
  };

  const rankedImages = [...columns]
    .map((column) => ({ column, score: imageScore(column) }))
    .sort((a, b) => b.score - a.score);
  const rankedNames = [...columns]
    .map((column) => ({ column, score: nameScore(column) }))
    .sort((a, b) => b.score - a.score);

  const imageColumn = rankedImages[0]?.score >= 6 ? rankedImages[0].column : "";
  const nameColumn =
    rankedNames.find((entry) => entry.column !== imageColumn && entry.score > 0)?.column ??
    columns.find((column) => column !== imageColumn) ??
    "";

  return { nameColumn, imageColumn };
}

export function getCell(row: Record<string, string>, column: string): string {
  if (!column) return "";
  return row[column] ?? "";
}

const TITLE_HINTS = ["title", "role", "position", "job"];
const ID_HINTS = ["id", "identifier", "badge", "number", "ref"];

function hasToken(values: Record<string, string>, token: string): boolean {
  return Object.keys(values).some(
    (candidate) => candidate.trim().toLowerCase() === token,
  );
}

function findColumn(values: Record<string, string>, hints: string[]): string {
  const columns = Object.keys(values);
  return (
    columns.find((column) => hints.includes(normalized(column))) ??
    columns.find((column) => {
      const words = normalized(column).split(" ");
      return hints.some((hint) => words.includes(hint));
    }) ??
    ""
  );
}

/**
 * Adds the canonical tokens the starter template uses on top of a row's real
 * columns: `name` follows the mapped name column, `title` and `id` follow
 * matching headers, and `photo`/`portrait`/`image` follow the mapped image
 * column. Explicit columns always win; aliases only fill missing tokens.
 */
export function tokenValues(
  values: Record<string, string>,
  mapping: ColumnMapping,
): Record<string, string> {
  const tokens = { ...values };

  const name = getCell(values, mapping.nameColumn).trim();
  if (name && !hasToken(tokens, "name")) tokens.name = name;

  const image = getCell(values, mapping.imageColumn).trim();
  if (image) {
    for (const alias of ["photo", "portrait", "image"]) {
      if (!hasToken(tokens, alias)) tokens[alias] = image;
    }
  }

  if (!hasToken(tokens, "title")) {
    const column = findColumn(values, TITLE_HINTS);
    if (column) tokens.title = values[column] ?? "";
  }

  if (!hasToken(tokens, "id")) {
    const column = findColumn(values, ID_HINTS);
    if (column) tokens.id = values[column] ?? "";
  }

  return tokens;
}
