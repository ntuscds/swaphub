import { makeUseQueryWithStatus } from "convex-helpers/react";
import { useQueries, useQuery } from "convex/react";

export const useQueryWithStatus = makeUseQueryWithStatus(useQueries);
