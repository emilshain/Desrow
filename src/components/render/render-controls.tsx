"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import {
  Button,
  Field,
  Notice,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
  cx,
} from "@/components/ui";
import { buildFilename } from "@/lib/tokens";
import type {
  Dataset,
  ProcessingSettings,
  Template,
} from "@/lib/types";
import { CURVE_PRESETS } from "@/lib/defaults";
import { CurveEditor } from "./curve-editor";

type Tab = "crop" | "tone" | "grain" | "output";

export function SetupPanel({
  dataset,
  template,
  datasets,
  templates,
  disabled,
  onDatasetChange,
  onTemplateChange,
}: {
  dataset: Dataset;
  template: Template;
  datasets: Dataset[];
  templates: Template[];
  disabled?: boolean;
  onDatasetChange: (id: string) => void;
  onTemplateChange: (id: string) => void;
}) {
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Setup</p>
        <span className="mono-meta">02 inputs</span>
      </div>
      <div className="mt-3.5 space-y-3">
        <Field label="Source dataset" htmlFor="render-dataset">
          <Select
            id="render-dataset"
            value={dataset.id}
            disabled={disabled}
            onChange={(event) => onDatasetChange(event.target.value)}
          >
            {datasets.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · {entry.rows.length} rows
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Master template" htmlFor="render-template">
          <Select
            id="render-template"
            value={template.id}
            disabled={disabled}
            onChange={(event) => onTemplateChange(event.target.value)}
          >
            {templates.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · {entry.width} × {entry.height}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line-soft pt-3">
        <div>
          <span className="eyebrow">Records</span>
          <p className="mt-1 font-mono text-[11px] text-paper-dim">
            {dataset.rows.length.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="eyebrow">Frame</span>
          <p className="mt-1 font-mono text-[11px] text-paper-dim">
            {template.width} × {template.height}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[9.5px] text-muted-2">
        <Link href="/source" className="link-quiet">
          Manage source
        </Link>
        <Link href={`/templates/${template.id}`} className="link-quiet">
          Edit template
        </Link>
      </div>
    </section>
  );
}

export function ProcessingPanel({
  settings,
  template,
  exampleValues,
  onChange,
  onReset,
}: {
  settings: ProcessingSettings;
  template: Template;
  exampleValues: Record<string, string>;
  onChange: (updater: (current: ProcessingSettings) => ProcessingSettings) => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<Tab>("crop");

  const patchCrop = (patch: Partial<ProcessingSettings["crop"]>) =>
    onChange((current) => ({ ...current, crop: { ...current.crop, ...patch } }));
  const patchTone = (patch: Partial<ProcessingSettings["tone"]>) =>
    onChange((current) => ({ ...current, tone: { ...current.tone, ...patch } }));
  const patchGrain = (patch: Partial<ProcessingSettings["grain"]>) =>
    onChange((current) => ({ ...current, grain: { ...current.grain, ...patch } }));
  const patchOutput = (patch: Partial<ProcessingSettings["output"]>) =>
    onChange((current) => ({ ...current, output: { ...current.output, ...patch } }));

  const outputWidth = Math.round(template.width * settings.output.scale);
  const outputHeight = Math.round(template.height * settings.output.scale);
  const filenameExample = buildFilename({
    pattern: settings.output.filenamePattern,
    values: exampleValues,
    index: 1,
    format: settings.output.format,
    fallbackLabel: "record",
  });

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Processing</p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2 transition-colors hover:text-paper"
        >
          <Icon name="reset" size={11} />
          Reset
        </button>
      </div>

      <div className="mt-3">
        <Segmented<Tab>
          label="Processing stage"
          value={tab}
          onChange={setTab}
          options={[
            { value: "crop", label: "Crop" },
            { value: "tone", label: "Tone" },
            { value: "grain", label: "Grain" },
            { value: "output", label: "Output" },
          ]}
        />
      </div>

      <div className="mt-5 space-y-5">
        {tab === "crop" ? (
          <>
            <div className="rounded-[9px] border border-line bg-black/20 px-3.5 py-3">
              <Toggle
                label="Face detection"
                hint="BlazeFace runs in this browser. Failed or empty detections fall back to the manual crop."
                checked={settings.crop.detectFaces}
                onChange={(detectFaces) => patchCrop({ detectFaces })}
              />
            </div>
            <Slider
              label="Face height in frame"
              value={settings.crop.faceScale}
              min={8}
              max={100}
              step={1}
              unit="%"
              hint="A larger value crops tighter around the subject."
              onChange={(faceScale) => patchCrop({ faceScale })}
            />
            <Slider
              label="Horizontal placement"
              value={settings.crop.faceX}
              min={0}
              max={100}
              step={1}
              unit="%"
              hint="Where the face centre lands across the photo frame."
              onChange={(faceX) => patchCrop({ faceX })}
            />
            <Slider
              label="Vertical placement"
              value={settings.crop.faceY}
              min={0}
              max={100}
              step={1}
              unit="%"
              hint="42% leaves natural headroom. 50% centres the face."
              onChange={(faceY) => patchCrop({ faceY })}
            />
            <Notice tone="info">
              Global values apply to every record. The frame preview lets you drag an
              individual portrait and save a per-record override.
            </Notice>
          </>
        ) : null}

        {tab === "tone" ? (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="field-label">Tone curve</span>
                <span className="font-mono text-[9px] text-muted-2">input / output</span>
              </div>
              <CurveEditor
                points={settings.tone.curve}
                onChange={(curve) => patchTone({ curve })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CURVE_PRESETS.map((preset) => {
                  const active =
                    JSON.stringify(preset.points) === JSON.stringify(settings.tone.curve);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => patchTone({ curve: preset.points.map((p) => ({ ...p })) })}
                      className={cx(
                        "rounded-[5px] border px-2 py-1 font-mono text-[9px] transition-colors",
                        active
                          ? "border-[rgba(229,211,174,0.35)] bg-[rgba(229,211,174,0.08)] text-accent"
                          : "border-line text-muted-2 hover:text-paper",
                      )}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Slider
              label="Contrast"
              value={settings.tone.contrast}
              min={-50}
              max={50}
              step={1}
              hint="Applied after the curve; bends around the mid-grey point."
              onChange={(contrast) => patchTone({ contrast })}
            />
            <Slider
              label="Brightness"
              value={settings.tone.brightness}
              min={-50}
              max={50}
              step={1}
              hint="Exposure offset after the curve, −0.25 to +0.25."
              onChange={(brightness) => patchTone({ brightness })}
            />

            <div className="border-t border-line-soft pt-4">
              <div className="flex items-center justify-between">
                <span className="field-label">Channel mix</span>
                <button
                  type="button"
                  onClick={() =>
                    patchTone({ channelWeights: { r: 0.3, g: 0.59, b: 0.11 } })
                  }
                  className="font-mono text-[9px] text-muted-2 hover:text-paper"
                >
                  Luminance
                </button>
              </div>
              <div className="mt-3 space-y-4">
                {(["r", "g", "b"] as const).map((channel) => (
                  <Slider
                    key={channel}
                    label={channel === "r" ? "Red" : channel === "g" ? "Green" : "Blue"}
                    value={Math.round(settings.tone.channelWeights[channel] * 100)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(value) =>
                      patchTone({
                        channelWeights: {
                          ...settings.tone.channelWeights,
                          [channel]: value / 100,
                        },
                      })
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted-2">
                Weights are normalised before conversion. Different mixes change how raw
                colors map to grey — skin tones respond most to red and green.
              </p>
            </div>
          </>
        ) : null}

        {tab === "grain" ? (
          <>
            <Slider
              label="Grain amount"
              value={settings.grain.amount}
              min={0}
              max={70}
              step={1}
              unit="%"
              hint="Overlay strength. Zero disables the grain pass."
              onChange={(amount) => patchGrain({ amount })}
            />
            <Slider
              label="Grain size"
              value={settings.grain.size}
              min={0.4}
              max={4}
              step={0.1}
              unit="px"
              hint="Cell size at output resolution. Smaller reads as fine film grain."
              onChange={(size) => patchGrain({ size })}
            />
            <Field
              label="Seed"
              htmlFor="grain-seed"
              hint="The same seed produces the same grain pattern on every export."
            >
              <div className="flex gap-2">
                <TextInput
                  id="grain-seed"
                  type="number"
                  min={1}
                  max={999999}
                  value={settings.grain.seed}
                  onChange={(event) =>
                    patchGrain({ seed: Math.max(1, Number(event.target.value) || 1) })
                  }
                  className="font-mono text-[12px]"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() =>
                    patchGrain({ seed: Math.floor(Math.random() * 999999) + 1 })
                  }
                  className="shrink-0"
                >
                  <Icon name="refresh" size={13} />
                  Shuffle
                </Button>
              </div>
            </Field>
            <div className="rounded-[9px] border border-line-soft bg-white/[0.02] px-3.5 py-3 text-[10.5px] leading-relaxed text-muted-2">
              Grain is generated per photo frame after grading and before the template
              merge, so typography and artwork stay clean.
            </div>
          </>
        ) : null}

        {tab === "output" ? (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="field-label">Resolution</span>
                <span className="font-mono text-[9.5px] text-muted-2">
                  {outputWidth} × {outputHeight} px
                </span>
              </div>
              <Segmented
                label="Output scale"
                value={String(settings.output.scale)}
                onChange={(value) => patchOutput({ scale: Number(value) })}
                options={[
                  { value: "1", label: "1×" },
                  { value: "1.5", label: "1.5×" },
                  { value: "2", label: "2×" },
                ]}
              />
            </div>

            <div>
              <span className="field-label">Format</span>
              <div className="mt-2">
                <Segmented
                  label="Output format"
                  value={settings.output.format}
                  onChange={(format) => patchOutput({ format })}
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPEG" },
                  ]}
                />
              </div>
            </div>

            {settings.output.format === "jpeg" ? (
              <Slider
                label="JPEG quality"
                value={settings.output.jpegQuality}
                min={50}
                max={100}
                step={1}
                unit="%"
                onChange={(jpegQuality) => patchOutput({ jpegQuality })}
              />
            ) : null}

            <Field
              label="Filename pattern"
              htmlFor="filename-pattern"
              hint={`Example: ${filenameExample}`}
            >
              <TextInput
                id="filename-pattern"
                value={settings.output.filenamePattern}
                onChange={(event) => patchOutput({ filenamePattern: event.target.value })}
                placeholder="{{name}}-{{index}}"
                spellCheck={false}
                className="font-mono text-[11.5px]"
              />
              <div className="flex flex-wrap gap-1.5">
                {["{{name}}", "{{index}}"].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() =>
                      patchOutput({
                        filenamePattern: `${settings.output.filenamePattern}${token}`,
                      })
                    }
                    className="rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted-2 hover:text-paper"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </Field>

            <Slider
              label="Parallel renders"
              value={settings.output.concurrency}
              min={1}
              max={4}
              step={1}
              hint="Face detection is serialised; image rendering runs in parallel."
              onChange={(concurrency) => patchOutput({ concurrency })}
            />

            <Notice tone="warn">
              Full-resolution files are stored in this browser&apos;s IndexedDB so the
              export stays available after a reload. Delete old batches to reclaim space.
            </Notice>
          </>
        ) : null}
      </div>
    </section>
  );
}
