import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/microsoft-auth";
import { cookies } from "next/headers";

// const AssumeStatusSchema = z.object({
//   role: z.enum([
//     "not_setup",
//     "telegram_not_setup",
//     "school_not_setup",
//     "complete",
//   ]),
// });

export async function POST(request: Request) {
  const _cookies = await cookies();
  const session = await refreshSession(_cookies);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // let payload: unknown;
  // try {
  //   payload = await request.json();
  // } catch {
  //   return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  // }

  // // const parsed = AssumeStatusSchema.safeParse(payload);
  // // if (!parsed.success) {
  // //   return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  // // }
  // await setSessionCookie(_cookies, session);

  return NextResponse.json({
    ok: true,
    // accountSetup: updatedSession.accountSetup,
  });
}
