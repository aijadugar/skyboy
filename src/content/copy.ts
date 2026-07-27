import { CLI_NAME } from "@/lib/constants";

export const siteCopy = {
  name: "Skyboy",
  description: "Skyboy landing page scaffold.",
  cliName: CLI_NAME,
} as const;

export const algorithmLifecycleSteps = [
  "Collect datasets",
  "Build eval scripts",
  "Run benchmarks",
  "Compare baselines",
  "Track experiments",
  "Make plots",
  "Write reports",
  "Package for deploy",
] as const;
