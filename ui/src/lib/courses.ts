import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { AcadYear } from "./acad";
import { convexServerOptions } from "./convex-server";

export const getCourses = cache(async (acadYear?: AcadYear) => {
  return await fetchQuery(api.tasks.getCourses, { acadYear }, convexServerOptions());
});
