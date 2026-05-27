import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckoutStatus } from '@/types/inventory';
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, Package, Home } from 'lucide-react';

interface StatusUpdateDialogProps {
  checkoutId: string;
  currentStatus: CheckoutStatus;
  requestNumber?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (newStatus: CheckoutStatus, notes?: string, rejectionReason?: string) => Promise<void>;
}

const STATUS_OPTIONS: Array<{
  value: CheckoutStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Request submitted, awaiting approval',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    value: 'approved',
    label: 'Approved',
    description: 'Request approved, ready for pickup',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    value: 'borrowed',
    label: 'Borrowed',
    description: 'Items have been borrowed by user',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    value: 'returned',
    label: 'Returned',
    description: 'All items have been returned',
    icon: <Home className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    description: 'Request was rejected',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    description: 'Request was cancelled',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
];

export function StatusUpdateDialog({
  checkoutId,
  currentStatus,
  requestNumber,
  open,
  onOpenChange,
  onStatusUpdate,
}: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<CheckoutStatus>(currentStatus);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  void checkoutId; // Mark as intentionally unused

  const handleSubmit = async () => {
    if (selectedStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onStatusUpdate(
        selectedStatus,
        adminNotes.trim() || undefined,
        selectedStatus === 'rejected' ? rejectionReason.trim() : undefined
      );
      onOpenChange(false);
      setAdminNotes('');
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresRejectionReason = selectedStatus === 'rejected';
  const currentStatusInfo = STATUS_OPTIONS.find(opt => opt.value === currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Update Request Status
          </DialogTitle>
          <DialogDescription>
            Update the status of Request #{requestNumber || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status Display */}
          <div className="rounded-lg border bg-card p-3">
            <Label className="text-xs text-muted-foreground mb-2">Current Status</Label>
            {currentStatusInfo && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${currentStatusInfo.color}`}>
                {currentStatusInfo.icon}
                <span className="text-sm font-medium">{currentStatusInfo.label}</span>
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label>New Status</Label>
            <RadioGroup
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as CheckoutStatus)}
              className="space-y-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`status-${option.value}`}
                    disabled={option.value === currentStatus}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className={`flex items-center gap-2 flex-1 cursor-pointer p-2 rounded-md ${option.value === currentStatus ? 'opacity-60' : 'hover:bg-accent'}`}
                  >
                    <div className={`p-1.5 rounded-md ${option.color.split(' ')[0]}`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              placeholder="Add any notes about this status change..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Rejection Reason (only shown when rejecting) */}
          {requiresRejectionReason && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-red-600">
                Rejection Reason *
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                required
                className="border-red-300 focus:ring-red-200"
              />
              <p className="text-xs text-red-600">
                Rejection reason is required when rejecting a request.
              </p>
            </div>
          )}

          {/* Status Transition Info */}
          {selectedStatus !== currentStatus && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Status Transition</p>
                  <p className="text-amber-700 mt-1">
                    Changing from <strong>{currentStatusInfo?.label}</strong> to <strong>
                      {STATUS_OPTIONS.find(opt => opt.value === selectedStatus)?.label}
                    </strong>
                  </p>
                  {selectedStatus === 'rejected' && (
                    <p className="text-amber-700 mt-1">
                      Rejected requests cannot be reactivated. User will need to submit a new request.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (requiresRejectionReason && !rejectionReason.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}