// Conservative patterns - only strip END suffixes to avoid false positives like "Live and Let Die"
const PATTERNS = [
  // Remaster: "- 2013 Remaster", "(Remastered 2020)", "[Remaster]"
  /\s*[-–]\s*(?:\d{4}\s*)?(?:Remaster(?:ed)?|Remastered(?:\s+\d{4})?)$/i,
  /\s*[([](?:\d{4}\s+)?Remaster(?:ed)?(?:\s+\d{4})?[)\]]$/i,

  // Edition: "(Deluxe Edition)", "- Deluxe", "- Deluxe Edition", "[Bonus Track]"
  /\s*[([](?:Deluxe|Special|Anniversary|Expanded|Extended|Collector'?s?|Legacy|Ultimate|Super Deluxe)\s*(?:Edition|Version)?[)\]]$/i,
  /\s*[-–]\s*(?:Deluxe|Bonus Track)(?:\s+(?:Edition|Version))?$/i,

  // Live/Acoustic: "(Live)", "[Acoustic Version]" - NOT "Live and Let Die"
  /\s*[([](?:Live|Acoustic|Unplugged)(?:\s+(?:at\s+.+|from\s+.+|Version|Recording))?[)\]]$/i,
  /\s*[-–]\s*(?:Live|Acoustic)\s*(?:Version)?$/i,

  // Remix/Edit: "(Radio Edit)", "[Extended Mix]"
  /\s*[([](?:Radio\s+Edit|Single\s+Version|Album\s+Version|Extended\s+Mix|Club\s+Mix|Edit)[)\]]$/i,

  // Featured: "(feat. Artist)", "(ft. Someone)"
  /\s*[([](?:feat\.?|ft\.?|featuring|with)\s+[^)\]]+[)\]]$/i,
  /\s*[-–]\s*(?:feat\.?|ft\.?|featuring)\s+.+$/i,

  // Mono/Stereo: "(Mono)", "[Stereo Mix]"
  /\s*[([](?:Mono|Stereo)(?:\s+(?:Mix|Version))?[)\]]$/i,
];

/**
 * Cleans Spotify track names by stripping remaster/edition/version info.
 * Conservative: only strips patterns at END of string.
 * Multiple passes handle nested suffixes like "Song (Remastered) - Deluxe".
 */
export function cleanSongTitle(name: string): string {
  let cleaned = name.trim();
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of PATTERNS) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, "").trim();
      if (cleaned !== before) changed = true;
    }
  }

  return cleaned || name; // Never return empty
}
