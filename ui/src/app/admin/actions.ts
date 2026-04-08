"use server";

import { cookies } from "next/headers";
import {
  MOCK_USER_EMAIL_COOKIE,
  setMockUserEmailCookie,
} from "@/lib/mock-user";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";

export async function setMockUserEmail(formData: FormData) {
  const selectedEmail = String(formData.get("mockUserEmail") ?? "").trim();
  const cookieStore = await cookies();

  if (!selectedEmail) {
    cookieStore.delete(MOCK_USER_EMAIL_COOKIE);
    return;
  }

  await setMockUserEmailCookie(cookieStore, selectedEmail, env.ENCRYPTION_KEY);
}
