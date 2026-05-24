import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStats, useRecentActivity, useRoomStatus } from '@/hooks/useDashboard'
import { StatCard, ActivityFeed, RoomStatusCard, ItemStatusModal } from '@/components/dashboard'
import {
  Package,
  FileText,
  AlertTriangle,
  ClipboardList,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type ExpirationStatus = 'expired' | 'expiring_soon' | 'expiring_month' | 'safe' | 'missing' | null

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activity, isLoading: activityLoading } = useRecentActivity(20)
  const { data: rooms, isLoading: roomsLoading } = useRoomStatus()

  // Modal state for item status views
  const [modalState, setModalState] = useState<{
    open: boolean
    status: ExpirationStatus
    title: string
  }>({ open: false, status: null, title: '' })

  const openModal = (status: ExpirationStatus, title: string) => {
    setModalState({ open: true, status, title })
  }

  const closeModal = () => {
    setModalState({ open: false, status: null, title: '' })
  }

  const getNavigatePath = (status: ExpirationStatus) => {
    switch (status) {
      case 'expired':
        return '/inventory?type=quantifiable&expiration=expired'
      case 'expiring_soon':
        return '/inventory?type=quantifiable&expiration=expiring_soon'
      case 'expiring_month':
        return '/inventory?type=quantifiable&expiration=expiring_month'
      case 'safe':
        return '/inventory?type=quantifiable&expiration=safe'
      case 'missing':
        return '/inventory?status=missing'
      default:
        return '/inventory'
    }
  }

  const handleViewAll = () => {
    if (modalState.status) {
      navigate(getNavigatePath(modalState.status))
      closeModal()
    }
  }

  return (
    <PageShell
      title={`Welcome, ${user?.display_name || 'User'}`}
      description="Here's an overview of your platform"
    >
      {/* Expiration KPIs Grid */}
      <h3 className="text-lg font-medium tracking-tight mt-2 mb-2">Inventory Expiration</h3>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Expired"
          value={stats?.expirationKpis?.expired ?? 0}
          icon={<AlertCircle className="h-5 w-5" />}
          colorClass="bg-red-100 text-red-600"
          isLoading={statsLoading}
          onClick={() => openModal('expired', 'Expired Items')}
        />
        <StatCard
          label="Expiring Soon (< 7 Days)"
          value={stats?.expirationKpis?.expiringSoon ?? 0}
          icon={<Clock className="h-5 w-5" />}
          colorClass="bg-orange-100 text-orange-600"
          isLoading={statsLoading}
          onClick={() => openModal('expiring_soon', 'Expiring Soon Items')}
        />
        <StatCard
          label="Expiring This Month"
          value={stats?.expirationKpis?.expiringMonth ?? 0}
          icon={<Clock className="h-5 w-5" />}
          colorClass="bg-yellow-100 text-yellow-600"
          isLoading={statsLoading}
          onClick={() => openModal('expiring_month', 'Expiring This Month')}
        />
        <StatCard
          label="Safe / Valid"
          value={stats?.expirationKpis?.safe ?? 0}
          icon={<ShieldCheck className="h-5 w-5" />}
          colorClass="bg-green-100 text-green-600"
          isLoading={statsLoading}
          onClick={() => openModal('safe', 'Safe/Valid Items')}
        />
      </div>

      <h3 className="text-lg font-medium tracking-tight mb-2">System Overview</h3>
      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Total Items"
          value={stats?.totalItems ?? 0}
          icon={<Package className="h-5 w-5" />}
          colorClass="bg-blue-100 text-blue-600"
          isLoading={statsLoading}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Documents"
          value={stats?.totalDocuments ?? 0}
          icon={<FileText className="h-5 w-5" />}
          colorClass="bg-indigo-100 text-indigo-600"
          isLoading={statsLoading}
          onClick={() => navigate('/documents')}
        />
        <StatCard
          label="Missing Items"
          value={stats?.missingItemsCount ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          colorClass="bg-red-100 text-red-600"
          isLoading={statsLoading}
          onClick={() => openModal('missing', 'Missing Items')}
        />
        <StatCard
          label="Borrowed Items"
          value={stats?.activeCheckoutsCount ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          colorClass="bg-cyan-100 text-cyan-600"
          isLoading={statsLoading}
          onClick={() => navigate('/inventory/checkouts')}
        />
      </div>

      {/* Activity + Room Status */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <ActivityFeed activity={activity} isLoading={activityLoading} />
        <RoomStatusCard rooms={rooms} isLoading={roomsLoading} />
      </div>

      {/* Item Status Modal */}
      <ItemStatusModal
        open={modalState.open}
        onOpenChange={(open) => setModalState({ ...modalState, open })}
        status={modalState.status}
        title={modalState.title}
        onViewAll={handleViewAll}
      />
    </PageShell>
  )
}
