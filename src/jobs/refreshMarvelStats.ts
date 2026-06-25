/**
 * Scheduled job entry point: run daily at 06:00 Asia/Seoul via cron/platform scheduler.
 * Player records are deliberately excluded: they refresh only on demand.
 */
export async function refreshMarvelStats() {
  // TODO: fetch heroes and tier data through marvelRivalsClient, calculate tiers, persist snapshots.
  // Use marvel:refresh:lock to prevent overlapping executions and log partial failures.
  return { scope: "heroes-and-tiers-only", scheduledFor: "06:00 Asia/Seoul" };
}
