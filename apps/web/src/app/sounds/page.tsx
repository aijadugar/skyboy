import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/page-shell";
import { SoundGallery } from "@/components/sound-gallery";

export const metadata: Metadata = {
  title: "Sounds",
  description:
    "Preview the built-in Skyboy alert sounds for finished tasks, questions, permissions, errors, and the repeating ring.",
};

export default function SoundsPage() {
  return (
    <PageShell current="/sounds">
      <PageHeader
        eyebrow="Sounds"
        title="Hear the alert before you commit to it."
        lede="Each event can have its own sound. Press preview to play the built-in tone in your browser. The app is not required for this page."
      />
      <div className="mt-10">
        <SoundGallery />
      </div>
    </PageShell>
  );
}
