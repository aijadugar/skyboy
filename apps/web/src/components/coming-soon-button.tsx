"use client";

import { useRouter } from "next/navigation";
import { DrawablyButton } from "drawably/react";

export function ComingSoonButton({ variant = "solid" }: { variant?: "solid" | "outline" }) {
  const router = useRouter();
  return (
    <DrawablyButton
      variant={variant}
      onClick={() => {
        if (window.location.pathname === "/download") {
          document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
          window.history.replaceState(null, "", "/download#waitlist");
          return;
        }
        router.push("/download#waitlist");
      }}
    >
      Coming soon
    </DrawablyButton>
  );
}
