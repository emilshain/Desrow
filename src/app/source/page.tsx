"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ImportPanel, type StagedImport } from "@/components/source/import-panel";
import { DatasetBrowser } from "@/components/source/dataset-browser";
import { StagedReview } from "@/components/source/staged-review";
import {
  buttonStyles,
  Notice,
  PageHeader,
} from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { usePersistentSelection } from "@/lib/selection";
import type { Dataset } from "@/lib/types";

export default function SourcePage() {
  const { datasets } = useWorkspace();
  const [selectedId, setSelectedId] = usePersistentSelection("dataset");
  const [staged, setStaged] = useState<StagedImport | null>(null);
  const [saved, setSaved] = useState<Dataset | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId && datasets.length) setSelectedId(datasets[0].id);
  }, [selectedId, datasets, setSelectedId]);

  useEffect(() => {
    if (staged) {
      reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [staged]);

  return (
    <div>
      <PageHeader
        eyebrow="Source"
        title="Rows, resolved."
        description="Bring in a CSV or a public Google Sheet, then map the two columns that matter: the person and their portrait. Every other column becomes a text token."
        actions={
          datasets.length ? (
            <Link href="/render" className={buttonStyles("secondary", "md")}>
              Open render
              <Icon name="arrowRight" size={14} />
            </Link>
          ) : null
        }
      />

      <div id="source-import" ref={reviewRef} className="scroll-mt-6">
        {staged ? (
          <StagedReview
            staged={staged}
            onCancel={() => setStaged(null)}
            onSaved={(dataset) => {
              setSelectedId(dataset.id);
              setSaved(dataset);
              setStaged(null);
            }}
          />
        ) : (
          <ImportPanel
            onParsed={(next) => {
              setSaved(null);
              setStaged(next);
            }}
          />
        )}
      </div>

      {saved ? (
        <div className="mt-4">
          <Notice tone="success">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              Saved “{saved.name}” with {saved.rows.length.toLocaleString()} records.
              <Link
                href="/render"
                className="inline-flex items-center gap-1 text-paper underline decoration-white/25 underline-offset-2 hover:decoration-accent"
              >
                Continue to render
                <Icon name="arrowRight" size={11} />
              </Link>
              <button
                type="button"
                onClick={() => setSaved(null)}
                className="ml-1 text-[11px] text-muted-2 underline underline-offset-2 hover:text-paper"
              >
                Dismiss
              </button>
            </span>
          </Notice>
        </div>
      ) : null}

      <div className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="mt-2 text-[19px] font-medium tracking-[-0.01em] text-paper">
              Source records
            </h2>
          </div>
          <span className="mono-meta hidden sm:block">
            {datasets.length} dataset{datasets.length === 1 ? "" : "s"}
          </span>
        </div>
        <DatasetBrowser
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSaved(null);
          }}
        />
      </div>
    </div>
  );
}
