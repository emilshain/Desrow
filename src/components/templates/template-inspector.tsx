"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  Button,
  Field,
  Notice,
  Segmented,
  Select,
  Slider,
  Spinner,
  TextArea,
  TextInput,
  Toggle,
  cx,
} from "@/components/ui";
import { adoptArtwork, readArtworkFile } from "@/lib/artwork";
import { uid } from "@/lib/defaults";
import {
  DEVICE_FONT_SUGGESTIONS,
  FONT_LIST,
  fontWeights,
  registerFontFace,
} from "@/lib/fonts";
import { resolveTokens } from "@/lib/tokens";
import type {
  FontSelection,
  PhotoLayer,
  Template,
  TextLayer,
} from "@/lib/types";
import type { LayerSelection } from "./template-stage";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const pct = (value: number) => Math.round(value * 1000) / 10;
const hexPattern = /^#[0-9a-fA-F]{6}$/;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

type LocalFontEntry = { family?: string };

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = hexPattern.test(value);
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <label
          className="relative h-[34px] w-[34px] shrink-0 cursor-pointer overflow-hidden rounded-[7px] border border-line"
          style={{ background: valid ? value : "#000000" }}
          title="Pick a color"
        >
          <input
            type="color"
            value={valid ? value : "#000000"}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </label>
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cx("font-mono text-[11px]", !valid && "border-danger/60")}
          spellCheck={false}
          aria-label={`${label} hex value`}
        />
      </div>
      {!valid ? (
        <p className="mt-1.5 text-[10.5px] text-danger">Use a six-digit hex value, e.g. #F1EDE4.</p>
      ) : null}
    </div>
  );
}

function DimensionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Math.round(Number(draft));
    if (Number.isFinite(parsed)) onChange(clamp(parsed, 200, 8000));
    else setDraft(String(value));
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <TextInput
        value={draft}
        inputMode="numeric"
        className="mt-2 font-mono text-[12px]"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </div>
  );
}

function Section({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("space-y-4", className)}>
      {label ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-2">
            {label}
          </span>
          <span className="h-px flex-1 bg-line-soft" />
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function TemplateInspector({
  template,
  selection,
  values,
  tokenColumns,
  onSelect,
  onTemplateChange,
  onPhotoChange,
  onTextChange,
  onDeleteText,
}: {
  template: Template;
  selection: LayerSelection;
  values: Record<string, string>;
  tokenColumns: string[];
  onSelect: (selection: LayerSelection) => void;
  onTemplateChange: (patch: Partial<Template>) => void;
  onPhotoChange: (patch: Partial<PhotoLayer>) => void;
  onTextChange: (id: string, patch: Partial<TextLayer>) => void;
  onDeleteText: (id: string) => void;
}) {
  const textLayer =
    selection.kind === "text"
      ? template.texts.find((layer) => layer.id === selection.id) ?? null
      : null;

  const fileRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [artworkNote, setArtworkNote] = useState<string | null>(null);
  const [artSize, setArtSize] = useState<string | null>(null);
  const [fontBusy, setFontBusy] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [deviceFamily, setDeviceFamily] = useState("");
  const [deviceFonts, setDeviceFonts] = useState<string[]>([]);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);

  const activeDeviceFamily = textLayer?.font.startsWith("local:")
    ? textLayer.font.slice("local:".length)
    : "";

  useEffect(() => {
    setDeviceFamily(activeDeviceFamily);
  }, [activeDeviceFamily, textLayer?.id]);

  useEffect(() => {
    if (!template.backgroundImage) {
      setArtSize(null);
      return;
    }
    const image = new Image();
    image.onload = () =>
      setArtSize(`${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px`);
    image.onerror = () => setArtSize(null);
    image.src = template.backgroundImage;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [template.backgroundImage]);

  const readArtwork = async (file: File) => {
    setUploadError(null);
    setArtworkNote(null);
    try {
      const artwork = await readArtworkFile(file);
      onTemplateChange(adoptArtwork(template, artwork));
      setArtworkNote(
        `Canvas set to ${artwork.width.toLocaleString()} × ${artwork.height.toLocaleString()} px from the artwork size.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The artwork could not be read.",
      );
    }
  };

  const uploadFontFile = async (file: File) => {
    setFontError(null);
    if (!textLayer) return;
    if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) {
      setFontError("Use a WOFF2, WOFF, TTF or OTF font file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFontError("Keep embedded font files under 2 MB.");
      return;
    }

    setFontBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const id = uid();
      await registerFontFace(id, dataUrl);
      const label = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Uploaded font";
      onTemplateChange({ fonts: [...(template.fonts ?? []), { id, label, dataUrl }] });
      onTextChange(textLayer.id, {
        font: `custom:${id}` as FontSelection,
        weight: 400,
      });
      setDeviceMessage(null);
    } catch {
      setFontError(
        "This font could not be loaded. Use a valid WOFF2, WOFF, TTF or OTF file.",
      );
    } finally {
      setFontBusy(false);
    }
  };

  const applyDeviceFont = (family: string) => {
    const clean = family.trim();
    if (!textLayer || !clean) return;
    onTextChange(textLayer.id, {
      font: `local:${clean}` as FontSelection,
      weight: textLayer.weight,
    });
    setDeviceFamily(clean);
    setDeviceMessage(`Using “${clean}” from this device.`);
  };

  const scanDeviceFonts = async () => {
    const localWindow = window as Window & {
      queryLocalFonts?: () => Promise<LocalFontEntry[]>;
    };

    if (!localWindow.queryLocalFonts) {
      setDeviceMessage(
        "This browser does not expose device fonts. Type an installed family name instead.",
      );
      return;
    }

    setDeviceBusy(true);
    setDeviceMessage(null);
    try {
      const entries = await localWindow.queryLocalFonts.call(window);
      const families = [
        ...new Set(
          entries
            .map((entry) => entry.family?.trim())
            .filter((family): family is string => Boolean(family)),
        ),
      ].sort((a, b) => a.localeCompare(b));
      setDeviceFonts(families);
      setDeviceMessage(
        families.length
          ? `${families.length} font families detected on this device.`
          : "No local font families were returned.",
      );
    } catch {
      setDeviceMessage(
        "Font access was denied. Allow the browser prompt, or type a family name.",
      );
    } finally {
      setDeviceBusy(false);
    }
  };

  const insertToken = (column: string) => {
    if (!textLayer) return;
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? textLayer.content.length;
    const end = textarea?.selectionEnd ?? start;
    const token = `{{${column}}}`;
    onTextChange(textLayer.id, {
      content:
        textLayer.content.slice(0, start) + token + textLayer.content.slice(end),
    });
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const position = start + token.length;
      textarea?.setSelectionRange(position, position);
    });
  };

  const title =
    selection.kind === "template"
      ? "Canvas & artwork"
      : selection.kind === "photo"
        ? "Photo frame"
        : (textLayer?.name ?? "Text layer");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line-soft px-4 py-3.5">
        <p className="eyebrow">Inspector</p>
        <h3 className="mt-1.5 truncate text-[13.5px] font-medium text-paper">{title}</h3>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {selection.kind === "template" ? (
          <>
            <Section label="Master">
              <Field label="Template name" htmlFor="designer-name">
                <TextInput
                  id="designer-name"
                  value={template.name}
                  onChange={(event) => onTemplateChange({ name: event.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <DimensionField
                  label="Width (px)"
                  value={template.width}
                  onChange={(width) => onTemplateChange({ width })}
                />
                <DimensionField
                  label="Height (px)"
                  value={template.height}
                  onChange={(height) => onTemplateChange({ height })}
                />
              </div>
              <ColorField
                label="Canvas color"
                value={template.backgroundColor}
                onChange={(backgroundColor) => onTemplateChange({ backgroundColor })}
              />
            </Section>

            <Section label="Artwork">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readArtwork(file);
                  event.target.value = "";
                }}
              />
              {template.backgroundImage ? (
                <div className="space-y-2.5">
                  <div className="checker overflow-hidden rounded-[8px] border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.backgroundImage}
                      alt="Master artwork preview"
                      className="max-h-[150px] w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] text-muted-2">
                      {artSize ?? "Master artwork"}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                      >
                        Replace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger/80"
                        onClick={() => {
                          setArtworkNote(null);
                          onTemplateChange({ backgroundImage: null });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  {artSize && artSize !== `${template.width.toLocaleString()} × ${template.height.toLocaleString()} px` ? (
                    <p className="text-[10.5px] leading-relaxed text-warn/80">
                      Artwork aspect differs from the canvas; it will be stretched to fill.
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-line px-4 py-8 text-center transition-colors hover:border-[#3a3e46]"
                >
                  <Icon name="image" size={17} className="text-accent" />
                  <span className="mt-2.5 text-[12px] text-paper">Upload master artwork</span>
                  <span className="mt-1 text-[10.5px] text-muted-2">
                    PNG, JPEG or WebP · up to 8 MB
                  </span>
                </button>
              )}
              {uploadError ? <Notice tone="error">{uploadError}</Notice> : null}
              {artworkNote ? (
                <p className="text-[10.5px] leading-relaxed text-ok">{artworkNote}</p>
              ) : null}
              <p className="text-[10.5px] leading-relaxed text-muted-2">
                Uploading artwork sets the canvas to its native pixel size and uses it as
                the full-bleed background. Pixel-based type and frame values are scaled to
                preserve the composition.
              </p>
            </Section>

            <Section label="Frame">
              <button
                type="button"
                onClick={() => onSelect({ kind: "photo" })}
                className="flex w-full items-center justify-between rounded-[9px] border border-line bg-black/20 px-3 py-2.5 text-left transition-colors hover:border-[#363a42]"
              >
                <span className="text-[12px] text-paper-dim">Edit photo frame</span>
                <span className="font-mono text-[10px] text-muted-2">
                  {Math.round(template.photo.width * 100)} × {Math.round(template.photo.height * 100)}%
                </span>
              </button>
              <p className="text-[10.5px] leading-relaxed text-muted-2">
                The frame&apos;s aspect ratio becomes the crop window for every portrait.
              </p>
            </Section>
          </>
        ) : null}

        {selection.kind === "photo" ? (
          <>
            <Section label="Placement">
              <Slider
                label="Horizontal start"
                value={pct(template.photo.x)}
                min={0}
                max={100}
                step={0.5}
                unit="%"
                onChange={(value) => onPhotoChange({ x: value / 100 })}
              />
              <Slider
                label="Vertical start"
                value={pct(template.photo.y)}
                min={0}
                max={100}
                step={0.5}
                unit="%"
                onChange={(value) => onPhotoChange({ y: value / 100 })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="Width"
                  value={pct(template.photo.width)}
                  min={5}
                  max={100}
                  step={0.5}
                  unit="%"
                  onChange={(value) => onPhotoChange({ width: value / 100 })}
                />
                <Slider
                  label="Height"
                  value={pct(template.photo.height)}
                  min={5}
                  max={100}
                  step={0.5}
                  unit="%"
                  onChange={(value) => onPhotoChange({ height: value / 100 })}
                />
              </div>
              <p className="rounded-[8px] border border-line-soft bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-2">
                Frame aspect {template.photo.width > 0 && template.photo.height > 0
                  ? ((template.photo.width * template.width) / (template.photo.height * template.height)).toFixed(2)
                  : "—"}
                :1. Portraits are cover-cropped into this window from the detected face.
              </p>
            </Section>

            <Section label="Finish">
              <Slider
                label="Corner radius"
                value={template.photo.radius}
                min={0}
                max={260}
                step={1}
                unit="px"
                onChange={(radius) => onPhotoChange({ radius })}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Slider
                    label="Border"
                    value={template.photo.borderWidth}
                    min={0}
                    max={40}
                    step={0.5}
                    unit="px"
                    onChange={(borderWidth) => onPhotoChange({ borderWidth })}
                  />
                </div>
              </div>
              <ColorField
                label="Border color"
                value={template.photo.borderColor}
                onChange={(borderColor) => onPhotoChange({ borderColor })}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelect({ kind: "template" })}
              >
                <Icon name="arrowLeft" size={12} />
                Canvas settings
              </Button>
            </Section>
          </>
        ) : null}

        {textLayer ? (
          <>
            <Section label="Content">
              <Field label="Layer name" htmlFor="layer-name">
                <TextInput
                  id="layer-name"
                  value={textLayer.name}
                  onChange={(event) => onTextChange(textLayer.id, { name: event.target.value })}
                />
              </Field>
              <Field label="Text & tokens" htmlFor="layer-content">
                <TextArea
                  id="layer-content"
                  ref={contentRef}
                  value={textLayer.content}
                  rows={3}
                  onChange={(event) =>
                    onTextChange(textLayer.id, { content: event.target.value })
                  }
                  placeholder="{{name}}"
                />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {(tokenColumns.length ? tokenColumns : ["name", "title", "id"]).map((column) => (
                  <button
                    key={column}
                    type="button"
                    onClick={() => insertToken(column)}
                    className="rounded-[5px] border border-line bg-white/[0.025] px-2 py-1 font-mono text-[9.5px] text-muted transition-colors hover:border-[rgba(229,211,174,0.3)] hover:text-paper"
                  >
                    {`{{${column}}}`}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] leading-relaxed text-muted-2">
                Preview:{" "}
                <span className="text-paper-dim">
                  {resolveTokens(textLayer.content, values) || "—"}
                </span>
                . Unknown tokens render empty.
              </p>
            </Section>

            <Section label="Typography">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Typeface" htmlFor="layer-font">
                  <Select
                    id="layer-font"
                    value={textLayer.font}
                    onChange={(event) => {
                      const font = event.target.value as FontSelection;
                      const weights = fontWeights(font);
                      onTextChange(textLayer.id, {
                        font,
                        weight: weights.includes(textLayer.weight) ? textLayer.weight : weights[0],
                      });
                    }}
                  >
                    <optgroup label="Bundled">
                      {FONT_LIST.map((font) => (
                        <option key={font.key} value={font.key}>
                          {font.label}
                        </option>
                      ))}
                    </optgroup>
                    {(template.fonts ?? []).length ? (
                      <optgroup label="Uploaded">
                        {(template.fonts ?? []).map((font) => (
                          <option key={font.id} value={`custom:${font.id}`}>
                            {font.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {activeDeviceFamily ? (
                      <optgroup label="Device">
                        <option value={textLayer.font}>{activeDeviceFamily}</option>
                      </optgroup>
                    ) : null}
                    {textLayer.font.startsWith("custom:") &&
                    !(template.fonts ?? []).some(
                      (font) => `custom:${font.id}` === textLayer.font,
                    ) ? (
                      <option value={textLayer.font}>Uploaded font</option>
                    ) : null}
                  </Select>
                </Field>
                <Field label="Weight" htmlFor="layer-weight">
                  <Select
                    id="layer-weight"
                    value={String(textLayer.weight)}
                    onChange={(event) =>
                      onTextChange(textLayer.id, { weight: Number(event.target.value) })
                    }
                  >
                    {fontWeights(textLayer.font).map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="rounded-[9px] border border-line bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="field-label">Device font</span>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-2">
                      Use an installed family from this machine. Other machines may fall
                      back if that family is absent.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void scanDeviceFonts()}
                    disabled={deviceBusy}
                    className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2 transition-colors hover:text-paper disabled:opacity-40"
                  >
                    {deviceBusy ? <Spinner size={11} /> : <Icon name="search" size={11} />}
                    Scan
                  </button>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <TextInput
                    value={deviceFamily}
                    list="desrow-device-fonts"
                    onChange={(event) => setDeviceFamily(event.target.value)}
                    placeholder="e.g. Georgia"
                    className="h-8 text-[11px]"
                    aria-label="Device font family"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={!deviceFamily.trim()}
                    onClick={() => applyDeviceFont(deviceFamily)}
                  >
                    Use
                  </Button>
                </div>
                <datalist id="desrow-device-fonts">
                  {[...new Set([...DEVICE_FONT_SUGGESTIONS, ...deviceFonts])].map((family) => (
                    <option key={family} value={family} />
                  ))}
                </datalist>
                {deviceFonts.length ? (
                  <Select
                    value=""
                    onChange={(event) => {
                      if (event.target.value) applyDeviceFont(event.target.value);
                    }}
                    className="mt-2 h-8 text-[11px]"
                    aria-label="Detected device fonts"
                  >
                    <option value="">Choose a detected family…</option>
                    {deviceFonts.map((family) => (
                      <option key={family} value={family}>
                        {family}
                      </option>
                    ))}
                  </Select>
                ) : null}
                {deviceMessage ? (
                  <p className="mt-2 text-[9.5px] leading-relaxed text-muted-2">
                    {deviceMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start justify-between gap-3 border-t border-line-soft pt-3">
                <div>
                  <span className="field-label">Custom font file</span>
                  <p className="mt-1 max-w-[190px] text-[10px] leading-relaxed text-muted-2">
                    WOFF2, WOFF, TTF or OTF · under 2 MB. Embedded in this template so it
                    travels with the layout.
                  </p>
                  {(template.fonts ?? []).length ? (
                    <p className="mt-1 font-mono text-[9px] text-muted-2">
                      {(template.fonts ?? []).length} font file
                      {(template.fonts ?? []).length === 1 ? "" : "s"} embedded
                    </p>
                  ) : null}
                </div>
                <input
                  ref={fontFileRef}
                  type="file"
                  hidden
                  accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadFontFile(file);
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  disabled={fontBusy}
                  onClick={() => fontFileRef.current?.click()}
                >
                  {fontBusy ? <Spinner /> : <Icon name="upload" size={12} />}
                  Upload
                </Button>
              </div>
              {fontError ? <Notice tone="error">{fontError}</Notice> : null}

              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="Size"
                  value={textLayer.size}
                  min={6}
                  max={600}
                  step={1}
                  unit="px"
                  hint="Exact size can be typed in the value box."
                  onChange={(size) => onTextChange(textLayer.id, { size })}
                />
                <Slider
                  label="Tracking"
                  value={textLayer.letterSpacing}
                  min={-5}
                  max={40}
                  step={0.5}
                  unit="px"
                  onChange={(letterSpacing) =>
                    onTextChange(textLayer.id, { letterSpacing })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="Line height"
                  value={textLayer.lineHeight}
                  min={0.7}
                  max={2.2}
                  step={0.01}
                  onChange={(lineHeight) => onTextChange(textLayer.id, { lineHeight })}
                />
                <Slider
                  label="Opacity"
                  value={Math.round(textLayer.opacity * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(value) =>
                    onTextChange(textLayer.id, { opacity: value / 100 })
                  }
                />
              </div>
              <Slider
                label="Max lines"
                value={textLayer.maxLines ?? 0}
                min={0}
                max={12}
                step={1}
                hint="0 leaves the field unlimited. Lines past the limit are hidden, so long values cannot overflow the layout."
                onChange={(maxLines) => onTextChange(textLayer.id, { maxLines })}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="field-label">Alignment</span>
                <Segmented
                  label="Text alignment"
                  value={textLayer.align}
                  onChange={(align) => onTextChange(textLayer.id, { align })}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                  ]}
                />
              </div>
              <ColorField
                label="Text color"
                value={textLayer.color}
                onChange={(color) => onTextChange(textLayer.id, { color })}
              />
              <Toggle
                label="Uppercase"
                hint="Transforms the resolved text at render time; tokens keep their source spelling."
                checked={textLayer.uppercase}
                onChange={(uppercase) => onTextChange(textLayer.id, { uppercase })}
              />
            </Section>

            <Section label="Placement">
              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="X"
                  value={pct(textLayer.x)}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="%"
                  onChange={(value) => onTextChange(textLayer.id, { x: value / 100 })}
                />
                <Slider
                  label="Y"
                  value={pct(textLayer.y)}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="%"
                  onChange={(value) => onTextChange(textLayer.id, { y: value / 100 })}
                />
              </div>
              <Slider
                label="Box width"
                value={pct(textLayer.width)}
                min={5}
                max={100}
                step={0.5}
                unit="%"
                onChange={(value) => onTextChange(textLayer.id, { width: value / 100 })}
              />
              <p className="text-[10.5px] leading-relaxed text-muted-2">
                X and Y mark the top-left of the text box. Alignment positions lines
                inside the box; wrapping follows the box width.
              </p>
            </Section>

            <div className="border-t border-line-soft pt-4">
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() => onDeleteText(textLayer.id)}
              >
                <Icon name="trash" size={12} />
                Delete text layer
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
