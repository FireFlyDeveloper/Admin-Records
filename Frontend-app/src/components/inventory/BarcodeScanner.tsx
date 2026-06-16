import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
  /** Optional label override; defaults to "Scan barcode". */
  label?: string;
  /** Optional className passthrough for the trigger button. */
  className?: string;
}

/**
 * Single-button barcode/QR trigger. Clicking the button opens the
 * `CameraBarcodeScanner` dialog; a successful scan closes the dialog
 * and calls `onScan`. The camera scanner itself supports three fallbacks
 * (upload image, manual entry, retry) so the feature never dead-ends.
 */
export function BarcodeScanner({ onScan, isLoading = false, label = 'Scan barcode', className }: BarcodeScannerProps) {
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setScannerOpen(true)}
        disabled={isLoading}
        title={label}
        aria-label={label}
        className={className ?? 'h-10 px-3 flex items-center gap-2 shrink-0'}
      >
        <QrCode className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      <CameraBarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />
    </>
  );
}
