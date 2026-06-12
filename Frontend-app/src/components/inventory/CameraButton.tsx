import { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraButtonProps {
  onScan: (code: string) => void;
}

export function CameraButton({ onScan }: CameraButtonProps) {
  const [open, setOpen] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerIdRef = useRef<string>('camera-scanner-' + Date.now());

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        void scannerRef.current.stop();
      }
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCamera) return;

    try {
      const html5Qrcode = new Html5Qrcode(containerIdRef.current);
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777777,
      };

      const onScanSuccess = (decodedText: string) => {
        onScan(decodedText);
        setOpen(false);
        void scannerRef.current?.stop();
        scannerRef.current = null;
      };

      const onScanError = (error: string) => {
        console.debug('Scan error:', error);
      };

      await html5Qrcode.start(
        selectedCamera,
        config,
        onScanSuccess,
        onScanError
      );
    } catch (error) {
      console.error('Failed to start scanner:', error);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.warn('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
  };

  const handleCameraClick = async () => {
    try {
      const camerasList = await Html5Qrcode.getCameras();
      setCameras(camerasList);
      if (camerasList.length > 0) {
        setSelectedCamera(camerasList[0].id);
      }
      setOpen(true);
    } catch (error) {
      console.error('Failed to access cameras:', error);
      setOpen(true);
    }
  };

  useEffect(() => {
    if (open && selectedCamera) {
      startScanner();
    } else if (!open) {
      stopScanner();
    }
  }, [open, selectedCamera]);

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={handleCameraClick}
        title="Open camera scanner"
        className="h-10 w-10 shrink-0"
      >
        <Camera className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => {
          setOpen(false);
          stopScanner();
        }}>
          <div 
            className="w-[350px] rounded-lg border bg-card p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Camera Scanner</h3>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  stopScanner();
                }}
                className="h-4 w-4"
              >
                <Camera className="h-3 w-3" />
              </Button>
            </div>

            {cameras.length > 1 && (
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Select Camera:
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              id={containerIdRef.current}
              className="mb-3 rounded-lg overflow-hidden min-h-[250px] bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
}
