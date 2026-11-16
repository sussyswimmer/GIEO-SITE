export type Tier = 'full' | 'lite' | 'still';

export type TierSignals = {
  override?: string | null; // ?tier=full|lite|still (QA)
  reducedMotion: boolean;
  saveData: boolean;
  deviceMemory?: number; // undefined on Safari/Firefox: not a low-end signal
  cores: number;
  avgFrameMs?: number; // undefined until measured
};

// docs/07-redesign.md §4: Full and Lite both scrub the films (Lite takes the smaller set); Still shows key frames.
// WebGL2 is no longer a signal: an opaque film needs only a 2D canvas.
export function pickTier(s: TierSignals): Tier {
  if (s.override === 'full' || s.override === 'lite' || s.override === 'still') return s.override;
  // Save-Data asks for less: a film is megabytes of video, its key frames a few hundred KB.
  if (s.reducedMotion || s.saveData) return 'still';
  if ((s.deviceMemory !== undefined && s.deviceMemory <= 4) || s.cores <= 4) return 'lite';
  if (s.avgFrameMs !== undefined && s.avgFrameMs >= 22) return 'lite';
  return 'full';
}
