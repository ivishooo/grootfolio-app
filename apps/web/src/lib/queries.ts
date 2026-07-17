/**
 * Hooks de datos (TanStack Query) sobre la API real. Centraliza query keys y
 * el cableado al ApiClient. Las mutaciones invalidan las queries afectadas para
 * que la UI se refresque sola (ej. cargar una transaccion refresca el portfolio).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AssetSearchResult,
  AssetType,
  CreateTransactionInput,
  PortfolioSummary,
  QuizQuestion,
  RiskProfileResult,
  Transaction,
  UpdateTransactionInput,
} from '@grootfolio/shared'
import { api } from './api'

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  holdings: ['holdings'] as const,
  transactions: ['transactions'] as const,
  quiz: ['quiz'] as const,
  quizResult: ['quiz-result'] as const,
  assetSearch: (q: string, type?: AssetType) => ['assets', 'search', type ?? 'all', q] as const,
}

interface QuizAnswer {
  questionId: string
  optionId: string
}

export function useQuiz() {
  return useQuery({
    queryKey: queryKeys.quiz,
    queryFn: () => api.get<{ questions: QuizQuestion[] }>('/quiz').then((r) => r.questions),
  })
}

export function useQuizResult() {
  return useQuery({
    queryKey: queryKeys.quizResult,
    queryFn: () =>
      api.get<{ result: RiskProfileResult | null }>('/quiz/result').then((r) => r.result),
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (answers: QuizAnswer[]) =>
      api.post<{ result: RiskProfileResult }>('/quiz/submit', { answers }).then((r) => r.result),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.quizResult })
    },
  })
}

/**
 * Autocomplete de activos (GF-248). `q` de menos de 2 caracteres no dispara la
 * request (el back devolveria vacio igual). El componente hace el debounce.
 */
export function useAssetSearch(q: string, type?: AssetType) {
  const term = q.trim()
  return useQuery({
    queryKey: queryKeys.assetSearch(term, type),
    queryFn: () => {
      const params = new URLSearchParams({ q: term })
      if (type) params.set('type', type)
      return api
        .get<{ results: AssetSearchResult[] }>(`/assets/search?${params.toString()}`)
        .then((r) => r.results)
    },
    enabled: term.length >= 2,
    staleTime: 60_000,
  })
}

export function usePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () =>
      api.get<{ portfolio: PortfolioSummary }>('/portfolio').then((r) => r.portfolio),
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () =>
      api.get<{ transactions: Transaction[] }>('/transactions').then((r) => r.transactions),
  })
}

// Invalida las tres queries que dependen de las transacciones: el resumen del
// portfolio, los holdings y el listado de transacciones.
function invalidatePortfolioData(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.portfolio })
  void qc.invalidateQueries({ queryKey: queryKeys.holdings })
  void qc.invalidateQueries({ queryKey: queryKeys.transactions })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api.post<{ transaction: Transaction }>('/transactions', input).then((r) => r.transaction),
    onSuccess: () => invalidatePortfolioData(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    // El ApiClient de shared no expone `patch`, asi que usamos `request` directo.
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      api
        .request<{ transaction: Transaction }>(`/transactions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
        .then((r) => r.transaction),
    onSuccess: () => invalidatePortfolioData(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/transactions/${id}`),
    onSuccess: () => invalidatePortfolioData(qc),
  })
}

export function useDeleteAssetPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => api.delete<void>(`/assets/${assetId}/transactions`),
    onSuccess: () => invalidatePortfolioData(qc),
  })
}
