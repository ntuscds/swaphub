"use server";

import { cookies } from "next/headers";

const MOCK_USER_EMAIL_COOKIE = "_MOCK_USER_EMAIL";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export async function setMockUserEmail(formData: FormData) {
  const selectedEmail = String(formData.get("mockUserEmail") ?? "").trim();
  const cookieStore = await cookies();

  if (!selectedEmail) {
    cookieStore.delete(MOCK_USER_EMAIL_COOKIE);
    return;
  }

  cookieStore.set(MOCK_USER_EMAIL_COOKIE, selectedEmail, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  });
}
