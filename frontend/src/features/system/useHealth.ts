import { useQuery } from '@tanstack/react-query'

import { fetchHealth } from '@/services/health'

export function useHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: false,
  })
}
