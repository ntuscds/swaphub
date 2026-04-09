import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuth } from "@/lib/microsoft-auth";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { SignInButton } from "@/components/sign-in-button";
import { cn } from "@/lib/utils";
import {
  OnboardingForm,
  SetProfileForm,
  VerifyTelegramForm,
} from "@/components/onboard-form";
import { redirect } from "next/navigation";
import { getDefaultUsername } from "@/lib/user";

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

function SetProfile({ defaultUsername }: { defaultUsername?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-12 max-w-2xl w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Lastly, tell us about yourself.
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <SetProfileForm defaultUsername={defaultUsername} />
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

  const auth = await getAuth();
  if (auth) {
    const isAllowedDomain = ALLOWED_DOMAINS.some((domain) =>
      auth.email.endsWith(domain)
    );
    if (!isAllowedDomain) {
      errorMessages.push(
        "Oh no! Please sign in with your @e.ntu.edu.sg account."
      );
    }
  }

  if (!auth) {
    return (
      <main>
        <ScrollArea className="bg-background text-foreground h-screen p-4">
          <SignInToMicrosoft errorMessages={errorMessages} />
        </ScrollArea>
      </main>
    );
  }

  let accountSetup = auth.accountSetup.type;
  if (accountSetup === "complete") {
    redirect("/swap");
  }

  if (accountSetup === "not_setup") {
    accountSetup = "telegram_not_setup";
  }

  return (
    <main>
      <ScrollArea className="bg-background text-foreground h-screen p-4">
        <OnboardingForm
          verifyTelegramNode={<VerifyTelegram />}
          selectSchoolNode={
            <SetProfile
              defaultUsername={
                auth.accountSetup.type === "not_setup"
                  ? getDefaultUsername(auth.microsoftUsername ?? "")
                  : auth.accountSetup.username
              }
            />
          }
          defaultAccountSetup={accountSetup}
        />
      </ScrollArea>
    </main>
  );
}
