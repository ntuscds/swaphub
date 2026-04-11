import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-3xl lg:text-4xl py-2 lg:py-4 font-bold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl lg:text-2xl py-2 lg:py-4 font-bold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base lg:text-lg py-2 lg:py-4 font-bold">{children}</h3>
  ),
  //   h4: ({ children }) => (
  //     <h4 className="text-base lg:text-lg pb-2 lg:pb-4 font-bold">{children}</h4>
  //   ),
  //   h5: ({ children }) => (
  //     <h5 className="text-sm lg:text-base pb-2 lg:pb-4 font-bold">{children}</h5>
  //   ),
  p: ({ children }) => (
    <p className="text-sm lg:text-base pb-2 lg:pb-4">{children}</p>
  ),
  pre: ({ children }) => (
    <pre className="w-[calc(100vw-2rem)] overflow-auto">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-500 no-underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="flex flex-col gap-2 list-disc list-inside pb-2 lg:pb-4">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="flex flex-col gap-2 list-decimal list-inside pb-2 lg:pb-4">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-sm lg:text-base">{children}</li>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
