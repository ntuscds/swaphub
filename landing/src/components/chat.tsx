import * as React from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "./ui/input";

type ChatProps = {
  names: string[];
  courses: string[];
  days: string[];
};

type ChatMessage = {
  id: number;
  author: string;
  body: string;
  isSelf: boolean;
};

const MAX_MESSAGES = 10;
const MESSAGE_INTERVAL_MS = 700;
const TIME_INCREMENTS = [0, 20, 30, 50];
const DURATIONS_IN_MINUTES = [50, 80, 110, 120];

let nextMessageId = 1;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function formatIndex(value: number) {
  return String(value).padStart(5, "0");
}

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function randomTimeRange() {
  const startHour = randomInt(8, 18);
  const startMinute = randomChoice(TIME_INCREMENTS);
  const duration = randomChoice(DURATIONS_IN_MINUTES);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = Math.min(21 * 60 + 50, startTotal + duration);

  return `${formatTime(startTotal)}-${formatTime(endTotal)}`;
}

function createAutomatedMessage({
  names,
  courses,
  days,
}: ChatProps): ChatMessage {
  // Other messages
  if (Math.random() < 0.1) {
    const messages = [
      "btw willing to pay $25 for this",
      "plssssss",
      "hi",
      "Want to earn some part time money?\n$20 per hour",
    ];
    return {
      id: nextMessageId++,
      author: "Other",
      body: randomChoice(messages),
      isSelf: false,
    };
  }
  let wantIndex = randomInt(0, 99999);
  const haveIndex = randomInt(0, 99999);

  while (wantIndex === haveIndex) {
    wantIndex = randomInt(0, 99999);
  }

  const haveDay = randomChoice(days).toUpperCase();
  const wantDay = randomChoice(days).toUpperCase();
  const haveTimeRange = randomTimeRange();
  const wantTimeRange = randomTimeRange();

  let extras = "";
  if (Math.random() < 0.5) {
    const random = [
      "Pleaseeeeeee ☹️☹️",
      "Willing to pay 🙏",
      "Willing to pay",
      "Willing to pay $50",
    ];
    extras = `\n\n${random[Math.floor(Math.random() * random.length)]}`;
  }

  const isSelf = Math.random() < 0.05;
  return {
    id: nextMessageId++,
    author: isSelf ? "ME" : randomChoice(names),
    isSelf: isSelf,
    body: `Looking to swap\n${randomChoice(courses)}\n\nHave: ${formatIndex(haveIndex)} (${haveDay}) ${haveTimeRange}\nWant: ${formatIndex(wantIndex)} (${wantDay}) ${wantTimeRange}${extras}`,
  };
}

function appendMessage(messages: ChatMessage[], message: ChatMessage) {
  return [...messages, message].slice(-MAX_MESSAGES);
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_BACKGROUND_COLORS = {
  primary: "4f46e5,7c3aed,2563eb,0891b2,0d9488",
  muted: "334155,475569,64748b,0f766e,1d4ed8",
} as const;

function getInitialsAvatarUrl(label: string, accent: "primary" | "muted") {
  const params = new URLSearchParams({
    seed: getInitials(label),
    size: "128",
    backgroundColor: AVATAR_BACKGROUND_COLORS[accent],
    backgroundType: "gradientLinear",
    backgroundRotation: "45",
    textColor: "ffffff",
    fontSize: "45",
  });

  return `https://api.dicebear.com/7.x/initials/svg?${params.toString()}`;
}

function Avatar({
  label,
  accent,
}: {
  label: string;
  accent: "primary" | "muted";
}) {
  const accentClass =
    accent === "primary"
      ? "ring-2 ring-primary-300/40"
      : "border border-border/80";

  return (
    <img
      src={getInitialsAvatarUrl(label, accent)}
      alt={`${label} avatar`}
      className={`size-12 shrink-0 rounded-full object-cover ${accentClass}`}
      width={48}
      height={48}
    />
  );
}

export function Chat(props: ChatProps) {
  const { courses, days, names } = props;
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    Array.from({ length: MAX_MESSAGES }, () =>
      createAutomatedMessage({ names, courses, days })
    )
  );

  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessages((currentMessages) =>
        appendMessage(
          currentMessages,
          createAutomatedMessage({ names, courses, days })
        )
      );
      scrollToBottom();
    }, MESSAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [courses, days, names, scrollToBottom]);

  return (
    <div className="w-full max-w-[1440px] gap-0 rounded-lg border border-border bg-transparent lg:border-2">
      <div className="flex flex-row px-4 items-center gap-4 rounded-t-lg border-b bg-card py-4 lg:border-b-2">
        <img src="/monkey.png" alt="SwapHub" className="size-12 rounded-md" />
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">Spam AF</h2>
          <p className="text-sm text-muted-foreground">676767 Messages</p>
        </div>
      </div>

      <div className="p-0">
        <div
          className="h-[560px] md:h-[720px] lg:h-[880px] overflow-hidden"
          ref={viewportRef}
        >
          <div className="flex flex-col gap-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-4 ${
                  message.isSelf ? "justify-end" : ""
                }`}
              >
                {!message.isSelf && (
                  <Avatar label={message.author} accent="muted" />
                )}

                <div
                  className={`w-full max-w-4xl rounded-4xl border p-4 text-base md:text-lg ${
                    message.isSelf
                      ? "ml-auto rounded-br-none border-primary bg-primary-700 text-primary-foreground"
                      : "rounded-bl-none border-border bg-primary-950 text-white"
                  }`}
                >
                  <p
                    className={`mb-2 text-sm font-semibold ${
                      message.isSelf
                        ? "text-primary-foreground/80"
                        : "text-primary-200"
                    }`}
                  >
                    {message.author}
                  </p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {message.body}
                  </p>
                </div>

                {message.isSelf && <Avatar label="You" accent="primary" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-b-lg border-t bg-card p-4 lg:border-t-2">
        <form
          className="flex w-full items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMessages((currentMessages) =>
              appendMessage(currentMessages, {
                id: nextMessageId++,
                author: "You",
                body: draft,
                isSelf: true,
              })
            );
            setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message..."
          />
          <Button type="submit" size="lg" className="shrink-0">
            <SendHorizontal className="size-4" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
