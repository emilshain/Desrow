import Dexie, { type Table } from "dexie";
import type { Dataset, RenderItem, RunSummary, Template } from "./types";

class DesrowDatabase extends Dexie {
  datasets!: Table<Dataset, string>;
  templates!: Table<Template, string>;
  runs!: Table<RunSummary, string>;
  items!: Table<RenderItem, string>;

  constructor() {
    super("desrow");
    this.version(1).stores({
      datasets: "id, updatedAt",
      templates: "id, updatedAt",
      runs: "id, createdAt, status",
      items: "id, runId, status",
    });
  }
}

let instance: DesrowDatabase | null = null;

export function getDb(): DesrowDatabase {
  if (typeof window === "undefined") {
    throw new Error("The Desrow database is only available in the browser.");
  }
  if (!instance) instance = new DesrowDatabase();
  return instance;
}

export async function listDatasets(): Promise<Dataset[]> {
  return getDb().datasets.orderBy("updatedAt").reverse().toArray();
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await getDb().datasets.put(dataset);
}

export async function deleteDataset(id: string): Promise<void> {
  await getDb().datasets.delete(id);
}

export async function listTemplates(): Promise<Template[]> {
  return getDb().templates.orderBy("updatedAt").reverse().toArray();
}

export async function saveTemplate(template: Template): Promise<void> {
  await getDb().templates.put(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await getDb().templates.delete(id);
}

export async function listRunSummaries(): Promise<RunSummary[]> {
  return getDb().runs.orderBy("createdAt").reverse().toArray();
}

export async function getRunItems(runId: string): Promise<RenderItem[]> {
  return getDb().items.where("runId").equals(runId).toArray();
}

export async function saveRun(summary: RunSummary, items: RenderItem[]): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.runs, db.items, async () => {
    await db.runs.put(summary);
    await db.items.bulkPut(items);
  });
}

export async function deleteRun(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.runs, db.items, async () => {
    await db.items.where("runId").equals(id).delete();
    await db.runs.delete(id);
  });
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.datasets, db.templates, db.runs, db.items, async () => {
    await Promise.all([
      db.datasets.clear(),
      db.templates.clear(),
      db.runs.clear(),
      db.items.clear(),
    ]);
  });
}
