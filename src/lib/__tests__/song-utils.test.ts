import { describe, expect, it } from "vitest";
import { cleanSongTitle } from "../song-utils";

describe("cleanSongTitle", () => {
  describe("remaster patterns", () => {
    it("removes dash remaster with year", () => {
      expect(cleanSongTitle("Hotel California - 2013 Remaster")).toBe(
        "Hotel California"
      );
    });

    it("removes parenthetical remaster with year", () => {
      expect(cleanSongTitle("Bohemian Rhapsody (Remastered 2011)")).toBe(
        "Bohemian Rhapsody"
      );
    });

    it("removes remastered without year", () => {
      expect(cleanSongTitle("Hey Jude - Remastered")).toBe("Hey Jude");
    });

    it("removes bracketed remaster", () => {
      expect(cleanSongTitle("Stairway to Heaven [Remaster]")).toBe(
        "Stairway to Heaven"
      );
    });

    it("removes year before remaster", () => {
      expect(cleanSongTitle("Yesterday (2009 Remaster)")).toBe("Yesterday");
    });
  });

  describe("edition patterns", () => {
    it("removes deluxe edition", () => {
      expect(cleanSongTitle("Thriller (Deluxe Edition)")).toBe("Thriller");
    });

    it("removes anniversary edition", () => {
      expect(cleanSongTitle("The Wall (Anniversary Edition)")).toBe("The Wall");
    });

    it("removes expanded edition", () => {
      expect(cleanSongTitle("Abbey Road [Expanded Edition]")).toBe(
        "Abbey Road"
      );
    });

    it("removes dash deluxe", () => {
      expect(cleanSongTitle("1989 - Deluxe")).toBe("1989");
    });

    it("removes bonus track", () => {
      expect(cleanSongTitle("Some Song - Bonus Track")).toBe("Some Song");
    });
  });

  describe("live/acoustic patterns", () => {
    it("removes parenthetical live", () => {
      expect(cleanSongTitle("Sultans of Swing (Live)")).toBe(
        "Sultans of Swing"
      );
    });

    it("removes live version", () => {
      expect(cleanSongTitle("Comfortably Numb - Live Version")).toBe(
        "Comfortably Numb"
      );
    });

    it("removes acoustic version", () => {
      expect(cleanSongTitle("Layla (Acoustic Version)")).toBe("Layla");
    });

    it("removes unplugged", () => {
      expect(cleanSongTitle("Tears in Heaven (Unplugged)")).toBe(
        "Tears in Heaven"
      );
    });

    it("does NOT remove Live and Let Die (natural title)", () => {
      expect(cleanSongTitle("Live and Let Die")).toBe("Live and Let Die");
    });

    it("does NOT remove Livin' on a Prayer", () => {
      expect(cleanSongTitle("Livin' on a Prayer")).toBe("Livin' on a Prayer");
    });
  });

  describe("remix/edit patterns", () => {
    it("removes radio edit", () => {
      expect(cleanSongTitle("Blinding Lights (Radio Edit)")).toBe(
        "Blinding Lights"
      );
    });

    it("removes single version", () => {
      expect(cleanSongTitle("Freebird [Single Version]")).toBe("Freebird");
    });

    it("removes extended mix", () => {
      expect(cleanSongTitle("Blue Monday (Extended Mix)")).toBe("Blue Monday");
    });

    it("does NOT remove song titled Remix", () => {
      expect(cleanSongTitle("Remix")).toBe("Remix");
    });
  });

  describe("featured artist patterns", () => {
    it("removes feat. in parentheses", () => {
      expect(cleanSongTitle("Empire State of Mind (feat. Alicia Keys)")).toBe(
        "Empire State of Mind"
      );
    });

    it("removes ft. in parentheses", () => {
      expect(cleanSongTitle("Crazy in Love (ft. Jay-Z)")).toBe("Crazy in Love");
    });

    it("removes featuring after dash", () => {
      expect(cleanSongTitle("No One - featuring Mary J. Blige")).toBe("No One");
    });

    it("removes with in brackets", () => {
      expect(cleanSongTitle("Under Pressure [with David Bowie]")).toBe(
        "Under Pressure"
      );
    });
  });

  describe("mono/stereo patterns", () => {
    it("removes mono in parentheses", () => {
      expect(cleanSongTitle("Yesterday (Mono)")).toBe("Yesterday");
    });

    it("removes stereo mix", () => {
      expect(cleanSongTitle("Here Comes the Sun [Stereo Mix]")).toBe(
        "Here Comes the Sun"
      );
    });
  });

  describe("multiple suffixes", () => {
    it("removes chained end suffixes", () => {
      // Pattern: suffix at end gets stripped, exposing another suffix which also gets stripped
      expect(cleanSongTitle("Song Title (Deluxe Edition)")).toBe("Song Title");
    });

    it("removes multiple parenthetical suffixes at end", () => {
      expect(cleanSongTitle("Track (feat. Artist) (2020 Remaster)")).toBe(
        "Track"
      );
    });

    it("strips chained suffixes via multiple passes", () => {
      // First pass strips "- Deluxe Edition", second pass strips "(Remastered)"
      expect(
        cleanSongTitle("Song Title (Remastered) - Deluxe Edition")
      ).toBe("Song Title");
    });
  });

  describe("edge cases", () => {
    it("preserves clean titles", () => {
      expect(cleanSongTitle("Hotel California")).toBe("Hotel California");
    });

    it("handles already clean title", () => {
      expect(cleanSongTitle("Bohemian Rhapsody")).toBe("Bohemian Rhapsody");
    });

    it("trims whitespace", () => {
      expect(cleanSongTitle("  Song Title  ")).toBe("Song Title");
    });

    it("never returns empty string", () => {
      expect(cleanSongTitle("")).toBe("");
    });
  });
});
