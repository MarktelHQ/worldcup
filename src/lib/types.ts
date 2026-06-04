export type Sticker = {
  id: string;
  section_code: string;
  section_name: string;
  section_order: number;
  num_in_section: number;
  label: string;
  type: string; // crest | photo | player | opening | history | special | coke
};

export type Section = {
  code: string;
  name: string;
  order: number;
  isSpecial: boolean;
  stickers: Sticker[];
};

// holdings as a map: stickerId -> count (1 = got, 2+ = got + (count-1) spares)
export type Holdings = Record<string, number>;

export function groupBySection(stickers: Sticker[]): Section[] {
  const map = new Map<string, Section>();
  for (const s of stickers) {
    if (!map.has(s.section_code)) {
      map.set(s.section_code, {
        code: s.section_code,
        name: s.section_name,
        order: s.section_order,
        isSpecial: ["00", "FWC", "CC"].includes(s.section_code),
        stickers: [],
      });
    }
    map.get(s.section_code)!.stickers.push(s);
  }
  const out = [...map.values()];
  out.forEach((sec) => sec.stickers.sort((a, b) => a.num_in_section - b.num_in_section));
  return out.sort((a, b) => a.order - b.order);
}
