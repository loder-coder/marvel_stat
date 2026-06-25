import { increment } from "@/lib/cache";

/** Small application-level guard; production should additionally enforce this at the edge/gateway. */
export async function allowRequest(subject: string, bucket: string, limit: number, windowSeconds: number) {
  const count = await increment(`marvel:rate-limit:${bucket}:${subject}`, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
