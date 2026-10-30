"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, buttonStyles, cx, EmptyState, PageHeader } from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { formatRelative } from "@/lib/download";
import { SAMPLE_VALUES } from "@/lib/defaults";

function Specimen() {
  return (
    <div className="relative mx-auto w-full max-w-[318px]">
      <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(closest-side,rgba(229,211,174,0.13),transparent)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[16px] border border-[#34363b] bg-[#0b0c0e] shadow-[0_28px_70px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative aspect-[3/4] overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#d9d4c7_0%,#aaa69c_26%,#6b6a65_52%,#333432_78%,#131414_100%)]" />
          <div className="absolute left-1/2 top-[16%] h-[38%] w-[55%] -translate-x-1/2 rounded-[48%_52%_45%_47%] bg-[linear-gradient(180deg,rgba(240,236,225,0.95),rgba(176,171,160,0.8))]" />
          <div className="absolute left-1/2 top-[44%] h-[64%] w-[122%] -translate-x-1/2 rounded-[50%_50%_0_0] bg-[linear-gradient(180deg,#262725_0%,#111212_55%,#0a0b0b_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_36%,transparent,rgba(4,5,5,0.55))]" />
          <div
            className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.7'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(5,6,6,0.86)_34%,rgba(5,6,6,0.97))] px-5 pb-5 pt-14">
            <p className="font-serif text-[31px] leading-none text-paper">
              {SAMPLE_VALUES.name}
            </p>
            <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.19em] text-paper/50">
              {SAMPLE_VALUES.title}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/35">
                Desrow / Portrait archive
              </span>
              <span className="font-mono text-[8px] text-white/35">{SAMPLE_VALUES.id}</span>
            </div>
          </div>
          <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/25 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/60 backdrop-blur">
            Specimen 04
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="mono-meta">900 × 1200 px</span>
          <span className="mono-meta">Grain 18 · Curve 04</span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta: string;
}) {
  return (
    <div className="px-5 py-4 sm:py-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 font-serif text-[34px] leading-none text-paper">{value}</div>
      <div className="mt-2 text-[11px] text-muted-2">{meta}</div>
    </div>
  );
}

export default function OverviewPage() {
  const { datasets, templates, runs, loading } = useWorkspace();
  const records = datasets.reduce((total, dataset) => total + dataset.rows.length, 0);
  const exported = runs.reduce((total, run) => total + run.succeeded, 0);
  const lastRun = runs[0];

  const steps = [
    {
      number: "01",
      href: "/source",
      icon: "source" as const,
      title: "Bring in the rows",
      body: "Import a CSV or fetch a public Google Sheet. Map the name and portrait-link columns once.",
      status: datasets.length
        ? `${datasets.length} dataset${datasets.length === 1 ? "" : "s"} · ${records.toLocaleString()} records`
        : "No source yet",
      ready: datasets.length > 0,
    },
    {
      number: "02",
      href: "/templates",
      icon: "templates" as const,
      title: "Set the master template",
      body: "Upload your artwork, then place the photo frame and typographic layers with exact coordinates.",
      status: templates.length
        ? `${templates.length} template${templates.length === 1 ? "" : "s"}`
        : "No template yet",
      ready: templates.length > 0,
    },
    {
      number: "03",
      href: "/render",
      icon: "crop" as const,
      title: "Tune the photographic pass",
      body: "Face detection, channel mix, tone curve, grain and output sizing — every value is adjustable.",
      status: "Defaults ready",
      ready: true,
    },
    {
      number: "04",
      href: "/render",
      icon: "exports" as const,
      title: "Render and release",
      body: "Process the batch, review every frame, nudge individual crops, then download a packaged ZIP.",
      status: exported ? `${exported.toLocaleString()} assets exported` : "Nothing exported yet",
      ready: datasets.length > 0 && templates.length > 0,
    },
  ];

  return (
    <div>
      <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone="accent">
              <span className="h-1 w-1 rounded-full bg-accent" />
              Spreadsheet → portrait asset
            </Badge>
            <span className="mono-meta">Local-first · no account required</span>
          </div>
          <h1 className="display max-w-[11ch] text-[clamp(3.1rem,7.3vw,6rem)] text-paper">
            Rows in.
            <br />
            <span className="text-accent">Portraits out.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[14px] leading-relaxed text-muted">
            Desrow turns names and raw image links into consistent black-and-white
            portraits, merged into your master layout. Face detection, custom tone
            curves, film grain and bulk export — one repeatable pipeline.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link href="/source" className={buttonStyles("primary", "lg")}>
              <Icon name="upload" size={16} />
              Import source
            </Link>
            <Link href="/render" className={buttonStyles("secondary", "lg")}>
              Open the render bench
              <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          <div className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-line-soft pt-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                Frames
              </div>
              <div className="mt-1 text-[12.5px] text-paper-dim">Any pixel size</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                Grade
              </div>
              <div className="mt-1 text-[12.5px] text-paper-dim">5-point curve</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                Output
              </div>
              <div className="mt-1 text-[12.5px] text-paper-dim">PNG / JPEG · ZIP</div>
            </div>
          </div>
        </div>
        <Specimen />
      </section>

      <section className="mt-14 panel grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 md:divide-y-0">
        <Stat
          label="Records"
          value={loading ? "—" : records.toLocaleString()}
          meta={datasets.length ? `${datasets.length} source${datasets.length === 1 ? "" : "s"}` : "Import to begin"}
        />
        <Stat
          label="Templates"
          value={loading ? "—" : templates.length}
          meta={templates[0]?.name ?? "No master template"}
        />
        <Stat
          label="Assets exported"
          value={loading ? "—" : exported.toLocaleString()}
          meta={runs.length ? `${runs.length} render${runs.length === 1 ? "" : "s"}` : "Batch history"}
        />
        <Stat
          label="Last export"
          value={lastRun ? formatRelative(lastRun.createdAt) : "—"}
          meta={lastRun ? `${lastRun.succeeded} of ${lastRun.total} frames` : "Nothing rendered yet"}
        />
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The pipeline</p>
            <h2 className="mt-2 text-[19px] font-medium tracking-[-0.01em] text-paper">
              Four deliberate passes, one batch
            </h2>
          </div>
          <span className="mono-meta hidden sm:block">Control every value manually</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="panel group relative overflow-hidden p-5 transition-colors hover:border-[#383b42]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.12em] text-muted-2">
                    {step.number}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/[0.025] text-accent">
                    <Icon name={step.icon} size={15} />
                  </span>
                </div>
                <Badge tone={step.ready ? "ok" : "neutral"}>{step.status}</Badge>
              </div>
              <h3 className="mt-4 text-[15px] font-medium text-paper">{step.title}</h3>
              <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted-2">
                {step.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted group-hover:text-accent">
                Open
                <Icon
                  name="arrowRight"
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Recent renders</p>
            <h2 className="mt-2 text-[19px] font-medium tracking-[-0.01em] text-paper">
              Output history
            </h2>
          </div>
          <Link
            href="/exports"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-paper"
          >
            All exports
            <Icon name="arrowUpRight" size={13} />
          </Link>
        </div>

        {lastRun ? (
          <div className="panel overflow-hidden">
            <div className="hidden grid-cols-[1.6fr_1fr_0.7fr_0.7fr] gap-4 border-b border-line-soft px-5 py-3 md:grid">
              {["Batch", "Template", "Frames", "Created"].map((heading) => (
                <span key={heading} className="eyebrow">
                  {heading}
                </span>
              ))}
            </div>
            {runs.slice(0, 4).map((run) => (
              <Link
                key={run.id}
                href="/exports"
                className="grid gap-2 border-b border-line-soft px-5 py-4 transition-colors last:border-0 hover:bg-white/[0.02] md:grid-cols-[1.6fr_1fr_0.7fr_0.7fr] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-paper">{run.name}</div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-muted-2">
                    {run.datasetName}
                  </div>
                </div>
                <div className="truncate text-[12px] text-muted">{run.templateName}</div>
                <div className="flex items-center gap-2 md:block">
                  <span className="mono-meta">Frames</span>
                  <span className="text-[12px] text-paper-dim">{run.succeeded}/{run.total}</span>
                </div>
                <div className="text-[11.5px] text-muted-2">{formatRelative(run.createdAt)}</div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="archive"
            title="No renders yet"
            description="Import a source and a template, then run your first batch. Completed exports are listed here with every asset stored locally."
            action={
              <Link href="/source" className={buttonStyles("primary", "sm")}>
                Start with a source
              </Link>
            }
          />
        )}
      </section>

      <p className="mt-10 max-w-2xl border-t border-line-soft pt-5 text-[11px] leading-relaxed text-muted-2">
        Photographs are fetched through this app&apos;s local image proxy so they can be
        graded on canvas. Nothing is sent to a third-party service. Face detection runs
        inside your browser.
      </p>
    </div>
  );
}
