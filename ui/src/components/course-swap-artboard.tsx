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
        x="283"
        y="51"
        width="96"
        height="34"
        style={{ "--x": "-187px", "--y": "78px" } as React.CSSProperties}
        className="three-cycle-arboard__slide-requestor"
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
        x="331"
        y="162"
        width="96"
        height="34"
        style={
          {
            "--x1": "-189px",
            "--y1": "78px",
            "--x2": "0",
            "--y2": "156px",
          } as React.CSSProperties
        }
        className="three-cycle-arboard__slide-middleman"
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
          {requestorIndex}
        </text>
      </svg>

      <svg
        x="94"
        y="352"
        width="96"
        height="34"
        style={{ "--x": "187px", "--y": "78px" } as React.CSSProperties}
        className="three-cycle-arboard__slide-target"
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
        x="296"
        y="42"
        width="96"
        height="34"
        style={{ "--x": "-202px" } as React.CSSProperties}
        className="direct-arboard__slide"
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
        // x="200"
        x="104"
        y="145"
        width="96"
        height="34"
        style={{ "--x": "202px" } as React.CSSProperties}
        className="direct-arboard__slide"
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
