/**
 * Hooks de datos (TanStack Query) sobre la API real. Espejo de los de web
 * (GF-225) usando el ApiClient de mobile. Las mutaciones invalidan las queries
 * afectadas para que la UI se refresque sola.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateTransactionInput, PortfolioSummary, Transaction } from '@grootfolio/shared'
import { api } from './api'

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  holdings: ['holdings'] as const,
  transactions: ['transactions'] as const,
}

export function usePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () =>
      api.get<{ portfolio: PortfolioSummary }>('/portfolio').then((r) => r.portfolio),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api.post<{ transaction: Transaction }>('/transactions', input).then((r) => r.transaction),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.portfolio })
      void qc.invalidateQueries({ queryKey: queryKeys.holdings })
      void qc.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}
