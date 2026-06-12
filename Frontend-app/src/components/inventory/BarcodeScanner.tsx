import { useState } from 'react';
import { QrCode, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CameraButton } from './CameraButton';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function BarcodeScanner({ onScan, isLoading = false, placeholder = 'Scan or enter barcode...' }: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9"
          disabled={isLoading}
        />
      </div>
      <CameraButton onScan={onScan} />
      <Button
        type="submit"
        size="icon"
        variant="outline"
        disabled={isLoading || !inputValue.trim()}
        title="Add barcode"
        className="h-10 w-10 shrink-0"
      >
        <QrCode className="h-4 w-4" />
      </Button>
    </form>
  );
}
