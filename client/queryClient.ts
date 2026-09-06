import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60_000,
        // A refetch should never surprise someone halfway through editing a draft.
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
