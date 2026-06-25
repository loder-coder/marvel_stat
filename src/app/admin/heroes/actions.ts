"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/admin/auth";
import { ROLE_KO_OPTIONS, upsertHeroTranslation } from "@/app/heroes/heroMeta";

export async function saveHeroTranslation(formData: FormData) {
  await requireAdminSession();

  const heroId = String(formData.get("heroId") ?? "").trim();
  const nameKo = String(formData.get("nameKo") ?? "").trim();
  const roleKo = String(formData.get("roleKo") ?? "").trim();

  if (!heroId || !nameKo || !roleKo) {
    throw new Error("heroId, nameKo, roleKo are required.");
  }

  if (!ROLE_KO_OPTIONS.includes(roleKo as (typeof ROLE_KO_OPTIONS)[number])) {
    throw new Error("Invalid roleKo.");
  }

  await upsertHeroTranslation({ heroId, nameKo, roleKo });
  revalidatePath("/heroes");
  revalidatePath("/admin/heroes");
}
