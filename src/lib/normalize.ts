export function normalizeNickname(value: string) {
  return value.trim().toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}_-]/gu, "");
}
