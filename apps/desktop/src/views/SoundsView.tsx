import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card, Pill, ViewHeader } from "../components/ui/primitives";
import { t } from "../i18n";
import { describeError, listSounds, previewSound, stopSound } from "../lib/ipc";
import { useStrings } from "../lib/labels";
import type { Settings, SoundInfo } from "../lib/types";

export interface SoundsViewProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onError: (message: string) => void;
}

/**
 * The gallery of built-in sounds.
 *
 * The list comes from the core rather than being written here, so the gallery
 * cannot offer something the alert engine cannot play - the same list drives
 * both. Preview plays through the core, which is what makes the preview
 * trustworthy: it is the same code path an alert takes, including the file
 * lookup inside the app bundle.
 */
export function SoundsView({ settings, onSave, onError }: SoundsViewProps) {
  const strings = useStrings();
  const [sounds, setSounds] = useState<SoundInfo[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    listSounds()
      .then(setSounds)
      .catch((error: unknown) => onError(describeError(error)));
  }, [onError]);

  // A preview is a fraction of a second; the button returns to "Preview" on its
  // own rather than waiting for the sound to end, which cannot be observed from
  // here without a callback the core does not provide.
  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setTimeout(() => setPlaying(null), 1600);
    return () => window.clearTimeout(timer);
  }, [playing]);

  const preview = async (sound: SoundInfo) => {
    try {
      setPlaying(sound.id);
      await previewSound(sound.id);
    } catch (error) {
      onError(describeError(error));
    }
  };

  const stop = async () => {
    setPlaying(null);
    try {
      await stopSound();
    } catch (error) {
      onError(describeError(error));
    }
  };

  const choose = (sound: SoundInfo) => {
    void onSave({
      ...settings,
      alerts: { ...settings.alerts, soundId: sound.id, sound: sound.isSilent ? false : true },
    });
  };

  return (
    <div>
      <ViewHeader
        title={t("sounds.title")}
        subtitle={t("sounds.subtitle")}
        actions={
          playing ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<Square className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => void stop()}
            >
              {strings.stop}
            </Button>
          ) : null
        }
      />

      <ul className="grid gap-2 sm:grid-cols-2">
        {sounds.map((sound) => {
          const chosen = settings.alerts.soundId === sound.id;
          return (
            <li key={sound.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{sound.name}</span>
                      {sound.isDefault ? (
                        <span className="text-xs text-ink-subtle">{t("sounds.default")}</span>
                      ) : null}
                      {chosen ? <Pill tone="accent">{t("sounds.playing")}</Pill> : null}
                    </div>
                    <p className="mt-1 max-w-prose text-xs text-ink-muted">{sound.description}</p>
                    {sound.approximateSeconds > 0 ? (
                      <p className="mt-1 font-mono text-xs text-ink-subtle">
                        {sound.approximateSeconds.toFixed(1)}s
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    {sound.isSilent ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => void preview(sound)}
                      >
                        {playing === sound.id ? t("sounds.playing") : strings.preview}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={chosen ? "ghost" : "secondary"}
                      disabled={chosen}
                      onClick={() => choose(sound)}
                    >
                      {chosen ? t("sounds.default") : strings.enable}
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
