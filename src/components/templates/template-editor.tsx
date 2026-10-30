"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Modal,
  Spinner,
  cx,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { tokenValues } from "@/lib/csv";
import { SAMPLE_VALUES } from "@/lib/defaults";
import { saveTemplate } from "@/lib/db";
import { usePersistentSelection } from "@/lib/selection";
import type { PhotoLayer, Template, TextLayer } from "@/lib/types";
import { TemplateInspector } from "./template-inspector";
import { TemplateStage, type LayerSelection } from "./template-stage";

type SaveState = "saved" | "dirty" | "saving";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function LayersPanel({
  template,
  selection,
  onSelect,
  onAddText,
}: {
  template: Template;
  selection: LayerSelection;
  onSelect: (selection: LayerSelection) => void;
  onAddText: () => void;
}) {
  return (
    <div className="p-2.5">
      <div className="flex items-center justify-between px-1.5 pb-2">
        <span className="eyebrow">Layers</span>
        <span className="font-mono text-[9.5px] text-muted-2">
          {template.texts.length + 2}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect({ kind: "template" })}
        className={cx(
          "flex w-full items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors",
          selection.kind === "template"
            ? "bg-white/[0.06] text-paper"
            : "text-muted hover:bg-white/[0.03] hover:text-paper-dim",
        )}
      >
        <Icon name="image" size={14} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px]">Canvas & artwork</span>
          <span className="mt-0.5 block truncate font-mono text-[8.5px] text-muted-2">
            {template.width} × {template.height}
          </span>
        </span>
        {selection.kind === "template" ? (
          <span className="h-1 w-1 rounded-full bg-accent" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => onSelect({ kind: "photo" })}
        className={cx(
          "mt-0.5 flex w-full items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors",
          selection.kind === "photo"
            ? "bg-white/[0.06] text-paper"
            : "text-muted hover:bg-white/[0.03] hover:text-paper-dim",
        )}
      >
        <Icon name="crop" size={14} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px]">Photo frame</span>
          <span className="mt-0.5 block truncate font-mono text-[8.5px] text-muted-2">
            cover crop
          </span>
        </span>
        {selection.kind === "photo" ? (
          <span className="h-1 w-1 rounded-full bg-accent" />
        ) : null}
      </button>

      <div className="px-1.5 pb-1.5 pt-4">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-2">
          Text
        </span>
      </div>

      {template.texts.map((layer) => {
        const selected = selection.kind === "text" && selection.id === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelect({ kind: "text", id: layer.id })}
            className={cx(
              "mt-0.5 flex w-full items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors",
              selected
                ? "bg-white/[0.06] text-paper"
                : "text-muted hover:bg-white/[0.03] hover:text-paper-dim",
            )}
          >
            <Icon name="text" size={13} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px]">{layer.name}</span>
              <span className="mt-0.5 block truncate font-mono text-[8.5px] text-muted-2">
                {layer.content || "empty"}
              </span>
            </span>
            {selected ? <span className="h-1 w-1 rounded-full bg-accent" /> : null}
          </button>
        );
      })}

      <div className="mt-3 border-t border-line-soft pt-2.5">
        <Button variant="secondary" size="sm" className="w-full" onClick={onAddText}>
          <Icon name="plus" size={12} />
          Add text layer
        </Button>
      </div>
    </div>
  );
}

export function TemplateEditor({ initial }: { initial: Template }) {
  const router = useRouter();
  const { datasets, refresh } = useWorkspace();
  const [, setSelectedTemplate] = usePersistentSelection("template");
  const [template, setTemplate] = useState<Template>(initial);
  const [selection, setSelection] = useState<LayerSelection>({ kind: "photo" });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const latestRef = useRef(template);
  const dirtyRef = useRef(false);

  useEffect(() => {
    latestRef.current = template;
  }, [template]);

  const edit = useCallback((updater: (current: Template) => Template) => {
    setTemplate((current) => {
      const next = updater(current);
      latestRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setSaveState("dirty");
  }, []);

  const persist = useCallback(
    async (value: Template) => {
      setSaveState("saving");
      await saveTemplate({ ...value, updatedAt: Date.now() });
      dirtyRef.current = false;
      setSaveState("saved");
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (saveState !== "dirty") return;
    const timer = window.setTimeout(() => {
      void persist(latestRef.current).catch(() => setSaveState("dirty"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [template, saveState, persist]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        const value = latestRef.current;
        void saveTemplate({ ...value, updatedAt: Date.now() }).then(() => refresh());
      }
    };
  }, [refresh]);

  const previewValues = useMemo(() => {
    const dataset = datasets[0];
    const row = dataset?.rows[0];
    return {
      ...SAMPLE_VALUES,
      ...(dataset && row ? tokenValues(row.values, dataset.mapping) : {}),
    };
  }, [datasets]);
  const tokenColumns = datasets[0]?.columns ?? [];

  const addText = () => {
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      name: `Text ${template.texts.length + 1}`,
      content: "{{name}}",
      x: 0.1,
      y: Math.min(0.82, 0.42 + template.texts.length * 0.07),
      width: 0.8,
      font: "sans",
      size: Math.max(12, Math.round(template.width * 0.035)),
      weight: 500,
      letterSpacing: 0,
      lineHeight: 1.1,
      align: "left",
      color: "#f1ede4",
      uppercase: false,
      opacity: 1,
    };
    edit((current) => ({ ...current, texts: [...current.texts, layer] }));
    setSelection({ kind: "text", id: layer.id });
  };

  const removeText = (id: string) => {
    edit((current) => ({
      ...current,
      texts: current.texts.filter((layer) => layer.id !== id),
    }));
    if (selection.kind === "text" && selection.id === id) {
      setSelection({ kind: "photo" });
    }
    setDeleteTarget(null);
  };

  const flush = async () => {
    if (!dirtyRef.current) return true;
    try {
      await persist(latestRef.current);
      return true;
    } catch {
      setSaveState("dirty");
      return false;
    }
  };

  const goToRender = async () => {
    setNavigating(true);
    const ok = await flush();
    setNavigating(false);
    if (!ok) return;
    setSelectedTemplate(template.id);
    router.push("/render");
  };

  const goBack = async () => {
    setNavigating(true);
    const ok = await flush();
    setNavigating(false);
    if (!ok) return;
    router.push("/templates");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setSelection({ kind: "template" });
        return;
      }

      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(event.key)) return;
      if (selection.kind === "template") return;

      event.preventDefault();
      const step = event.shiftKey ? 0.01 : 0.002;
      const dx =
        event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy =
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

      if (selection.kind === "photo") {
        edit((current) => ({
          ...current,
          photo: {
            ...current.photo,
            x: clamp(current.photo.x + dx, 0, 1 - current.photo.width),
            y: clamp(current.photo.y + dy, 0, 1 - current.photo.height),
          },
        }));
      } else {
        edit((current) => ({
          ...current,
          texts: current.texts.map((layer) =>
            layer.id === selection.id
              ? {
                  ...layer,
                  x: clamp(layer.x + dx, 0, Math.max(0, 1 - layer.width)),
                  y: clamp(layer.y + dy, 0, 0.98),
                }
              : layer,
          ),
        }));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, edit]);

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved" : "Saved";

  const previewSource = datasets[0]
    ? datasets[0].rows[0]?.values[datasets[0].mapping.nameColumn] ||
      datasets[0].name
    : "Sample values";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => void goBack()}
            className="btn btn-secondary btn-sm mt-1 h-8 w-8 shrink-0 p-0"
            aria-label="Back to templates"
            disabled={navigating}
          >
            <Icon name="chevronLeft" size={15} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">Master template</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">
                <span
                  className={cx(
                    "h-1 w-1 rounded-full",
                    saveState === "saved"
                      ? "bg-ok"
                      : saveState === "saving"
                        ? "bg-warn"
                        : "bg-muted-2",
                  )}
                />
                {saveLabel}
              </span>
            </div>
            <input
              value={template.name}
              onChange={(event) =>
                edit((current) => ({ ...current, name: event.target.value }))
              }
              className="mt-1 w-full max-w-[520px] truncate bg-transparent font-serif text-[clamp(1.8rem,3vw,2.4rem)] leading-tight text-paper outline-none focus:ring-0"
              aria-label="Template name"
              spellCheck={false}
            />
            <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[9.5px] text-muted-2">
              <span>
                {template.width} × {template.height} px
              </span>
              <span>{template.texts.length} text layers</span>
              <span>Output scale is set in Render</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={addText}>
            <Icon name="plus" size={13} />
            Add text
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => void goToRender()}
            disabled={navigating || saveState === "saving"}
          >
            {navigating ? <Spinner /> : <Icon name="arrowRight" size={14} />}
            Use in render
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[192px_minmax(0,1fr)_336px]">
        <aside className="panel order-2 h-fit xl:sticky xl:top-4 xl:order-1">
          <LayersPanel
            template={template}
            selection={selection}
            onSelect={setSelection}
            onAddText={addText}
          />
        </aside>

        <section className="panel order-1 flex h-[clamp(480px,calc(100vh-170px),760px)] flex-col overflow-hidden xl:order-2">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ok/80" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">
                Live canvas
              </span>
            </div>
            <Badge>Preview · placeholder portrait</Badge>
          </div>

          <div className="relative flex min-h-0 flex-1">
            <TemplateStage
              template={template}
              values={previewValues}
              selection={selection}
              onSelect={setSelection}
              onPhotoChange={(patch) =>
                edit((current) => ({
                  ...current,
                  photo: { ...current.photo, ...patch } as PhotoLayer,
                }))
              }
              onTextChange={(id, patch) =>
                edit((current) => ({
                  ...current,
                  texts: current.texts.map((layer) =>
                    layer.id === id ? { ...layer, ...patch } : layer,
                  ),
                }))
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-black/15 px-4 py-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2">
              Drag to place · corner handles resize · arrows nudge
            </span>
            <span className="truncate font-mono text-[9px] text-muted-2">
              Text preview: {previewSource}
            </span>
          </div>
        </section>

        <aside className="panel order-3 h-[clamp(480px,calc(100vh-170px),760px)] overflow-hidden xl:sticky xl:top-4">
          <TemplateInspector
            template={template}
            selection={selection}
            values={previewValues}
            tokenColumns={tokenColumns}
            onSelect={setSelection}
            onTemplateChange={(patch) =>
              edit((current) => ({ ...current, ...patch }))
            }
            onPhotoChange={(patch) =>
              edit((current) => ({ ...current, photo: { ...current.photo, ...patch } }))
            }
            onTextChange={(id, patch) =>
              edit((current) => ({
                ...current,
                texts: current.texts.map((layer) =>
                  layer.id === id ? { ...layer, ...patch } : layer,
                ),
              }))
            }
            onDeleteText={setDeleteTarget}
          />
        </aside>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete text layer?"
        description="The layer and its content will be removed. Canvas and photo frame stay."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep layer
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteTarget && removeText(deleteTarget)}
            >
              Delete layer
            </Button>
          </>
        }
      />
    </div>
  );
}
