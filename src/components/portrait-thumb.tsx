"use client";

import { useEffect, useState } from "react";
import { proxiedImageUrl } from "@/lib/drive";
import { Icon } from "./icons";
import { cx } from "./ui";

export function PortraitThumb({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const proxied = proxiedImageUrl(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [proxied]);

  if (!proxied || failed) {
    return (
      <span
        className={cx(
          "flex items-center justify-center rounded-[5px] border border-line bg-[#0c0d10] text-muted-2",
          className,
        )}
        title="Portrait unavailable"
      >
        <Icon name="image" size={13} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxied}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cx("rounded-[5px] border border-line object-cover", className)}
    />
  );
}
