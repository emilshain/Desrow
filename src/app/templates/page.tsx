"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import {
  Badge,
  Button,
  buttonStyles,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  TextInput,
  Toggle,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { readArtworkFile, type ArtworkFile } from "@/lib/artwork";
import { tokenValues } from "@/lib/csv";
import { createTemplate, SAMPLE_VALUES, TEMPLATE_PRESETS } from "@/lib/defaults";
import { deleteTemplate, saveTemplate } from "@/lib/db";
import { formatRelative } from "@/lib/download";
import { usePersistentSelection } from "@/lib/selection";
import type { Template } from "@/lib/types";

function CreateTemplateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [, setSelectedTemplate] = usePersistentSelection("template");
  const [name, setName] = useState("Portrait pass");
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(1200);
  const [starterLayers, setStarterLayers] = useState(true);
  const [artwork, setArtwork] = useState<ArtworkFile | null>(null);
  const [readingArtwork, setReadingArtwork] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const artworkInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("Portrait pass");
    setWidth(900);
    setHeight(1200);
    setStarterLayers(true);
    setArtwork(null);
    setError(null);
  }, [open]);

  const validSize =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 200 &&
    width <= 8000 &&
    height >= 200 &&
    height <= 8000;

  const create = async () => {
    if (!validSize || busy) return;
    setBusy(true);
    setError(null);
    try {
      const template = createTemplate({
        name: name.trim() || "Untitled template",
        width,
        height,
      });
      if (!starterLayers) {
        template.texts = [];
        template.photo = { ...template.photo, height: 1 };
      }
      if (artwork) template.backgroundImage = artwork.dataUrl;
      await saveTemplate(template);
      await refresh();
      setSelectedTemplate(template.id);
      onClose();
      router.push(`/templates/${template.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The template could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="New master template"
      description="The master artwork defines the output canvas at its native pixel size. Without artwork, choose a fallback size."
      width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void create()}
            disabled={busy || !validSize}
          >
            {busy ? <Spinner /> : <Icon name="plus" size={14} />}
            Create template
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Template name" htmlFor="template-name">
          <TextInput
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Conference pass"
          />
        </Field>

        <div className="rounded-[10px] border border-line bg-black/20 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="field-label">Master artwork</span>
              <p className="mt-1.5 max-w-sm text-[10.5px] leading-relaxed text-muted-2">
                Optional. Uploading sets the canvas and output size to the image&apos;s
                native pixels, and uses it as the full-bleed background.
              </p>
            </div>
            <input
              ref={artworkInput}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setReadingArtwork(true);
                setError(null);
                void readArtworkFile(file)
                  .then((next) => {
                    setArtwork(next);
                    setWidth(next.width);
                    setHeight(next.height);
                  })
                  .catch((cause: unknown) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "That artwork could not be read.",
                    ),
                  )
                  .finally(() => setReadingArtwork(false));
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={readingArtwork || busy}
              onClick={() => artworkInput.current?.click()}
            >
              {readingArtwork ? <Spinner /> : <Icon name="image" size={12} />}
              {artwork ? "Replace" : "Upload"}
            </Button>
          </div>

          {artwork ? (
            <div className="mt-3 flex items-center gap-3 border-t border-line-soft pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artwork.dataUrl}
                alt="Master artwork preview"
                className="h-12 w-12 rounded-[5px] border border-line object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] text-paper-dim">{artwork.name}</p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-2">
                  {artwork.width.toLocaleString()} × {artwork.height.toLocaleString()} px
                  · canvas locked to artwork
                </p>
              </div>
              <button
                type="button"
                className="font-mono text-[9px] text-muted-2 hover:text-danger"
                onClick={() => setArtwork(null)}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="field-label">Fallback size</span>
            {artwork ? (
              <span className="font-mono text-[9px] text-muted-2">
                artwork sets {artwork.width} × {artwork.height}
              </span>
            ) : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TEMPLATE_PRESETS.map((preset) => {
              const active = preset.width === width && preset.height === height;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setWidth(preset.width);
                    setHeight(preset.height);
                  }}
                  className={`rounded-[9px] border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-[rgba(229,211,174,0.35)] bg-[rgba(229,211,174,0.07)]"
                      : "border-line bg-white/[0.015] hover:border-[#343840]"
                  }`}
                >
                  <span className="block text-[12px] text-paper">{preset.label}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted-2">
                    {preset.width} × {preset.height}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Width (px)" htmlFor="template-width">
            <TextInput
              id="template-width"
              type="number"
              min={200}
              max={8000}
              value={width}
              onChange={(event) => setWidth(Math.round(Number(event.target.value)))}
            />
          </Field>
          <Field label="Height (px)" htmlFor="template-height">
            <TextInput
              id="template-height"
              type="number"
              min={200}
              max={8000}
              value={height}
              onChange={(event) => setHeight(Math.round(Number(event.target.value)))}
            />
          </Field>
        </div>
        {!validSize ? (
          <p className="text-[11px] text-danger">
            Dimensions must be whole numbers between 200 and 8,000 pixels.
          </p>
        ) : artwork ? (
          <p className="text-[10.5px] leading-relaxed text-warn/80">
            Changing the width or height after upload will stretch the artwork. Set the
            artwork&apos;s native size for a 1:1 output.
          </p>
        ) : null}

        <div className="rounded-[10px] border border-line bg-black/20 px-4 py-3.5">
          <Toggle
            label="Include starter text layers"
            hint="Adds {{name}}, {{title}} and a footer, positioned for a 3:4 portrait. Turn off for a blank photo-first canvas."
            checked={starterLayers}
            onChange={setStarterLayers}
          />
        </div>

        {error ? <p className="text-[11.5px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}

export default function TemplatesPage() {
  const { templates, datasets, refresh } = useWorkspace();
  const [, setSelectedTemplate] = usePersistentSelection("template");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const previewValues = useMemo(() => {
    const dataset = datasets[0];
    const row = dataset?.rows[0];
    return {
      ...SAMPLE_VALUES,
      ...(dataset && row ? tokenValues(row.values, dataset.mapping) : {}),
    };
  }, [datasets]);

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      await refresh();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="The master layout."
        description="Upload your artwork, then place the portrait frame and typographic layers. Coordinates are stored as percentages, so the layout holds at any output scale."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} />
            New template
          </Button>
        }
      />

      {templates.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="panel group overflow-hidden">
              <Link
                href={`/templates/${template.id}`}
                onClick={() => setSelectedTemplate(template.id)}
                className="block border-b border-line"
              >
                <TemplateThumbnail
                  template={template}
                  values={previewValues}
                  className="aspect-[4/3]"
                />
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-medium text-paper">
                      {template.name}
                    </h2>
                    <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-2">
                      {template.width} × {template.height} px · {template.texts.length} text
                      {template.texts.length === 1 ? " layer" : " layers"}
                    </p>
                  </div>
                  <Badge tone="accent">Master</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10.5px] text-muted-2">
                    Edited {formatRelative(template.updatedAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(template)}
                      className="btn btn-ghost btn-sm h-7 w-7 p-0 text-muted-2 hover:text-danger"
                      aria-label={`Delete ${template.name}`}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                    <Link
                      href={`/templates/${template.id}`}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={buttonStyles("secondary", "sm")}
                    >
                      Edit
                      <Icon name="arrowRight" size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-line bg-white/[0.012] px-6 text-center transition-colors hover:border-[#3a3e46] hover:bg-white/[0.02]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent">
              <Icon name="plus" size={17} />
            </span>
            <span className="text-[13px] text-paper">Create another template</span>
            <span className="max-w-[220px] text-[11px] leading-relaxed text-muted-2">
              Different format, different artwork, same pipeline.
            </span>
          </button>
        </div>
      ) : (
        <EmptyState
          icon="templates"
          title="No templates yet"
          description="A template is your master artwork plus a portrait frame and any number of text layers. Start with the built-in portrait layout, then replace the artwork."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={14} />
              Create your first template
            </Button>
          }
        />
      )}

      <div className="mt-8 grid gap-3 border-t border-line-soft pt-5 text-[11px] leading-relaxed text-muted-2 sm:grid-cols-3">
        <p>
          <span className="text-paper-dim">Artwork</span> — upload a PNG or JPEG at the
          template&apos;s exact pixel size. It is drawn full-bleed beneath all layers.
        </p>
        <p>
          <span className="text-paper-dim">Tokens</span> — any column from the selected
          dataset can be inserted as <span className="font-mono">{"{{column}}"}</span>.
        </p>
        <p>
          <span className="text-paper-dim">Precision</span> — positions are normalised,
          so exporting at 2× keeps every measured offset intact.
        </p>
      </div>

      <CreateTemplateModal open={creating} onClose={() => setCreating(false)} />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete template?"
        description={`“${deleteTarget?.name ?? ""}” will be removed from this browser. Existing exports generated from it are kept.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Keep template
            </Button>
            <Button variant="danger" onClick={() => void remove()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete template"}
            </Button>
          </>
        }
      />
    </div>
  );
}
