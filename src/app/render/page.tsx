"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { RenderBench } from "@/components/render/render-bench";
import {
  Badge,
  buttonStyles,
  PageHeader,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { usePersistentSelection } from "@/lib/selection";

export default function RenderPage() {
  const { datasets, templates, loading } = useWorkspace();
  const [datasetId, setDatasetId] = usePersistentSelection("dataset");
  const [templateId, setTemplateId] = usePersistentSelection("template");

  useEffect(() => {
    if (!datasets.length) return;
    if (!datasetId || !datasets.some((dataset) => dataset.id === datasetId)) {
      setDatasetId(datasets[0].id);
    }
  }, [datasets, datasetId, setDatasetId]);

  useEffect(() => {
    if (!templates.length) return;
    if (!templateId || !templates.some((template) => template.id === templateId)) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId, setTemplateId]);

  const dataset = datasets.find((entry) => entry.id === datasetId) ?? datasets[0];
  const template = templates.find((entry) => entry.id === templateId) ?? templates[0];

  return (
    <div>
      <PageHeader
        eyebrow="Render"
        title="The photographic pass."
        description="Face-aware crops, a custom monochrome grade, film grain and the master template — rendered together. Every value is a manual control, and any single record can override the crop."
        actions={
          template ? (
            <Link
              href={`/templates/${template.id}`}
              className={buttonStyles("secondary", "md")}
            >
              <Icon name="templates" size={14} />
              Edit template
            </Link>
          ) : null
        }
      />

      {loading && !datasets.length && !templates.length ? (
        <div className="panel px-6 py-16 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
          Opening local workspace…
        </div>
      ) : null}

      {!loading && (!dataset || !template) ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Input 01</p>
              <Badge tone={dataset ? "ok" : "warn"}>
                {dataset ? "Ready" : "Missing"}
              </Badge>
            </div>
            <h2 className="mt-4 text-[16px] font-medium text-paper">Source records</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-2">
              {dataset
                ? `${dataset.name} · ${dataset.rows.length.toLocaleString()} records are ready.`
                : "Names and portrait links must come from a CSV or a public Google Sheet before a batch can run."}
            </p>
            <Link
              href="/source"
              className={`${buttonStyles(dataset ? "secondary" : "primary", "sm")} mt-5`}
            >
              <Icon name="source" size={13} />
              {dataset ? "Manage source" : "Import source"}
            </Link>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Input 02</p>
              <Badge tone={template ? "ok" : "warn"}>
                {template ? "Ready" : "Missing"}
              </Badge>
            </div>
            <h2 className="mt-4 text-[16px] font-medium text-paper">Master template</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-2">
              {template
                ? `${template.name} · ${template.width} × ${template.height} px.`
                : "A template supplies the photo frame, typography and artwork every asset is merged into."}
            </p>
            <Link
              href="/templates"
              className={`${buttonStyles(template ? "secondary" : "primary", "sm")} mt-5`}
            >
              <Icon name="templates" size={13} />
              {template ? "Manage templates" : "Create a template"}
            </Link>
          </section>
        </div>
      ) : null}

      {dataset && template ? (
        <RenderBench
          dataset={dataset}
          template={template}
          datasets={datasets}
          templates={templates}
          onDatasetChange={setDatasetId}
          onTemplateChange={setTemplateId}
        />
      ) : null}

      <p className="mt-8 border-t border-line-soft pt-4 text-[10.5px] leading-relaxed text-muted-2">
        Face detection uses MediaPipe BlazeFace inside this browser. Portraits are fetched
        through the local image proxy, graded on canvas and merged into the selected
        template. No photo is sent to a third-party inference service.
      </p>
    </div>
  );
}
