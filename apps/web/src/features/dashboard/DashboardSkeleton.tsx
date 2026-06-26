/**
 * Skeleton del Dashboard (GF-229): espeja el layout real (3 stat cards, 2
 * graficos y la tabla de activos) mientras carga el portfolio.
 */
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-16" />
          </SkeletonCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-[260px] w-full rounded-xl" />
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard>
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  )
}
