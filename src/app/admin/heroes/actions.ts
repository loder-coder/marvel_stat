"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/admin/auth";
import { ROLE_KO_OPTIONS, upsertHeroTranslation } from "@/app/heroes/heroMeta";

export async function saveHeroTranslation(formData: FormData) {
  await requireAdminSession();

  const heroId = String(formData.get("heroId") ?? "").trim();
  const nameKo = String(formData.get("nameKo") ?? "").trim();
  const roleKo = String(formData.get("roleKo") ?? "").trim();

  if (!heroId || !nameKo || !roleKo) {
    redirect("/admin/heroes?error=invalid" as Route);
  }

  if (!ROLE_KO_OPTIONS.includes(roleKo as (typeof ROLE_KO_OPTIONS)[number])) {
    redirect("/admin/heroes?error=invalid-role" as Route);
  }

  try {
    await upsertHeroTranslation({ heroId, nameKo, roleKo });
    revalidatePath("/heroes");
    revalidatePath("/admin/heroes");
  } catch (error) {
    console.error("Failed to save hero translation", error);
    redirect("/admin/heroes?error=save-failed" as Route);
  }

  redirect("/admin/heroes?saved=1" as Route);
}
