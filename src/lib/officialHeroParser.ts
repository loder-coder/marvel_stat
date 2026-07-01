export const HERO_TIERS = [
  "Quick",
  "Overall",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Celestial"
] as const;

export type HeroTier = (typeof HERO_TIERS)[number];
export type HeroMode = "Quick" | "Competitive";

export interface HeroMeta {
  platform: "PC";
  mode: HeroMode;
  tier: HeroTier;
  role: string;
  hero: string;
  pickRate: number;
  winRate: number;
  updatedAt: Date;
  source?: "official" | "rivalsmeta";
  sourceUrl?: string;
  season?: string;
  rankFilter?: string;
  metaTier?: "S" | "A" | "B" | "C" | "D";
  metaScore?: number;
  banRate?: number;
  matches?: number;
  charactersSourceUrl?: string;
  charactersScope?: string;
}

type Section = { mode: HeroMode; tier: HeroTier };

const SECTIONS: Record<string, Section> = {
  "PC-快速": { mode: "Quick", tier: "Quick" },
  "PC-竞技汇总": { mode: "Competitive", tier: "Overall" },
  "PC-竞技青铜": { mode: "Competitive", tier: "Bronze" },
  "PC-竞技白银": { mode: "Competitive", tier: "Silver" },
  "PC-竞技黄金": { mode: "Competitive", tier: "Gold" },
  "PC-竞技铂金": { mode: "Competitive", tier: "Platinum" },
  "PC-竞技钻石": { mode: "Competitive", tier: "Diamond" },
  "PC-竞技大师": { mode: "Competitive", tier: "Master" },
  "PC-竞技天神及以上": { mode: "Competitive", tier: "Celestial" }
};

const ROLES: Record<string, string> = {
  "捍卫者": "Vanguard",
  "决斗家": "Duelist",
  "策略家": "Strategist"
};

const HEROES: Record<string, string> = {
  "班纳": "Hulk", "奇异博士": "Doctor Strange", "美国队长": "Captain America", "格鲁特": "Groot",
  "毒液": "Venom", "万磁王": "Magneto", "索尔": "Thor", "潘妮·帕克": "Peni Parker",
  "石头人": "The Thing", "艾玛·弗斯特": "Emma Frost", "安吉拉": "Angela", "恶魔恐龙": "Devil Dinosaur",
  "小淘气": "Rogue", "惩罚者": "The Punisher", "暴风女": "Storm", "霹雳火": "Human Torch",
  "鹰眼": "Hawkeye", "海拉": "Hela", "黑豹": "Black Panther", "魔剑客": "Magik",
  "月光骑士": "Moon Knight", "松鼠女": "Squirrel Girl", "黑寡妇": "Black Widow", "钢铁侠": "Iron Man",
  "蜘蛛侠": "Spider-Man", "猩红女巫": "Scarlet Witch", "神奇先生": "Mister Fantastic", "冬兵": "Winter Soldier",
  "星爵": "Star-Lord", "刀锋战士": "Blade", "纳摩": "Namor", "灵蝶": "Psylocke", "金刚狼": "Wolverine",
  "林烈": "Iron Fist", "凤凰女": "Phoenix", "夜魔侠": "Daredevil", "艾尔莎·血石": "Elsa Bloodstone",
  "黑猫": "Black Cat", "洛基": "Loki", "曼蒂斯": "Mantis", "火箭浣熊": "Rocket Raccoon",
  "斗篷与匕首": "Cloak & Dagger", "奥创": "Ultron", "冰月花雪": "Luna Snow", "亚当术士": "Adam Warlock",
  "杰夫": "Jeff the Land Shark", "隐形女": "Invisible Woman", "牌皇": "Gambit", "白狐": "White Fox",
  "死侍": "Deadpool"
};

/** Safely unwraps JSON or a conventional JSONP callback without executing code. */
export function parseOfficialPayload(input: string): { data: string } {
  const text = input.trim();
  let json = text;

  if (!text.startsWith("{")) {
    const match = text.match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(\s*([\s\S]*?)\s*\)\s*;?$/);
    if (!match) throw new Error("Invalid Hero Hot List JSONP response");
    json = match[1];
  }

  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || typeof (parsed as { data?: unknown }).data !== "string") {
    throw new Error("Hero Hot List response does not contain TSV data");
  }
  return parsed as { data: string };
}

function parseUpdatedAt(value: string): Date {
  const match = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error("Invalid Hero Hot List update time");
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
}

function parsePercent(value: string): number {
  const number = Number(value.trim().replace(/%$/, ""));
  if (!Number.isFinite(number)) throw new Error(`Invalid percentage: ${value}`);
  return number;
}

/** Converts the official multi-section TSV document into normalized hero records. */
export function parseHeroTsv(tsv: string): HeroMeta[] {
  const lines = tsv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trimEnd());
  const updatedAt = parseUpdatedAt(lines[0]?.trim() ?? "");
  const heroes: HeroMeta[] = [];
  let section: Section | undefined;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split("\t").map((cell) => cell.trim());
    const nextSection = SECTIONS[cells[0]];
    if (nextSection) {
      section = nextSection;
      continue;
    }
    if (cells[0] === "职责" || !section || cells.length < 4) continue;

    heroes.push({
      platform: "PC",
      mode: section.mode,
      tier: section.tier,
      role: ROLES[cells[0]] ?? cells[0],
      hero: HEROES[cells[1]] ?? cells[1],
      pickRate: parsePercent(cells[2]),
      winRate: parsePercent(cells[3]),
      updatedAt,
      source: "official"
    });
  }

  if (heroes.length === 0) throw new Error("Hero Hot List TSV contained no hero rows");
  return heroes;
}
