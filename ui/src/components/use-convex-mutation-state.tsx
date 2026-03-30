"use client";

import { useCallback, useRef, useState } from "react";

export type UseConvexMutationStateOptions<R> = {
  /**
   * Called after a successful mutation with the server return value.
   */
  onSuccess?: (data: R) => void;
};

export type UseConvexActionStateOptions<R> = {
  /**
   * Called after a successful action with the server return value.
   */
  onSuccess?: (data: R) => void;
};

/**
 * Wraps the callable returned by `useMutation(api.some.mutation)` with
 * pending / error / success / data state and an optional `onSuccess` callback.
 */
export function useConvexMutationState<
  R,
  Mutate extends (...args: never[]) => Promise<R>,
>(mutate: Mutate, options?: UseConvexMutationStateOptions<R>) {
  type Data = R;

  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handle = useCallback(
    async (...args: Parameters<Mutate>): Promise<R | undefined> => {
      setError(null);
      setIsSuccess(false);
      setIsPending(true);
      try {
        const result = await mutate(...args);
        setData(result);
        setIsSuccess(true);
        optionsRef.current?.onSuccess?.(result);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err ?? "Request failed")
        );
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [mutate]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setIsPending(false);
    setData(null);
  }, []);

  return {
    handle,
    error,
    setError,
    isSuccess,
    isPending,
    /** Last successful mutation result; also updatable via `setData`. */
    data,
    setData,
    reset,
  };
}

/**
 * Wraps the callable returned by `useAction(api.some.action)` with
 * pending / error / success / data state and an optional `onSuccess` callback.
 */
export function useConvexActionState<
  R,
  Act extends (...args: never[]) => Promise<R>,
>(action: Act, options?: UseConvexActionStateOptions<R>) {
  type Data = R;

  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handle = useCallback(
    async (...args: Parameters<Act>): Promise<R | undefined> => {
      setError(null);
      setIsSuccess(false);
      setIsPending(true);
      try {
        const result = await action(...args);
        setData(result);
        setIsSuccess(true);
        optionsRef.current?.onSuccess?.(result);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err ?? "Request failed")
        );
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [action]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setIsPending(false);
    setData(null);
  }, []);

  return {
    handle,
    error,
    setError,
    isSuccess,
    isPending,
    /** Last successful action result; also updatable via `setData`. */
    data,
    setData,
    reset,
  };
}
