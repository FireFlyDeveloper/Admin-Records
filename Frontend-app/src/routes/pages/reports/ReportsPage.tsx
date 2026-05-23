import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InventoryMovementReport } from './InventoryMovementReport'
import { CheckoutHistoryReport } from './CheckoutHistoryReport'
import { MissingItemsReport } from './MissingItemsReport'
import { DeviceHealthReport } from './DeviceHealthReport'
import { BarChart3, ShoppingCart, AlertTriangle, Radio } from 'lucide-react'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('inventory-movement')

  return (
    <PageShell
      title="Reports"
      description="Generate and export system reports"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 sm:gap-0">
          <TabsTrigger value="inventory-movement" className="text-xs sm:text-sm px-2 sm:px-3">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Inventory Movement</span>
            <span className="inline xs:hidden">Movement</span>
          </TabsTrigger>
          <TabsTrigger value="checkout-history" className="text-xs sm:text-sm px-2 sm:px-3">
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Checkout History</span>
            <span className="inline xs:hidden">Checkouts</span>
          </TabsTrigger>
          <TabsTrigger value="missing-items" className="text-xs sm:text-sm px-2 sm:px-3">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Missing Items</span>
            <span className="inline xs:hidden">Missing</span>
          </TabsTrigger>
          <TabsTrigger value="device-health" className="text-xs sm:text-sm px-2 sm:px-3">
            <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Device Health</span>
            <span className="inline xs:hidden">Devices</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory-movement">
          <InventoryMovementReport />
        </TabsContent>
        <TabsContent value="checkout-history">
          <CheckoutHistoryReport />
        </TabsContent>
        <TabsContent value="missing-items">
          <MissingItemsReport />
        </TabsContent>
        <TabsContent value="device-health">
          <DeviceHealthReport />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
