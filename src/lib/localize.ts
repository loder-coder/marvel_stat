import ko from "@/locales/ko.json";

const warnedKeys = new Set<string>();

function warnMissing(section: string, key: string): void {
  if (process.env.NODE_ENV === "production") return;
  const warningKey = `${section}:${key}`;
  if (warnedKeys.has(warningKey)) return;
  warnedKeys.add(warningKey);
  console.warn(`[i18n] Missing ${section} translation:`, key);
}

function fromMap(map: Record<string, string>, section: string, key: string): string {
  const translated = map[key];
  if (!translated) warnMissing(section, key);
  return translated ?? key;
}

export function localizeHeroName(name: string): string {
  const rivalsHeroes = ko.rivalsMeta.heroes as Record<string, string>;
  const legacyHeroes = ko.heroes as Record<string, string>;
  const translated = rivalsHeroes[name] ?? legacyHeroes[name];
  if (!translated) warnMissing("hero", name);
  return translated ?? name;
}

export function localizeRankFilter(rank: string): string {
  return fromMap(ko.rivalsMeta.rankFilters as Record<string, string>, "rank filter", rank);
}

export function localizeTier(tier: string): string {
  return fromMap(ko.rivalsMeta.tiers as Record<string, string>, "tier", tier);
}

export function localizeRole(role: string): string {
  if (!role) return role;
  const rivalsRoles = ko.rivalsMeta.roles as Record<string, string>;
  const legacyRoles = ko.roles as Record<string, string>;
  const translated = rivalsRoles[role] ?? legacyRoles[role];
  if (!translated) warnMissing("role", role);
  return translated ?? role;
}

export function localizeRefreshPolicy(policy: string): string {
  return fromMap(ko.rivalsMeta.refreshPolicy as Record<string, string>, "refresh policy", policy);
}

export function localizeField(field: string): string {
  return fromMap(ko.rivalsMeta.fields as Record<string, string>, "field", field);
}

export function localizeSort(sort: string): string {
  return fromMap(ko.rivalsMeta.sorts as Record<string, string>, "sort", sort);
}

export function localizeSource(source: string): string {
  if (source.toLowerCase() === "rivalsmeta") return ko.rivalsMeta.source;
  return source;
}

export function localizeOriginalLink(): string {
  return ko.rivalsMeta.originalLink;
}
