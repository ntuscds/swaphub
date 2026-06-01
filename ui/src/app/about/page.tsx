"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

const TEAM = [
  {
    name: "Benedict Tan",
    photo: "/benedict.jpg",
    linkedin: "https://www.linkedin.com/in/benedict-tan-265403215/",
  },
  {
    name: "Vidisha Bajoria",
    photo: "/vidisha.jpg",
    linkedin: "https://www.linkedin.com/in/vidishabajoria/",
  },
  {
    name: "Suhani Mishra",
    photo: "/suhani.jpg",
    linkedin: "https://www.linkedin.com/in/suhanimishra07/",
  },
  {
    name: "Rushika Gupta",
    photo: "/rushika.jpg",
    linkedin: "https://www.linkedin.com/in/rushikagupta/",
  },
  {
    name: "Shrujan Beesetty",
    photo: "/shrujan.jpg",
    linkedin: "https://www.linkedin.com/in/shrujan-beesetty/",
  },
];

const SWAPHUB_BLUE = "#2342A8";

export default function AboutPage() {
  return (
    <ScrollArea className="h-screen-safe">
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-6 sm:gap-8 py-4 lg:py-6 xl:py-8 max-w-6xl w-full px-4 sm:px-6">

          {/* Header */}
          <div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight"
              style={{ color: SWAPHUB_BLUE }}
            >
              About SwapHub
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Swap indexes without the chaos.
            </p>
          </div>

          {/* Our Story */}
          <div
            className="rounded-lg border p-5 sm:p-6"
            style={{
              borderColor: "rgba(35,66,168,0.3)",
              backgroundColor: "rgba(35,66,168,0.08)",
            }}
          >
            <h2
              className="text-xl sm:text-2xl font-semibold mb-4"
              style={{ color: SWAPHUB_BLUE }}
            >
              Our Story
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                Index swapping at NTU has always been a mess. Students rely on
                scattered Telegram messages, spreadsheets, and manual
                coordination to find someone willing to exchange indexes.
              </p>

              <p>
                We experienced the same frustrations ourselves and decided to
                build a better solution.
              </p>

              <p>
                SwapHub automatically identifies compatible swaps, including
                complex 3-way chains that are extremely difficult to coordinate
                manually. If Student A wants B&apos;s index, B wants C&apos;s
                index, and C wants A&apos;s index, SwapHub can connect all three
                parties instantly.
              </p>

              <p>
                Simply sign in with your NTU account, indicate the index you
                have and the index you want, and let the platform handle the
                matching process.
              </p>
            </div>

            <div
              className="mt-6 border-l-2 pl-4 italic text-sm sm:text-base text-muted-foreground"
              style={{ borderColor: SWAPHUB_BLUE }}
            >
              "Index swapping should take minutes, not weeks."
            </div>
          </div>

          {/* Team */}
          <div>
            <h2
              className="text-xl sm:text-2xl font-semibold mb-2"
              style={{ color: SWAPHUB_BLUE }}
            >
              Meet the Team
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground">
              A team of NTU Computer Science students building tools that make
              student life easier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TEAM.map((member) => (
              <a
                key={member.name}
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border p-4 sm:p-5 lg:p-6 flex flex-col items-center text-center gap-4 transition-colors"
                style={{
                  borderColor: "rgba(35,66,168,0.3)",
                  backgroundColor: "rgba(35,66,168,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(35,66,168,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(35,66,168,0.08)";
                }}
              >
                <img
                  src={member.photo}
                  alt={member.name}
                  className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full object-cover border-2"
                  style={{
                    borderColor: "rgba(35,66,168,0.5)",
                  }}
                />

                <div>
                  <p className="font-medium text-sm sm:text-base">
                    {member.name}
                  </p>

                  <p
                    className="text-xs sm:text-sm mt-2"
                    style={{ color: SWAPHUB_BLUE }}
                  >
                    LinkedIn ↗
                  </p>
                </div>
              </a>
            ))}
          </div>

          {/* Features */}
          <div
            className="rounded-lg border p-5 sm:p-6"
            style={{
              borderColor: "rgba(35,66,168,0.3)",
              backgroundColor: "rgba(35,66,168,0.08)",
            }}
          >
            <h2
              className="text-xl sm:text-2xl font-semibold mb-4"
              style={{ color: SWAPHUB_BLUE }}
            >
              What Makes SwapHub Different
            </h2>

            <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
              <li>• Automatic direct swap matching</li>
              <li>• Support for 3-way swap chains</li>
              <li>• Telegram notifications and updates</li>
              <li>• Secure NTU Microsoft authentication</li>
              <li>• Built specifically for NTU students</li>
            </ul>
          </div>

          {/* Footer */}
          <div
            className="rounded-lg border p-5 sm:p-6"
            style={{
              borderColor: "rgba(35,66,168,0.3)",
              backgroundColor: "rgba(35,66,168,0.08)",
            }}
          >
            <h2
              className="text-xl sm:text-2xl font-semibold mb-4"
              style={{ color: SWAPHUB_BLUE }}
            >
              Built for NTU Students
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              SwapHub was created to make the index swapping process easier,
              faster, and less stressful during course registration periods.
              Our goal is simple: help students find swaps efficiently without
              relying on spreadsheets, group chats, or manual coordination.
            </p>
          </div>

        </div>
      </div>
    </ScrollArea>
  );
}