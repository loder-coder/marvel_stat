"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { clearAdminSession, setAdminSession, verifyAdminPassword } from "@/app/admin/auth";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1" as Route);
  }

  await setAdminSession();
  redirect("/admin/heroes" as Route);
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login" as Route);
}
