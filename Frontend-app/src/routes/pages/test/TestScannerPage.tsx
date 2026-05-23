import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CameraBarcodeScanner } from '@/components/inventory/CameraBarcodeScanner';

export function TestScannerPage() {
  const [showScanner, setShowScanner] = useState(false);
  
  const handleScan = (result: string) => {
    console.log('Scanned:', result);
    alert(`Scanned: ${result}`);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Scanner Test</h1>
      <p className="mb-4">Test the camera barcode scanner with proper cleanup</p>
      
      <Button onClick={() => setShowScanner(true)}>
        Open Scanner
      </Button>
      
      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Test Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click "Open Scanner"</li>
          <li>Grant camera permissions if prompted</li>
          <li>Try scanning a QR code or click "Close"</li>
          <li>Open and close multiple times</li>
          <li>Check browser console for errors</li>
        </ol>
      </div>
      
      <CameraBarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScan}
      />
    </div>
  );
}
