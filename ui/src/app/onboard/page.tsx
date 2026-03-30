import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AUTH_ENCRYPTED_REFRESH_COOKIE as AUTH_ENCRYPTED_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
  decryptValue,
  getAuth,
  refreshMicrosoftAccessToken,
  verifySession,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { SignInButton } from "@/components/sign-in-button";
import { cn } from "@/lib/utils";
import { OTPInput } from "input-otp";
import { Input } from "@/components/ui/input";
import {
  OnboardingForm,
  SelectSchoolForm,
  VerifyTelegramForm,
} from "@/components/onboard-form";
import { Skeleton } from "@/components/ui/skeleton";

const ALLOWED_DOMAINS = ["@ntu.edu.sg", "@e.ntu.edu.sg"];

export function PaginationSteps({
  selectedIndex,
  steps,
}: {
  selectedIndex: number;
  steps: number;
}) {
  return (
    <div className="flex flex-row gap-4 items-center w-1/3">
      {Array.from({ length: steps })
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-1 bg-background-200 dark:bg-background-800 rounded-full",
              {
                "bg-primary-500 dark:bg-primary-800": selectedIndex === index,
              }
            )}
          />
        ))}
    </div>
  );
}

function SignInToMicrosoft({ errorMessages }: { errorMessages: string[] }) {
  const callbackUrl = "/onboard";
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-12 max-w-2xl w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Hey! 👋
          </h1>
          <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
            Let's get you onboarded!
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h2 className="text-base lg:text-lg font-semibold max-w-md">
              Firstly, sign in with your @e.ntu.edu.sg account.
            </h2>
          </div>

          {errorMessages.length > 0 && (
            <div className="flex flex-col gap-2">
              {errorMessages.map((error, index) => (
                <Alert variant="destructive" key={index}>
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              ))}
            </div>
          )}

          <SignInButton callbackUrl={callbackUrl} />
        </div>

        <div className="flex flex-row items-center justify-center pt-10">
          <PaginationSteps selectedIndex={0} steps={3} />
        </div>

        {/* <OnboardForm /> */}
      </div>
    </div>
  );
}

function VerifyTelegram() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-12 max-w-2xl w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Next, let's link your Telegram account.
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <VerifyTelegramForm />
          </div>
        </div>

        <div className="flex flex-row items-center justify-center pt-10">
          <PaginationSteps selectedIndex={1} steps={3} />
        </div>

        {/* <OnboardForm /> */}
      </div>
    </div>
  );
}

function SelectSchool() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-12 max-w-2xl w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Lastly, select your school.
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <SelectSchoolForm />
          </div>
        </div>

        <div className="flex flex-row items-center justify-center pt-10">
          <PaginationSteps selectedIndex={2} steps={3} />
        </div>

        {/* <OnboardForm /> */}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="flex flex-col gap-12 py-12 max-w-2xl w-full">
        {/* <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Please wait...
          </h1>
        </div> */}
        {/* <div className="absolute inset-0 bg-background/50 backdrop-blur-xs" /> */}
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  let errorMessages = [];
  const { error } = await searchParams;
  if (error) {
    errorMessages.push(error);
  }

  const sessionEmail = await getAuth();
  if (sessionEmail?.email) {
    const isAllowedDomain = ALLOWED_DOMAINS.some((domain) =>
      sessionEmail.email.endsWith(domain)
    );
    if (!isAllowedDomain) {
      errorMessages.push(
        "Oh no! Please sign in with your @e.ntu.edu.sg account."
      );
    }
  }

  return (
    <main>
      <ScrollArea className="bg-background text-foreground h-screen p-4">
        {sessionEmail ? (
          <OnboardingForm
            loadingNode={<Loading />}
            verifyTelegramNode={<VerifyTelegram />}
            selectSchoolNode={<SelectSchool />}
          />
        ) : (
          <SignInToMicrosoft errorMessages={errorMessages} />
        )}
      </ScrollArea>
    </main>
  );
}
