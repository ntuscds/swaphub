"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AboutPage() {
  return (
    <ScrollArea className="h-screen-safe">
      <div className="flex flex-col items-center pb-20">
        <div className="flex flex-col gap-6 sm:gap-8 py-4 lg:py-6 xl:py-8 max-w-6xl w-full px-4 sm:px-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary-700 dark:text-primary-400">
              About SwapHub
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Swap indexes without the chaos.
            </p>
          </div>

          {/* Our Story */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-primary-700 dark:text-primary-400">
                Our Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
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
                SwapHub automatically identifies compatible swaps, and handles
                the matching process for you.
              </p>
              <p>
                Simply sign in with your NTU account, indicate the index you
                have and the index you want, and let the platform handle the
                matching process.
              </p>
              <div className="border-l-2 border-primary-500 pl-4 italic text-sm sm:text-base text-muted-foreground">
                "Index swapping should take minutes, not weeks."
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-primary-700 dark:text-primary-400">
              Meet the Team
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground">
              A team of NTU Computer Science students building tools that make
              student life easier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TEAM.map((member) => (
              <Button
                variant="outline"
                className="h-fit"
                key={member.name}
                nativeButton={false}
                render={
                  <a
                    key={member.name}
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 sm:p-5 lg:p-6 flex flex-row lg:flex-col items-center lg:text-center gap-4 transition-colors"
                  >
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full object-cover border-2"
                    />

                    <div className="flex flex-col w-full">
                      <p className="font-medium text-sm sm:text-base">
                        {member.name}
                      </p>

                      <p className="text-xs sm:text-sm">LinkedIn ↗</p>
                    </div>
                  </a>
                }
              ></Button>
            ))}
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-primary-700 dark:text-primary-400">
                What Makes SwapHub Different
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                <li>• Automatic direct swap matching</li>
                <li>• Support for 3-way swap chains</li>
                <li>• Telegram notifications and updates</li>
              </ul>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-primary-700 dark:text-primary-400">
                Built for NTU Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                SwapHub was created to make the index swapping process easier,
                faster, and less stressful during course registration periods.
                Our goal is simple: help students find swaps efficiently without
                relying on spreadsheets, group chats, or manual coordination.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
