import type { Metadata } from "next";
import { DownloadPanel } from "@/components/download-panel";
import { PageHeader, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Skyboy installers are not published yet. Join the waitlist with your operating system and the agents you use.",
};

export default function DownloadPage() {
  return (
    <PageShell current="/download">
      <PageHeader
        eyebrow="Download"
        title="No installer yet."
        lede="Skyboy will offer one button per operating system, with a version, a date, and a checksum. Until the app ships, the button joins the waitlist."
      />
      <DownloadPanel />
    </PageShell>
  );
}
