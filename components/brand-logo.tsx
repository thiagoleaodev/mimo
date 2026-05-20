import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  alt = "Mimo",
  className,
  priority = false,
  sizes = "32px",
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "relative block size-8 shrink-0 overflow-hidden rounded-md",
        className,
      )}
    >
      <Image
        alt={alt}
        className="object-contain"
        fill
        priority={priority}
        sizes={sizes}
        src="/logo.png"
      />
    </span>
  );
}
