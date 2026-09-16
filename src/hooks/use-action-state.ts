'use client';

import { useState, useCallback } from 'react';

/**
 * A custom hook for managing state with server actions
 * Provides a convenient wrapper around server actions for form state handling
 */
export function useActionState<State, FormData>(
  serverAction: (prevState: State, formData: FormData) => Promise<State>,
  initialState: State,
) {
  const [state, setState] = useState<State>(initialState);

  // Create a wrapper function that updates local state with the server response
  const formAction = useCallback(
    async (formData: FormData) => {
      const result = await serverAction(state, formData);
      setState(result);
      return result;
    },
    [serverAction, state]
  );

  return [state, formAction] as const;
} 