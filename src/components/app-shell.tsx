"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, BrandMark, type IconName } from "./icons";
import { cx } from "./ui";
import { WorkspaceProvider, useWorkspace } from "./workspace-provider";

const NAV: { href: string; label: string; icon: IconName; key: string }[] = [
  { href: "/", label: "Overview", icon: "overview", key: "overview" },
  { href: "/source", label: "Source", icon: "source", key: "source" },
  { href: "/templates", label: "Templates", icon: "templates", key: "templates" },
  { href: "/render", label: "Render", icon: "render", key: "render" },
  { href: "/exports", label: "Exports", icon: "exports", key: "exports" },
];

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { datasets, templates, runs } = useWorkspace();

  const counts: Record<string, number> = {
    source: datasets.length,
    templates: templates.length,
    exports: runs.length,
  };

  return (
    <nav className={mobile ? "flex items-center gap-1 overflow-x-auto" : "flex flex-col gap-0.5"}>
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "group flex items-center gap-2.5 rounded-[9px] text-[13px] transition-colors",
              mobile ? "h-9 shrink-0 px-3" : "h-10 px-2.5",
              active
                ? "bg-white/[0.055] text-paper"
                : "text-muted hover:bg-white/[0.025] hover:text-paper-dim",
            )}
          >
            <Icon
              name={item.icon}
              size={16.5}
              className={active ? "text-accent" : "text-muted-2 group-hover:text-muted"}
            />
            <span className={mobile ? "whitespace-nowrap" : ""}>{item.label}</span>
            {!mobile && counts[item.key] ? (
              <span className="ml-auto font-mono text-[10px] text-muted-2">{counts[item.key]}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-line-soft bg-[#08090b]/85 px-4 py-5 backdrop-blur lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-1.5">
        <BrandMark />
        <span>
          <span className="block font-serif text-[23px] leading-none tracking-[-0.01em] text-paper">
            Desrow
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-muted-2">
            Portrait automation
          </span>
        </span>
      </Link>

      <div className="mt-9 px-2.5">
        <p className="eyebrow">Workspace</p>
      </div>
      <div className="mt-2.5">
        <NavLinks />
      </div>

      <div className="mt-auto space-y-3">
        <div className="rounded-[11px] border border-line-soft bg-white/[0.02] px-3 py-3">
          <div className="flex items-center gap-2 text-[11.5px] text-paper-dim">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
            </span>
            Local workspace
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-2">
            Projects and assets stay in this browser. No account, no upload.
          </p>
        </div>
        <div className="flex items-center justify-between px-1">
          <a
            href="https://github.com/emilshain/Desrow"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-2 transition-colors hover:text-paper"
          >
            <Icon name="external" size={11} />
            Source
          </a>
          <span className="font-mono text-[10px] text-muted-2">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-w-0">
        <div className="sticky top-0 z-30 border-b border-line-soft bg-[#08090b]/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark size={26} />
              <span className="font-serif text-[20px] leading-none text-paper">Desrow</span>
            </Link>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-2">
              Local
            </span>
          </div>
          <div className="px-2.5 pb-2 pt-2.5">
            <NavLinks mobile />
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1480px] px-4 pb-20 pt-7 sm:px-7 lg:px-9 lg:pt-9">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <Frame>{children}</Frame>
    </WorkspaceProvider>
  );
}
