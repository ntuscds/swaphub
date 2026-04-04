"use client";

import { useEffect, useRef } from "react";

export function ThreeWayCycleArtboard({
  requestorIndex,
  targetIndex,
  middleIndex,
  iam,
}: {
  requestorIndex: string;
  targetIndex: string;
  middleIndex: string;
  iam: "intiator" | "target" | "middleman";
}) {
  const requestorBadgeRef = useRef<SVGSVGElement | null>(null);
  const middlemanBadgeRef = useRef<SVGSVGElement | null>(null);
  const targetBadgeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const requestorBadge = requestorBadgeRef.current;
    const middlemanBadge = middlemanBadgeRef.current;
    const targetBadge = targetBadgeRef.current;
    if (!requestorBadge || !middlemanBadge || !targetBadge) return;

    const DURATION_MS = 5600;
    const FADE_IN_END = 4.46;
    const PHASE_1_END = 22.32;
    const PHASE_2_END = 40.18;
    const PHASE_3_END = 58.04;
    const PHASE_4_END = 75.89;
    const FADE_OUT_START = 93.75;
    const FADE_OUT_END = 98.21;
    const HOLD_RESET_START = 99.99;

    const REQUESTOR_BASE = { x: 283, y: 51 };
    const REQUESTOR_START_OFFSET = { x: -187, y: 78 };

    const MIDDLEMAN_BASE = { x: 331, y: 162 };
    const MIDDLEMAN_OFFSET_1 = { x: -189, y: 78 };
    const MIDDLEMAN_OFFSET_2 = { x: 0, y: 156 };

    const TARGET_BASE = { x: 94, y: 352 };
    const TARGET_START_OFFSET = { x: 187, y: 78 };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function requestorState(progressPct: number) {
      let opacity = 1;
      let dx = REQUESTOR_START_OFFSET.x;
      let dy = REQUESTOR_START_OFFSET.y;

      if (progressPct < FADE_IN_END) {
        opacity = progressPct / FADE_IN_END;
      } else if (progressPct < PHASE_1_END) {
        opacity = 1;
      } else if (progressPct < PHASE_2_END) {
        const t = (progressPct - PHASE_1_END) / (PHASE_2_END - PHASE_1_END);
        dx = lerp(REQUESTOR_START_OFFSET.x, 0, t);
        dy = lerp(REQUESTOR_START_OFFSET.y, 0, t);
      } else if (progressPct < FADE_OUT_START) {
        dx = 0;
        dy = 0;
      } else if (progressPct < FADE_OUT_END) {
        dx = 0;
        dy = 0;
        const t =
          (progressPct - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        opacity = lerp(1, 0, t);
      } else if (progressPct < HOLD_RESET_START) {
        dx = 0;
        dy = 0;
        opacity = 0;
      } else {
        opacity = 0;
      }

      return {
        x: REQUESTOR_BASE.x + dx,
        y: REQUESTOR_BASE.y + dy,
        opacity,
      };
    }

    function middlemanState(progressPct: number) {
      let opacity = 1;
      let dx = 0;
      let dy = 0;

      if (progressPct < FADE_IN_END) {
        opacity = progressPct / FADE_IN_END;
      } else if (progressPct < PHASE_1_END) {
        // stay at start
      } else if (progressPct < PHASE_2_END) {
        const t = (progressPct - PHASE_1_END) / (PHASE_2_END - PHASE_1_END);
        dx = lerp(0, MIDDLEMAN_OFFSET_1.x, t);
        dy = lerp(0, MIDDLEMAN_OFFSET_1.y, t);
      } else if (progressPct < PHASE_3_END) {
        dx = MIDDLEMAN_OFFSET_1.x;
        dy = MIDDLEMAN_OFFSET_1.y;
      } else if (progressPct < PHASE_4_END) {
        const t = (progressPct - PHASE_3_END) / (PHASE_4_END - PHASE_3_END);
        dx = lerp(MIDDLEMAN_OFFSET_1.x, MIDDLEMAN_OFFSET_2.x, t);
        dy = lerp(MIDDLEMAN_OFFSET_1.y, MIDDLEMAN_OFFSET_2.y, t);
      } else if (progressPct < FADE_OUT_START) {
        dx = MIDDLEMAN_OFFSET_2.x;
        dy = MIDDLEMAN_OFFSET_2.y;
      } else if (progressPct < FADE_OUT_END) {
        dx = MIDDLEMAN_OFFSET_2.x;
        dy = MIDDLEMAN_OFFSET_2.y;
        const t =
          (progressPct - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        opacity = lerp(1, 0, t);
      } else {
        dx = MIDDLEMAN_OFFSET_2.x;
        dy = MIDDLEMAN_OFFSET_2.y;
        opacity = 0;
      }

      return {
        x: MIDDLEMAN_BASE.x + dx,
        y: MIDDLEMAN_BASE.y + dy,
        opacity,
      };
    }

    function targetState(progressPct: number) {
      let opacity = 1;
      let dx = TARGET_START_OFFSET.x;
      let dy = TARGET_START_OFFSET.y;

      if (progressPct < FADE_IN_END) {
        opacity = progressPct / FADE_IN_END;
      } else if (progressPct < PHASE_3_END) {
        // stay at start
      } else if (progressPct < PHASE_4_END) {
        const t = (progressPct - PHASE_3_END) / (PHASE_4_END - PHASE_3_END);
        dx = lerp(TARGET_START_OFFSET.x, 0, t);
        dy = lerp(TARGET_START_OFFSET.y, 0, t);
      } else if (progressPct < FADE_OUT_START) {
        dx = 0;
        dy = 0;
      } else if (progressPct < FADE_OUT_END) {
        dx = 0;
        dy = 0;
        const t =
          (progressPct - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        opacity = lerp(1, 0, t);
      } else if (progressPct < HOLD_RESET_START) {
        dx = 0;
        dy = 0;
        opacity = 0;
      } else {
        opacity = 0;
      }

      return {
        x: TARGET_BASE.x + dx,
        y: TARGET_BASE.y + dy,
        opacity,
      };
    }

    let rafId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = (now - start) % DURATION_MS;
      const progressPct = (elapsed / DURATION_MS) * 100;

      const requestor = requestorState(progressPct);
      requestorBadge.setAttribute("x", String(requestor.x));
      requestorBadge.setAttribute("y", String(requestor.y));
      requestorBadge.style.opacity = String(requestor.opacity);

      const middleman = middlemanState(progressPct);
      middlemanBadge.setAttribute("x", String(middleman.x));
      middlemanBadge.setAttribute("y", String(middleman.y));
      middlemanBadge.style.opacity = String(middleman.opacity);

      const target = targetState(progressPct);
      targetBadge.setAttribute("x", String(target.x));
      targetBadge.setAttribute("y", String(target.y));
      targetBadge.style.opacity = String(target.opacity);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // width={512}
      // height={479}
      className="w-full"
      viewBox="0 0 512 540"
      fill="none"
      // {...props}
    >
      <path
        fill="url(#a)"
        d="M0 291c0-22.091 17.909-40 40-40h48c22.091 0 40 17.909 40 40v40H0v-40Z"
      />
      <circle cx={64} cy={227} r={64} fill="url(#b)" />
      {iam === "intiator" ? (
        <text
          x="64"
          y="363"
          className="fill-primary-500 font-extrabold"
          fontSize="32"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          YOU
        </text>
      ) : (
        <text
          x="64"
          y="363"
          className="fill-primary-600 dark:fill-primary-400 font-light"
          fontSize="24"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          Requestor
        </text>
      )}
      <path
        fill="url(#c)"
        d="M384 128c0-22.091 17.909-40 40-40h48c22.091 0 40 17.909 40 40v40H384v-40Z"
      />
      <circle cx={448} cy={64} r={64} fill="url(#d)" />

      {iam === "middleman" ? (
        <text
          x="448"
          y="200"
          className="fill-secondary-500 font-extrabold"
          fontSize="32"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          YOU
        </text>
      ) : (
        <text
          x="448"
          y="200"
          className="fill-secondary-600 dark:fill-secondary-400 font-light"
          fontSize="24"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          Middleman
        </text>
      )}

      <path
        fill="url(#e)"
        d="M384 439c0-22.091 17.909-40 40-40h48c22.091 0 40 17.909 40 40v40H384v-40Z"
      />
      <circle cx={448} cy={375} r={64} fill="url(#f)" />

      {iam === "target" ? (
        <text
          x="448"
          y="512"
          className="fill-white font-extrabold"
          fontSize="32"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          YOU
        </text>
      ) : (
        <text
          x="448"
          y="512"
          className="fill-background-600 dark:fill-background-400 font-light"
          fontSize="24"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          Target
        </text>
      )}
      <path
        fill="#334155"
        d="M327.222 117.802a1 1 0 0 0-.541-1.307l-8.315-3.444a1 1 0 1 0-.765 1.848l7.391 3.061-3.062 7.391a1 1 0 0 0 1.848.766l3.444-8.315ZM160 186.302l.383.924 166.298-68.883-.383-.924-.382-.924-166.299 68.883.383.924ZM193.178 210.76c-.211.51.031 1.095.541 1.307l8.315 3.444a1.001 1.001 0 0 0 .766-1.848l-7.391-3.061 3.061-7.391a1 1 0 0 0-1.848-.766l-3.444 8.315Zm167.222-68.5-.382-.924-166.299 68.883.383.924.383.924 166.298-68.883-.383-.924ZM340.458 368.807a1 1 0 0 0 .541-1.307l-3.444-8.315a1.001 1.001 0 0 0-1.848.766l3.061 7.391-7.391 3.061a1.001 1.001 0 0 0 .766 1.848l8.315-3.444ZM173.777 299l-.383.924 166.298 68.883.383-.924.383-.924-166.299-68.883-.382.924ZM179.943 339.755a1 1 0 0 0-.542 1.306l3.445 8.315a.999.999 0 1 0 1.847-.765l-3.061-7.391 7.391-3.062a1 1 0 0 0-.765-1.848l-8.315 3.445Zm166.681 69.807.382-.924-166.298-68.883-.383.924-.382.923 166.298 68.883.383-.923Z"
      />

      <svg
        ref={requestorBadgeRef}
        x="283"
        y="51"
        width="96"
        height="34"
        style={{ willChange: "opacity" }}
      >
        <rect width="100%" height="100%" className="fill-primary-950" rx="12" />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="currentColor"
          className="text-primary-300 font-medium"
          fontSize="20"
        >
          {requestorIndex}
        </text>
      </svg>

      <svg
        ref={middlemanBadgeRef}
        x="331"
        y="162"
        width="96"
        height="34"
        style={{ willChange: "opacity" }}
      >
        <rect
          width="100%"
          height="100%"
          className="fill-secondary-950"
          rx="12"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="currentColor"
          className="text-secondary-300 font-medium"
          fontSize="20"
        >
          {middleIndex}
        </text>
      </svg>

      <svg
        ref={targetBadgeRef}
        x="94"
        y="352"
        width="96"
        height="34"
        style={{ willChange: "opacity" }}
      >
        <rect
          width="100%"
          height="100%"
          className="fill-background-900"
          rx="12"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="currentColor"
          className="text-white font-medium"
          fontSize="20"
        >
          {targetIndex}
        </text>
      </svg>

      <defs>
        <linearGradient
          id="a"
          x1={64}
          x2={64}
          y1={251}
          y2={331}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1D4ED8" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="b"
          x1={64}
          x2={64}
          y1={163}
          y2={291}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1D4ED8" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="c"
          x1={448}
          x2={448}
          y1={88}
          y2={168}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E21D48" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="d"
          x1={448}
          x2={448}
          y1={0}
          y2={128}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E21D48" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="e"
          x1={448}
          x2={448}
          y1={399}
          y2={479}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94A3B8" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="f"
          x1={448}
          x2={448}
          y1={311}
          y2={439}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94A3B8" />
          <stop offset={1} stopColor="#020617" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DirectSwapArtboard({
  yourIndex,
  otherIndex,
  iam,
}: {
  yourIndex: string;
  otherIndex: string;
  iam: "intiator" | "target";
}) {
  const yourBadgeRef = useRef<SVGSVGElement | null>(null);
  const otherBadgeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const yourBadge = yourBadgeRef.current;
    const otherBadge = otherBadgeRef.current;
    if (!yourBadge || !otherBadge) return;

    const DURATION_MS = 3600;
    const YOUR_BADGE_BASE_X = 296;
    const OTHER_BADGE_BASE_X = 104;
    const FADE_IN_END = 6.94;
    const MOVE_START = 34.72;
    const MOVE_END = 62.5;
    const FADE_OUT_START = 90.28;
    const FADE_OUT_END = 97.22;
    const HOLD_RESET_START = 99.99;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function computeState(progressPct: number, startX: number) {
      let opacity = 1;
      let x = startX;

      if (progressPct < FADE_IN_END) {
        opacity = progressPct / FADE_IN_END;
      } else if (progressPct < MOVE_START) {
        opacity = 1;
        x = startX;
      } else if (progressPct < MOVE_END) {
        const t = (progressPct - MOVE_START) / (MOVE_END - MOVE_START);
        x = lerp(startX, 0, t);
        opacity = 1;
      } else if (progressPct < FADE_OUT_START) {
        x = 0;
        opacity = 1;
      } else if (progressPct < FADE_OUT_END) {
        const t =
          (progressPct - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START);
        x = 0;
        opacity = lerp(1, 0, t);
      } else if (progressPct < HOLD_RESET_START) {
        x = 0;
        opacity = 0;
      } else {
        x = startX;
        opacity = 0;
      }

      return { x, opacity };
    }

    let rafId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = (now - start) % DURATION_MS;
      const progressPct = (elapsed / DURATION_MS) * 100;

      const yourState = computeState(progressPct, -202);
      const otherState = computeState(progressPct, 202);

      yourBadge.setAttribute("x", String(YOUR_BADGE_BASE_X + yourState.x));
      yourBadge.style.opacity = `${yourState.opacity}`;

      otherBadge.setAttribute("x", String(OTHER_BADGE_BASE_X + otherState.x));
      otherBadge.style.opacity = `${otherState.opacity}`;

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <svg
      className="w-full"
      viewBox="0 0 512 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 128C0 105.909 17.9086 88 40 88H88C110.091 88 128 105.909 128 128V168H0V128Z"
        fill="url(#paint0_linear_42_168)"
      />
      <circle cx="64" cy="64" r="64" fill="url(#paint1_linear_42_168)" />
      {iam === "intiator" ? (
        <text
          x="64"
          y="200"
          className="fill-primary-500 font-extrabold"
          fontSize="32"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          YOU
        </text>
      ) : (
        <text
          x="64"
          y="200"
          className="fill-primary-300 dark:fill-primary-600 font-light"
          fontSize="24"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          Requestor
        </text>
      )}

      <path
        d="M384 129C384 106.909 401.909 89 424 89H472C494.091 89 512 106.909 512 129V169H384V129Z"
        fill="url(#paint2_linear_42_168)"
      />
      <circle cx="448" cy="65" r="64" fill="url(#paint3_linear_42_168)" />
      {iam === "target" ? (
        <text
          x="448"
          y="200"
          className="fill-white font-extrabold"
          fontSize="32"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          YOU
        </text>
      ) : (
        <text
          x="448"
          y="200"
          className="fill-background-600 dark:fill-background-400 font-light"
          fontSize="24"
          dominantBaseline="middle"
          textAnchor="middle"
        >
          Target
        </text>
      )}
      <path
        d="M335.707 93.7071C336.098 93.3166 336.098 92.6834 335.707 92.2929L329.343 85.9289C328.953 85.5384 328.319 85.5384 327.929 85.9289C327.538 86.3195 327.538 86.9526 327.929 87.3431L333.586 93L327.929 98.6569C327.538 99.0474 327.538 99.6805 327.929 100.071C328.319 100.462 328.953 100.462 329.343 100.071L335.707 93.7071ZM155 93V94L335 94V93V92L155 92V93Z"
        fill="#334155"
      />
      <path
        d="M176.293 128.293C175.902 128.683 175.902 129.317 176.293 129.707L182.657 136.071C183.047 136.462 183.681 136.462 184.071 136.071C184.462 135.681 184.462 135.047 184.071 134.657L178.414 129L184.071 123.343C184.462 122.953 184.462 122.319 184.071 121.929C183.681 121.538 183.047 121.538 182.657 121.929L176.293 128.293ZM357 129V128L177 128V129V130L357 130V129Z"
        fill="#334155"
      />

      <svg
        ref={yourBadgeRef}
        x="296"
        y="42"
        width="96"
        height="34"
        style={{ willChange: "opacity" }}
      >
        <rect width="100%" height="100%" className="fill-primary-950" rx="12" />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-primary-300 font-medium"
          fontSize="20"
        >
          {yourIndex}
        </text>
      </svg>

      <svg
        ref={otherBadgeRef}
        // x="200"
        x="104"
        y="145"
        width="96"
        height="34"
        style={{ willChange: "opacity" }}
      >
        <rect
          width="100%"
          height="100%"
          className="fill-background-900"
          rx="12"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="currentColor"
          className="text-white font-medium"
          fontSize="20"
        >
          {otherIndex}
        </text>
      </svg>

      <defs>
        <linearGradient
          id="paint0_linear_42_168"
          x1="64"
          y1="88"
          x2="64"
          y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_42_168"
          x1="64"
          y1="0"
          x2="64"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_42_168"
          x1="448"
          y1="89"
          x2="448"
          y2="169"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94A3B8" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_42_168"
          x1="448"
          y1="1"
          x2="448"
          y2="129"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94A3B8" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
      </defs>
    </svg>
  );
}
