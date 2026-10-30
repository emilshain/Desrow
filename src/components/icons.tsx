import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "overview"
  | "source"
  | "templates"
  | "render"
  | "exports"
  | "plus"
  | "upload"
  | "link"
  | "file"
  | "image"
  | "text"
  | "crop"
  | "grain"
  | "tone"
  | "download"
  | "archive"
  | "trash"
  | "x"
  | "check"
  | "alert"
  | "refresh"
  | "arrowLeft"
  | "arrowRight"
  | "arrowUpRight"
  | "chevronLeft"
  | "chevronDown"
  | "play"
  | "stop"
  | "grip"
  | "reset"
  | "external"
  | "search"
  | "database"
  | "eye"
  | "close";

const PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </>
  ),
  source: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </>
  ),
  templates: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  render: (
    <>
      <path d="M3 6h10M17 6h4M3 12h4M11 12h10M3 18h10M17 18h4" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="18" r="2" />
    </>
  ),
  exports: (
    <>
      <path d="M3 8h18v11H3z" />
      <path d="M8 8V5h8v3M9 13h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L13 18" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-9 9" />
    </>
  ),
  text: (
    <>
      <path d="M5 6V4h14v2M12 4v16M9 20h6" />
    </>
  ),
  crop: (
    <>
      <path d="M6 3v13a2 2 0 0 0 2 2h13" />
      <path d="M3 6h13a2 2 0 0 1 2 2v13" />
    </>
  ),
  grain: (
    <>
      <circle cx="7" cy="7" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="17" cy="8" r="1" />
      <circle cx="5" cy="13" r="1" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="15" cy="14" r="1" />
      <circle cx="19" cy="18" r="1" />
      <circle cx="7" cy="19" r="1" />
      <circle cx="13" cy="19" r="1" />
    </>
  ),
  tone: (
    <>
      <path d="M3 20V4M3 20h18" />
      <path d="M4 18c4-1 5-11 9-12s5 6 8 5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </>
  ),
  archive: (
    <>
      <path d="M4 8h16v12H4z" />
      <path d="M2 4h20v4H2zM10 12h4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4 12l5 5L20 6" />,
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3Z" />
      <path d="M12 9v5M12 17.5v.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6.3" />
      <path d="M20 4v7h-7" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8 7h9v9" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  play: <path d="M7 4l13 8-13 8V4Z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  reset: (
    <>
      <path d="M4 13a8 8 0 1 0 2.3-6.3" />
      <path d="M4 4v7h7" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8.5" stroke="#3a3d44" />
      <path d="M8 11h9M8 16h5.5M8 21h3" stroke="#f1ede4" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="21.5" cy="18.5" r="4.5" stroke="#e5d3ae" strokeWidth="1.5" />
    </svg>
  );
}
