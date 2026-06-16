import { useState } from 'react';
import { QrCode, Search, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

/**
 * Text-input barcode/QR entry that also exposes a camera button.
 * The camera button opens `CameraBarcodeScanner` (production-grade
 * implementation that uses Html5Qrcode directly, not the wrapper).
 *
 * Submit semantics: pressing Enter or clicking the QR icon submits
 * the trimmed value. Clicking the camera icon opens the scanner;
 * a successful scan closes the dialog and calls onScan.
 */
export function BarcodeScanner({ onScan, isLoading = false, placeholder = 'Scan or enter barcode...' }: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const submit = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    onScan(code);
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(inputValue);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setScannerOpen(true)}
          disabled={isLoading}
          title="Scan with camera"
          aria-label="Scan barcode or QR with camera"
          className="h-10 w-10 shrink-0"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={isLoading || !inputValue.trim()}
          title="Add barcode"
          aria-label="Submit barcode"
          className="h-10 w-10 shrink-0"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </form>

      <CameraBarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={submit}
      />
    </>
  );
}
