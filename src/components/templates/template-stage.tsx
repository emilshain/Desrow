"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DEFAULT_PROCESSING } from "@/lib/defaults";
import { ensureTemplateFonts } from "@/lib/fonts";
import { createPlaceholderPortrait, loadImageElement } from "@/lib/image";
import { renderAsset } from "@/lib/render";
import { layoutText } from "@/lib/text-layout";
import type { PhotoLayer, Template, TextLayer } from "@/lib/types";
import { cx } from "../ui";

export type LayerSelection =
  | { kind: "template" }
  | { kind: "photo" }
  | { kind: "text"; id: string };

const DESIGNER_SETTINGS = {
  ...DEFAULT_PROCESSING,
  crop: { ...DEFAULT_PROCESSING.crop, detectFaces: false },
  grain: { amount: 12, size: 1.1, seed: 7 },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10000) / 10000;

type PhotoDrag = { mode: "move" } | { mode: "resize"; corner: "nw" | "ne" | "sw" | "se" };

export function TemplateStage({
  template,
  values,
  selection,
  onSelect,
  onPhotoChange,
  onTextChange,
}: {
  template: Template;
  values: Record<string, string>;
  selection: LayerSelection;
  onSelect: (selection: LayerSelection) => void;
  onPhotoChange: (patch: Partial<PhotoLayer>) => void;
  onTextChange: (id: string, patch: Partial<TextLayer>) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 560 });
  const [placeholder, setPlaceholder] = useState<HTMLImageElement | null>(null);
  const [textHeights, setTextHeights] = useState<Record<string, number>>({});
  const [drawn, setDrawn] = useState(false);
  const [drawError, setDrawError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = createPlaceholderPortrait();
    loadImageElement(source.toDataURL("image/jpeg", 0.9))
      .then((image) => {
        if (!cancelled) setPlaceholder(image);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const availableWidth = Math.max(180, viewport.width - 48);
  const availableHeight = Math.max(220, viewport.height - 48);
  const scale =
    viewport.width > 0
      ? Math.min(availableWidth / template.width, availableHeight / template.height, 1.2)
      : 0.4;
  const displayW = template.width * scale;
  const displayH = template.height * scale;

  useEffect(() => {
    if (!placeholder) return;
    let cancelled = false;
    setDrawError(false);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rendered = await renderAsset({
            template,
            settings: DESIGNER_SETTINGS,
            values,
            image: placeholder,
            crop: {
              sx: 0,
              sy: 0,
              sw: placeholder.naturalWidth,
              sh: placeholder.naturalHeight,
            },
            scale: 1,
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
          setDrawn(true);
        } catch {
          if (!cancelled) {
            setDrawn(false);
            setDrawError(true);
          }
        }
      })();
    }, 25);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [template, values, placeholder]);

  useEffect(() => {
    let cancelled = false;
    const measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");
    if (!ctx) return;

    void ensureTemplateFonts(template).then(() => {
      if (cancelled) return;
      const heights: Record<string, number> = {};
      for (const layer of template.texts) {
        heights[layer.id] = layoutText(ctx, layer, values, 1, template.width).heightPx;
      }
      setTextHeights(heights);
    });

    return () => {
      cancelled = true;
    };
  }, [template, template.width, values]);

  const beginPhotoMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !displayW || !displayH) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect({ kind: "photo" });

    const startX = event.clientX;
    const startY = event.clientY;
    const base = { ...template.photo };

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / displayW;
      const dy = (moveEvent.clientY - startY) / displayH;
      onPhotoChange({
        x: round(clamp(base.x + dx, 0, Math.max(0, 1 - base.width))),
        y: round(clamp(base.y + dy, 0, Math.max(0, 1 - base.height))),
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const beginPhotoResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    corner: "nw" | "ne" | "sw" | "se",
  ) => {
    if (event.button !== 0 || !displayW || !displayH) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect({ kind: "photo" });

    const startX = event.clientX;
    const startY = event.clientY;
    const base = { ...template.photo };
    const right = base.x + base.width;
    const bottom = base.y + base.height;

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / displayW;
      const dy = (moveEvent.clientY - startY) / displayH;

      let left = base.x;
      let top = base.y;
      let nextRight = right;
      let nextBottom = bottom;

      if (corner.includes("w")) left = clamp(base.x + dx, 0, right - 0.05);
      if (corner.includes("e")) nextRight = clamp(right + dx, base.x + 0.05, 1);
      if (corner.includes("n")) top = clamp(base.y + dy, 0, bottom - 0.05);
      if (corner.includes("s")) nextBottom = clamp(bottom + dy, base.y + 0.05, 1);

      onPhotoChange({
        x: round(left),
        y: round(top),
        width: round(nextRight - left),
        height: round(nextBottom - top),
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const beginTextMove = (event: ReactPointerEvent<HTMLDivElement>, layer: TextLayer) => {
    if (event.button !== 0 || !displayW || !displayH) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect({ kind: "text", id: layer.id });

    const startX = event.clientX;
    const startY = event.clientY;
    const heightNorm = (textHeights[layer.id] ?? layer.size * layer.lineHeight) / template.height;

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / displayW;
      const dy = (moveEvent.clientY - startY) / displayH;
      onTextChange(layer.id, {
        x: round(clamp(layer.x + dx, 0, Math.max(0, 1 - layer.width))),
        y: round(clamp(layer.y + dy, 0, Math.max(0, 1 - heightNorm))),
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const beginTextResize = (event: ReactPointerEvent<HTMLSpanElement>, layer: TextLayer) => {
    if (event.button !== 0 || !displayW) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect({ kind: "text", id: layer.id });

    const startX = event.clientX;
    const baseWidth = layer.width;

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / displayW;
      onTextChange(layer.id, {
        width: round(clamp(baseWidth + dx, 0.05, Math.max(0.05, 1 - layer.x))),
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const boundsStyle = {
    left: template.photo.x * displayW,
    top: template.photo.y * displayH,
    width: template.photo.width * displayW,
    height: template.photo.height * displayH,
  };

  return (
    <div
      ref={stageRef}
      className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden px-6 py-6"
    >
      <div
        className="relative shadow-[0_24px_80px_-32px_rgba(0,0,0,0.95)]"
        style={{ width: displayW, height: displayH }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full rounded-[1px] bg-[#0c0d10]"
          aria-label={`${template.name} canvas preview`}
        />
        {!drawn ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0c0f]">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-2">
              {drawError ? "Preview unavailable" : "Preparing canvas"}
            </span>
          </div>
        ) : null}

        <div
          className="absolute inset-0"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onSelect({ kind: "template" });
          }}
        >
          <div
            onPointerDown={(event) => beginPhotoMove(event)}
            className={cx(
              "absolute cursor-move border",
              selection.kind === "photo"
                ? "border-[rgba(229,211,174,0.85)]"
                : "border-transparent hover:border-white/30",
            )}
            style={boundsStyle}
            aria-label="Photo frame layer"
          >
            {selection.kind === "photo" ? (
              <>
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-accent">
                  Photo frame
                </span>
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <span
                    key={corner}
                    role="presentation"
                    onPointerDown={(event) => beginPhotoResize(event, corner)}
                    className={cx(
                      "absolute z-10 block h-[9px] w-[9px] rounded-[1px] border border-[#101114] bg-accent",
                      corner === "nw" && "-left-[5px] -top-[5px] cursor-nwse-resize",
                      corner === "ne" && "-right-[5px] -top-[5px] cursor-nesw-resize",
                      corner === "sw" && "-bottom-[5px] -left-[5px] cursor-nesw-resize",
                      corner === "se" && "-bottom-[5px] -right-[5px] cursor-nwse-resize",
                    )}
                  />
                ))}
              </>
            ) : null}
          </div>

          {template.texts.map((layer) => {
            const heightPx = (textHeights[layer.id] ?? layer.size * layer.lineHeight) * scale;
            const textSelected = selection.kind === "text" && selection.id === layer.id;
            return (
              <div
                key={layer.id}
                onPointerDown={(event) => beginTextMove(event, layer)}
                className={cx(
                  "absolute cursor-move border",
                  textSelected
                    ? "border-[rgba(229,211,174,0.85)]"
                    : "border-transparent hover:border-white/25",
                )}
                style={{
                  left: layer.x * displayW,
                  top: layer.y * displayH,
                  width: layer.width * displayW,
                  height: Math.max(12, heightPx),
                }}
                aria-label={`${layer.name} text layer`}
              >
                {textSelected ? (
                  <>
                    <span className="pointer-events-none absolute -top-5 left-0 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-accent">
                      {layer.name}
                    </span>
                    <span
                      role="presentation"
                      onPointerDown={(event) => beginTextResize(event, layer)}
                      className="absolute -right-[4px] top-1/2 block h-4 w-[7px] -translate-y-1/2 cursor-ew-resize rounded-[1px] border border-[#101114] bg-accent"
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
