/**
 * Hooks de datos (TanStack Query) sobre la API real. Espejo de los de web
 * (GF-225) usando el ApiClient de mobile. Las mutaciones invalidan las queries
 * afectadas para que la UI se refresque sola.
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
 * Autocomplete de activos (GF-248). Espejo del hook de web: el debounce lo hace
 * el componente; `q` de menos de 2 caracteres no dispara la request.
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
