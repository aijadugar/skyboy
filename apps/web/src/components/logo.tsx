import Image from "next/image";

// The Skyboy shaka. The hand is the mark; ".in" is the wordmark, kept as type
// so it stays a fact rather than a fake logo (taste-skill §9G).
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? { w: 28, h: 15 } : { w: 40, h: 21 };
  return (
    <Image
      src="/logo.svg"
      alt="Skyboy"
      width={dims.w}
      height={dims.h}
      priority
    />
  );
}