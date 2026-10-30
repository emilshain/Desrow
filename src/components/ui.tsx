"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./icons";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonStyles(variant: Variant = "secondary", size: Size = "md"): string {
  return cx("btn", `btn-${variant}`, `btn-${size}`);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button className={cx(buttonStyles(variant, size), className)} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="display text-[clamp(2.3rem,4.2vw,3.3rem)] text-paper">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11.5px] leading-relaxed text-muted-2">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("input", className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("textarea", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx("select", className)} {...props}>
      {children}
    </select>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  hint,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const display = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return (
    <div className={cx("flex flex-col gap-2", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            className="num-input"
            value={display}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-label={`${label} value`}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                onChange(Math.min(max, Math.max(min, next)));
              }
            }}
          />
          {unit ? <span className="mono-meta">{unit}</span> : null}
        </div>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? <p className="text-[11px] leading-snug text-muted-2">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-paper">{label}</p>
        {hint ? <p className="mt-1 text-[11.5px] leading-relaxed text-muted-2">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full border transition-colors",
          checked
            ? "border-[rgba(229,211,174,0.5)] bg-[rgba(229,211,174,0.85)]"
            : "border-line bg-[#1c1f24]",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cx(
            "absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full transition-all",
            checked ? "left-[19px] bg-[#121317]" : "left-[3px] bg-[#77746c]",
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      className="inline-flex rounded-[9px] border border-line bg-[#0a0b0e] p-[3px]"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            "h-[28px] rounded-[6px] px-3 text-[11.5px] font-medium transition-colors",
            value === option.value
              ? "bg-[#26292f] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "text-muted-2 hover:text-paper",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "ok" | "danger" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "badge",
        tone === "accent" && "badge-accent",
        tone === "ok" && "badge-ok",
        tone === "danger" && "badge-danger",
        tone === "warn" && "badge-warn",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "warn" | "success";
  children: ReactNode;
}) {
  const styles = {
    info: "border-line bg-white/[0.025] text-muted",
    error: "border-[rgba(224,122,95,0.3)] bg-[rgba(224,122,95,0.06)] text-[#e6a08d]",
    warn: "border-[rgba(217,174,99,0.3)] bg-[rgba(217,174,99,0.06)] text-[#e0c28e]",
    success: "border-[rgba(157,190,152,0.28)] bg-[rgba(157,190,152,0.06)] text-[#b7cfb2]",
  } as const;

  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-[12px] leading-relaxed",
        styles[tone],
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon
        name={tone === "error" || tone === "warn" ? "alert" : tone === "success" ? "check" : "alert"}
        size={14}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: IconName;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line text-center",
        compact ? "px-6 py-8" : "px-8 py-16",
      )}
    >
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.02] text-accent">
        <Icon name={icon} size={18} />
      </span>
      <h3 className="text-[14px] font-medium text-paper">{title}</h3>
      <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted-2">{description}</p>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ size = 15 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block animate-spin rounded-full border border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative w-full overflow-hidden rounded-[16px] border border-line bg-[#101216] shadow-2xl",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-[15px] font-medium text-paper">{title}</h2>
            {description ? (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-2">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm -mr-1 h-7 w-7 shrink-0 p-0"
            aria-label="Close"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
        {children ? <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line-soft bg-black/20 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function Meta({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={cx("mt-1.5 text-[12.5px] text-paper-dim", mono && "font-mono")}>{value}</div>
    </div>
  );
}
