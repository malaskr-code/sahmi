"use client";

import Image from "next/image";
import { useState } from "react";

type CompanyLogoProps = {
  src: string;
  name: string;
  logoBg: string;
  className: string;
};

export function CompanyLogo({ src, name, logoBg, className }: CompanyLogoProps) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed = failedSrc === src;
  const initials = name.trim().split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 3).join("");

  return (
    <div
      role="img"
      aria-label={name}
      style={{ backgroundColor: logoBg }}
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-[var(--line)] ${className}`}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          width={96}
          height={96}
          className="h-full w-full object-contain"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true" className="font-display text-sm font-bold text-[var(--gold-dark)]">
          {initials}
        </span>
      )}
    </div>
  );
}
