import type { ReactNode } from "react";
import Step1Image from "@/../public/see-1.png";
import Step2Image from "@/../public/see-2.png";
import Step3Image from "@/../public/see-3.png";

type Props = {
  id?: string;
  pages: ReactNode[];
  pageIds?: Array<string | undefined>;
};

// function StoryboardPage({
//   page,
//   pageId,
// }: {
//   page: ReactNode;
//   pageId?: string;
// }) {
//   const ref = useRef<HTMLDivElement>(null);
//   const { scrollYProgress } = useScroll({
//     target: ref,
//     offset: ["start end", "end start"],
//   });
//   const opacity = useTransform(
//     scrollYProgress,
//     [1],
//     [1]
//     // [0, 0.25, 0.5, 0.75, 1],
//     // [0, 0, 1, 1, 0]
//   );

//   return (
//     <div ref={ref} className="relative h-svh w-full">
//       <motion.div style={{ opacity }} className="sticky top-0 h-svh w-full">
//         {pageId ? (
//           <div
//             id={pageId}
//             aria-hidden="true"
//             className="pointer-events-none absolute left-0 top-0 h-px w-px"
//           />
//         ) : null}
//         {page}
//       </motion.div>
//     </div>
//   );
// }

// export function StoryboardScrollSection({ id, pages, pageIds }: Props) {
//   return (
//     <div id={id} className="relative">
//       {pages.map((page, i) => (
//         <StoryboardPage key={i} page={page} pageId={pageIds?.[i]} />
//       ))}
//     </div>
//   );
// }

export function StoryboardScrollSection({
  id,
  pages,
  pageIds,
}: {
  id: string;
  pages: ReactNode[];
  pageIds: string[];
}) {
  return (
    <div id={id} className="relative">
      {pages.map((page, i) => (
        <div key={i} className="sticky top-0 h-svh w-full">
          {pageIds?.[i] ? (
            <div
              id={pageIds[i]}
              aria-hidden="true"
              className="absolute left-0 top-0 h-px w-px pointer-events-none"
            />
          ) : null}
          {page}
        </div>
      ))}
    </div>
  );
}

export function Step1() {
  return (
    <div className="bg-background">
      <div className="w-full max-w-ui h-screen overflow-y-hidden flex not-landscape:flex-col landscape:flex-col lg:landscape:flex-row">
        <div className="h-full flex flex-col gap-8 py-8 md:py-12 lg:py-16 xl:py-20 2xl:py-24 px-8 md:px-12 lg:px-16">
          <div className="flex flex-col gap-2">
            <span className="text-primary-500 font-semibold text-xs md:text-sm uppercase">
              See It In Action
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-14">
              How SwapHub changes
              <br />
              everything!
            </h2>
          </div>
          <div className="flex flex-row gap-4 flex-1 items-center">
            <div className="flex flex-row gap-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 flex flex-col items-center justify-center gap-4 bg-primary-700 text-foreground rounded-lg text-base lg:text-lg">
                1
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-base lg:text-lg xl:text-xl text-primary-500 font-medium">
                  Register your Swap Request
                </h3>
                <span className="text-base lg:text-lg xl:text-xl text-foreground max-w-md">
                  Choose a course, select the index you have and the indexes you
                  want
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 lg:flex-2 flex flex-col items-center justify-center">
          <img
            src={Step1Image.src}
            alt="Step 1"
            width={Step1Image.width}
            height={Step1Image.height}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function Step2() {
  return (
    <div className="bg-background">
      <div className="w-full max-w-ui h-screen overflow-y-hidden flex not-landscape:flex-col landscape:flex-col lg:landscape:flex-row">
        <div className="h-full flex flex-col gap-8 py-8 md:py-12 lg:py-16 xl:py-20 2xl:py-24 px-8 md:px-12 lg:px-16">
          <div className="flex flex-row gap-4 flex-1 items-center">
            <div className="flex flex-row gap-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 flex flex-col items-center justify-center gap-4 bg-primary-700 text-foreground rounded-lg text-base lg:text-lg">
                2
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-base lg:text-lg xl:text-xl text-primary-500 font-medium">
                  We find your Match
                </h3>
                <span className="text-base lg:text-lg xl:text-xl text-foreground max-w-md">
                  See the matches that has the index you want and send a Swap
                  Request to the other party. They will be notified of your Swap
                  Request on Telegram.
                  <br />
                  <br />
                  Likewise, others can be matched to you, and can send you Swap
                  Requests.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 lg:flex-2 flex flex-col items-center justify-center">
          <img
            src={Step2Image.src}
            alt="Step 2"
            width={Step2Image.width}
            height={Step2Image.height}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function Step3() {
  return (
    <div className="bg-background">
      <div className="w-full max-w-ui h-screen overflow-y-hidden flex not-landscape:flex-col landscape:flex-col lg:landscape:flex-row">
        <div className="h-full flex flex-col gap-8 py-8 md:py-12 lg:py-16 xl:py-20 2xl:py-24 px-8 md:px-12 lg:px-16">
          <div className="flex flex-row gap-4 flex-1 items-center">
            <div className="flex flex-row gap-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 flex flex-col items-center justify-center gap-4 bg-primary-700 text-foreground rounded-lg text-base lg:text-lg">
                3
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-base lg:text-lg xl:text-xl text-primary-500 font-medium">
                  Complete your Swap
                </h3>
                <span className="text-base lg:text-lg xl:text-xl text-foreground max-w-md">
                  Once all parties have accepted the Swap Request, you will
                  receive the other party&apos;s Telegram to liase, and complete
                  the Swap on NTU STARS.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 lg:flex-2 flex flex-col items-center justify-center">
          <img
            src={Step3Image.src}
            alt="Step 3"
            width={Step3Image.width}
            height={Step3Image.height}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function StoryboardSection() {
  return (
    <StoryboardScrollSection
      id="storyboard"
      pageIds={["step1", "step2", "step3"]}
      pages={[<Step1 />, <Step2 />, <Step3 />]}
    />
  );
}
