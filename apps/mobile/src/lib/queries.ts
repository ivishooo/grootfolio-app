/**
 * Hooks de datos (TanStack Query) sobre la API real. Espejo de los de web
 * (GF-225) usando el ApiClient de mobile. Las mutaciones invalidan las queries
 * afectadas para que la UI se refresque sola.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminUserRow,
  AdminUserStats,
  AppNotification,
  AssetSearchResult,
  AssetType,
  AuditLogEntry,
  ContentItem,
  ContentSection,
  ContentType,
  CreateTransactionInput,
  CreateUserInput,
  LedgerEntry,
  PortfolioSummary,
  QuizQuestion,
  ReportSummary,
  RiskProfileResult,
  SuspendUserInput,
  Transaction,
  UpdateTransactionInput,
  UpdateUserInput,
  User,
} from '@grootfolio/shared'
import { api } from './api'
import { uploadWithProgress } from './upload'

export interface AdminUsersFilters {
  search?: string
  status?: 'active' | 'suspended'
  role?: 'user' | 'admin'
  sort?: 'recent' | 'oldest' | 'name'
  page?: number
  perPage?: number
}

/** Archivo elegido en RN (image/document picker) para subir por multipart. */
export interface PickedFile {
  uri: string
  name: string
  type: string
}

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  holdings: ['holdings'] as const,
  transactions: ['transactions'] as const,
  quiz: ['quiz'] as const,
  quizResult: ['quiz-result'] as const,
  reportSummary: ['reports', 'summary'] as const,
  reportLedger: ['reports', 'transactions'] as const,
  assetSearch: (q: string, type?: AssetType) => ['assets', 'search', type ?? 'all', q] as const,
  adminUsers: (f: AdminUsersFilters) => ['admin', 'users', f] as const,
  adminUser: (id: string) => ['admin', 'user', id] as const,
  auditLogs: ['admin', 'audit'] as const,
  contentSections: ['content', 'sections'] as const,
  adminContentItems: (f: { sectionId?: string; status?: string; search?: string }) =>
    ['admin', 'content', 'items', f] as const,
  contentItems: (f: { sectionId?: string; search?: string }) => ['content', 'items', f] as const,
  notifications: ['notifications'] as const,
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

/** Resumen de reportes (P&L realizado + balance historico). GF-250. */
export function useReportSummary() {
  return useQuery({
    queryKey: queryKeys.reportSummary,
    queryFn: () => api.get<{ summary: ReportSummary }>('/reports/summary').then((r) => r.summary),
  })
}

/** Ledger completo valuado en USD. GF-250. */
export function useReportLedger() {
  return useQuery({
    queryKey: queryKeys.reportLedger,
    queryFn: () =>
      api.get<{ transactions: LedgerEntry[] }>('/reports/transactions').then((r) => r.transactions),
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

// ================== Admin / Contenidos (F7) ==================

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

interface AdminUsersResponse {
  data: AdminUserRow[]
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  stats: AdminUserStats
}

export function useAdminUsers(filters: AdminUsersFilters) {
  return useQuery({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: () => api.get<AdminUsersResponse>(`/admin/users${qs({ ...filters })}`),
  })
}

export interface AdminUserDetail {
  user: AdminUserRow
  portfolioValue: number
  transactionsCount: number
  lastLoginAt: string | null
  recentActivity: Array<{ label: string; at: string | null }>
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: queryKeys.adminUser(id ?? ''),
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  })
}

function useAdminInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    void qc.invalidateQueries({ queryKey: queryKeys.auditLogs })
  }
}

export function useCreateUser() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<{ user: User }>('/admin/users', input),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      api.patch<{ user: User }>(`/admin/users/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useSuspendUser() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SuspendUserInput }) =>
      api.post<{ user: User }>(`/admin/users/${id}/suspend`, input),
    onSuccess: invalidate,
  })
}

export function useUnsuspendUser() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.post<{ user: User }>(`/admin/users/${id}/unsuspend`),
    onSuccess: invalidate,
  })
}

export function useBulkSuspend() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: (input: { userIds: string[] } & SuspendUserInput) =>
      api.post<{ affected: number }>('/admin/users/bulk-suspend', input),
    onSuccess: invalidate,
  })
}

export function useBulkUnsuspend() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: (userIds: string[]) =>
      api.post<{ affected: number }>('/admin/users/bulk-unsuspend', { userIds }),
    onSuccess: invalidate,
  })
}

export function useDeleteUserAvatar() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, notifyUser }: { id: string; notifyUser?: boolean }) =>
      api.delete<{ user: User }>(`/admin/users/${id}/avatar`, { notifyUser }),
    onSuccess: invalidate,
  })
}

export function useRenameUser() {
  const invalidate = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, fullName, notifyUser }: { id: string; fullName: string; notifyUser?: boolean }) =>
      api.patch<{ user: User }>(`/admin/users/${id}/name`, { fullName, notifyUser }),
    onSuccess: invalidate,
  })
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs,
    queryFn: () => api.get<{ data: AuditLogEntry[] }>('/admin/audit-logs?perPage=30').then((r) => r.data),
  })
}

export function useContentSections() {
  return useQuery({
    queryKey: queryKeys.contentSections,
    queryFn: () => api.get<{ data: ContentSection[] }>('/content/sections').then((r) => r.data),
  })
}

export function useAdminContentItems(filters: { sectionId?: string; status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.adminContentItems(filters),
    queryFn: () => api.get<{ data: ContentItem[] }>(`/admin/content/items${qs({ ...filters })}`).then((r) => r.data),
  })
}

export function useContentItems(filters: { sectionId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.contentItems(filters),
    queryFn: () => api.get<{ data: ContentItem[] }>(`/content/items${qs({ ...filters })}`).then((r) => r.data),
  })
}

function useContentInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['content'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'content'] })
    void qc.invalidateQueries({ queryKey: queryKeys.notifications })
  }
}

export function useCreateSection() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: (input: { name: string; icon?: string; color?: string }) =>
      api.post<{ section: ContentSection }>('/admin/content/sections', input),
    onSuccess: invalidate,
  })
}

export function useDeleteSection() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      api.delete<void>(`/admin/content/sections/${id}${force ? '?force=true' : ''}`),
    onSuccess: invalidate,
  })
}

export interface UploadContentVars {
  type: ContentType
  title: string
  sectionId: string
  description?: string
  externalUrl?: string
  file?: PickedFile | null
  publish: boolean
  notifyUsers: boolean
  onProgress?: (percent: number) => void
}

export function useUploadContent() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: (vars: UploadContentVars) => {
      const form = new FormData()
      form.append('type', vars.type)
      form.append('title', vars.title)
      form.append('sectionId', vars.sectionId)
      if (vars.description) form.append('description', vars.description)
      if (vars.externalUrl) form.append('externalUrl', vars.externalUrl)
      form.append('publish', String(vars.publish))
      form.append('notifyUsers', String(vars.notifyUsers))
      if (vars.file) {
        // RN: file object { uri, name, type }
        form.append('file', { uri: vars.file.uri, name: vars.file.name, type: vars.file.type } as unknown as Blob)
      }
      return uploadWithProgress<{ item: ContentItem }>('/admin/content/items', form, vars.onProgress)
    },
    onSuccess: invalidate,
  })
}

export function usePublishContent() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: ({ id, notifyUsers }: { id: string; notifyUsers?: boolean }) =>
      api.post<{ item: ContentItem }>(`/admin/content/items/${id}/publish`, { notifyUsers }),
    onSuccess: invalidate,
  })
}

export function usePinContent() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      api.post<{ item: ContentItem }>(`/admin/content/items/${id}/pin`, { pinned }),
    onSuccess: invalidate,
  })
}

export function useDeleteContent() {
  const invalidate = useContentInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/content/items/${id}`),
    onSuccess: invalidate,
  })
}

export function useMarkContentViewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/content/items/${id}/view`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['content', 'items'] }),
  })
}

interface NotificationsResponse {
  data: AppNotification[]
  unreadCount: number
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<NotificationsResponse>('/notifications?perPage=20'),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('/notifications/read-all'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/notifications/${id}/read`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fullName: string) => api.patch<{ user: User }>('/me', { fullName }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: PickedFile) => {
      const form = new FormData()
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
      return uploadWithProgress<{ avatarUrl: string; user: User }>('/me/avatar', form)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useDeleteAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ user: User }>('/me/avatar'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
