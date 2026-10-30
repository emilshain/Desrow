"use client";

import { useEffect, useState } from "react";
import { renderTemplateThumbnail } from "@/lib/render";
import type { Template } from "@/lib/types";
import { cx } from "../ui";

export function TemplateThumbnail({
  template,
  values,
  className,
  maxWidth = 520,
}: {
  template: Template;
  values?: Record<string, string>;
  className?: string;
  maxWidth?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);

    renderTemplateThumbnail(template, values, maxWidth)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [template, values, maxWidth]);

  return (
    <div className={cx("checker relative overflow-hidden", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${template.name} preview`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#0c0d10]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-2">
            Rendering preview
          </span>
        </div>
      )}
    </div>
  );
}
