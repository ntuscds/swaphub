import z from "zod";

export const SwapRequestPayloadSchema = z.object({
  requestId: z.string(),
  swapperId: z.string(),
});

export type SwapRequestPayload = z.infer<typeof SwapRequestPayloadSchema>;

// Placeholders for message templates.
const P = {
  courseCode: "{{courseCode}}",
  courseName: "{{courseName}}",

  initiator: {
    username: "{{initiatorUsername}}",
    telegram: "{{initiatorTelegram}}",
    index: "{{initiatorIndex}}",
  },
  target: {
    username: "{{targetUsername}}",
    telegram: "{{targetTelegram}}",
    index: "{{targetIndex}}",
  },
  middleman: {
    username: "{{middlemanUsername}}",
    telegram: "{{middlemanTelegram}}",
    index: "{{middlemanIndex}}",
  },

  decliner: {
    username: "{{declinerUsername}}",
  },
};

export const MESSAGE_TEMPLATES = {
  decline: {
    noLongerSwapping: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
*${P.decliner.username}* is no longer interested to swap for this course.`,
    foundASwap: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
*${P.decliner.username}* has found a swap for this course, they are no longer interested to swap for this course.`,
    notInterested: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
*${P.decliner.username}* is not interested to swap with you.`,
  },
  // Direct swap messages.
  direct: {
    // Who acted on the swap request.
    // Direct swap messages caused by the actions of the initiator.
    initiator: {
      request: {
        target: `⚠️ *${P.courseCode} ${P.courseName} Swap Request* ⚠️
*${P.initiator.username}* wants to swap with you!
They have: ${P.initiator.index}
You have: ${P.target.index}`,
      },
      //       decline: {
      //         target: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // ${P.initiator.username} has withdrawn from the swap request.`,
      //       },
    },
    // Direct swap messages caused by the actions of the target.
    target: {
      accept: {
        initiator: `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*${P.target.username}* has accepted your swap request.
Message @${P.target.telegram} to proceed with the swap!`,
        target: `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
You accepted *${P.initiator.username}*'s swap request.
Message @${P.initiator.telegram} to proceed with the swap!`,
      },
      //       decline: {
      //         initiator: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *${P.target.username}* has declined your swap request.`,
      //         target: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // You declined *${P.initiator.username}*'s swap request.`,
      //       },
    },
  },

  // Three way
  threeWay: {
    initiator: {
      request: {
        target: `⚠️ *${P.courseCode} ${P.courseName} Swap Request* ⚠️
*${P.initiator.username}* wants to do a 3 way swap between *YOU*, *${P.middleman.username}*, and *${P.target.username}*.
They will first swap with *${P.middleman.username}* (${P.middleman.index}),
then swap with *YOU* (${P.target.index}).`,
        middleman: `⚠️ *${P.courseCode} ${P.courseName} Swap Request* ⚠️
*${P.initiator.username}* wants to do a 3 way swap between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.
They will first swap with *YOU* (${P.target.index}),
then swap with *${P.middleman.username}* (${P.middleman.index}).`,
      },
      //       decline: {
      //         targety: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // ${P.initiator.username} has withdrawn from the 3 way between *YOU*, *${P.middleman.username}*, and *${P.target.username}*.`,
      //         middleman: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // ${P.initiator.username} has withdrawn from the 3 way between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.`,
      //       },
    },
    middleman: {
      accept: {
        initiator: (hasTargetAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.middleman.username}*, and *${P.target.username}*`;
          if (hasTargetAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*${P.middleman.username}* has accepted a 3 way swap between ${threeWaySwapName}.
First, *YOU* (${P.initiator.index}) <-> *${P.middleman.username}* (${P.middleman.index}) swap.
Then, *YOU* (${P.middleman.index}) <-> *${P.target.username}* (${P.target.index}) swap.

Please message @${P.target.telegram} and @${P.middleman.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*${P.middleman.username}* has accepted a 3 way swap between ${threeWaySwapName}.
Waiting on *${P.target.username}* to accept your swap request.`;
        },
        target: (hasTargetAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.initiator.username}*, and *${P.middleman.username}*`;
          if (hasTargetAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*${P.middleman.username}* has accepted a 3 way swap between ${threeWaySwapName}.
First, *${P.initiator.username}* (${P.initiator.index}) <-> *${P.middleman.username}* (${P.middleman.index}) swap.
Then, *${P.initiator.username}* (${P.middleman.index}) <-> *YOU* (${P.target.index}) swap.

Please message @${P.initiator.telegram} and @${P.middleman.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*${P.middleman.username}* has accepted a 3 way swap between ${threeWaySwapName}.
Waiting on *YOU* to accept the request.`;
        },
        middleman: (hasTargetAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.initiator.username}*, and *${P.target.username}*`;
          if (hasTargetAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*YOU* accepted the 3 way swap between ${threeWaySwapName}.
First, *${P.initiator.username}* (${P.initiator.index}) <-> *YOU* (${P.middleman.index}) swap.
Then, *${P.initiator.username}* (${P.middleman.index}) <-> *${P.target.username}* (${P.target.index}) swap.

Please message @${P.initiator.telegram} and @${P.target.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*YOU* accepted the 3 way swap between ${threeWaySwapName}.
Waiting on *${P.target.username}* to accept the request.`;
        },
      },
      //       decline: {
      //         initiator: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *${P.middleman.username}* has declined a 3 way swap between *YOU*, *${P.middleman.username}*, and *${P.target.username}*.`,
      //         target: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *${P.middleman.username}* has declined a 3 way swap between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.`,
      //         middleman: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *YOU* has declined a 3 way swap between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.`,
      //       },
    },
    target: {
      accept: {
        initiator: (hasMiddlemanAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.middleman.username}*, and *${P.target.username}*`;
          if (hasMiddlemanAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*${P.target.username}* has accepted a 3 way swap between ${threeWaySwapName}.
First, *YOU* (${P.initiator.index}) <-> *${P.middleman.username}* (${P.middleman.index}) swap.
Then, *YOU* (${P.middleman.index}) <-> *${P.target.username}* (${P.target.index}) swap.

Please message @${P.target.telegram} and @${P.middleman.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*${P.target.username}* has accepted a 3 way swap between ${threeWaySwapName}.
Waiting on *${P.middleman.username}* to accept your swap request.`;
        },
        middleman: (hasMiddlemanAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.initiator.username}*, and *${P.target.username}*`;
          if (hasMiddlemanAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*${P.target.username}* has accepted a 3 way swap between ${threeWaySwapName}.
First, *YOU* (${P.middleman.index}) <-> *${P.initiator.username}* (${P.initiator.index}) swap.
Then, *${P.initiator.username}* (${P.middleman.index}) <-> *${P.target.username}* (${P.target.index}) swap.

Please message @${P.initiator.telegram} and @${P.target.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*${P.target.username}* has accepted a 3 way swap between ${threeWaySwapName}.
Waiting on *YOU* to accept your swap request.`;
        },
        target: (hasMiddlemanAccepted: boolean) => {
          const threeWaySwapName = `*YOU*, *${P.initiator.username}*, and *${P.target.username}*`;
          if (hasMiddlemanAccepted) {
            return `✅✅✅ *${P.courseCode} ${P.courseName} Swap Request* ✅✅✅
*YOU* accepted the 3 way swap between ${threeWaySwapName}.
First, *${P.initiator.username}* (${P.initiator.index}) <-> *${P.middleman.username}* (${P.middleman.index}) swap.
Then, *${P.initiator.username}* (${P.middleman.index}) <-> *${P.target.username}* (${P.target.index}) swap.

Please message @${P.initiator.telegram} and @${P.middleman.telegram} to proceed with the swap!`;
          }
          return `✅ *${P.courseCode} ${P.courseName} Swap Request* ✅
*${P.target.username}* has accepted a 3 way swap between ${threeWaySwapName}.
Waiting on *YOU* to accept your swap request.`;
        },
      },
      //       decline: {
      //         initiator: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *${P.target.username}* has declined a 3 way swap between *YOU*, *${P.middleman.username}*, and *${P.target.username}*.`,
      //         middleman: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *${P.target.username}* has declined a 3 way swap between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.`,
      //         target: `❌ *${P.courseCode} ${P.courseName} Swap Request* ❌
      // *YOU* has declined a 3 way swap between *YOU*, *${P.initiator.username}*, and *${P.target.username}*.`,
      //       },
    },
  },
};

type PlaceholderValue<T> = {
  [K in keyof T]: T[K] extends object ? PlaceholderValue<T[K]> : string | null;
};

type PType = PlaceholderValue<typeof P>;

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[\]()~])/g, "\\$1");
}

function buildFStarsUrl(
  courseCode: string,
  index: string,
  ay: string,
  semester: string
) {
  return `https://fstars.benapps.dev/preview?ay=${encodeURIComponent(
    ay
  )}&s=${encodeURIComponent(semester)}&c=${encodeURIComponent(
    courseCode
  )}:${encodeURIComponent(index)}`;
}

export function template(
  template: string,
  data: PType,
  ay: {
    ay: string;
    semester: string;
  }
) {
  const replacements = new Map<string, string>();

  const walk = (pNode: any, dNode: any, path: string[]) => {
    if (!pNode) return;
    if (typeof pNode === "string") {
      const placeholder = pNode;
      const value = typeof dNode === "string" ? dNode : "";
      const isIndex = path[path.length - 1] === "index";
      if (isIndex) {
        if (!value) return;
        const url = buildFStarsUrl(
          data.courseCode ?? "UNSET",
          value,
          ay.ay,
          ay.semester
        );
        replacements.set(placeholder, `[${escapeMarkdown(value)}](${url})`);
      } else {
        replacements.set(placeholder, escapeMarkdown(value));
      }
      return;
    }
    if (typeof pNode !== "object") return;
    for (const key of Object.keys(pNode)) {
      walk(pNode[key], dNode?.[key], [...path, key]);
    }
  };

  walk(P, data, []);

  let out = template;
  for (const [placeholder, replacement] of replacements) {
    out = out.replaceAll(placeholder, replacement);
  }
  return out;
}

export function reduceStatus(hasAccepted: boolean, isCompleted: boolean) {
  if (isCompleted) {
    return hasAccepted ? "accepted" : ("declined" as const);
  }
  if (hasAccepted) {
    return "accepted" as const;
  }
  return "pending" as const;
}
