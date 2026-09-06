import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { MapDocument } from '../../shared/schema';
import { getMap, saveMap } from '../api';

export const mapKeys = {
  all: ['map'] as const,
  detail: () => [...mapKeys.all, 'detail'] as const,
};

export const mapQueryOptions = queryOptions({
  queryKey: mapKeys.detail(),
  queryFn: getMap,
});

export function useMapQuery() {
  return useQuery(mapQueryOptions);
}

export function useSaveMapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mapKeys.all, 'save'],
    mutationFn: (mapDocument: MapDocument) => saveMap(mapDocument),
    onSuccess: (savedMap) => {
      // PUT returns the complete canonical resource, so update the cache directly.
      // If it returned only an acknowledgement, invalidateQueries would be better.
      queryClient.setQueryData(mapQueryOptions.queryKey, savedMap);
    },
  });
}
