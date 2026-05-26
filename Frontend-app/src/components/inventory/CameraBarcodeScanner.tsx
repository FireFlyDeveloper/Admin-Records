import { useState, useEffect, useRef } from 'react';
import { QrCode, X, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CameraBarcodeScannerProps {
  onScan: (result: string) => void;
  onClose?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Global flag to prevent multiple scanner instances
let globalScannerInstance: any = null;
let cleanupInProgress = false;

export function CameraBarcodeScanner({ onScan, onClose, open, onOpenChange }: CameraBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const containerIdRef = useRef('barcode-scanner-container-' + Date.now());

  // Component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = () => {
    if (cleanupInProgress) {
      return;
    }
    
    cleanupInProgress = true;
    
    try {
      if (globalScannerInstance) {
        // First try to stop scanning if method exists
        if (typeof globalScannerInstance.stop === 'function') {
          try {
            globalScannerInstance.stop();
          } catch (err) {
            console.warn('Error stopping scanner:', err);
          }
        }
        
        // Always call clear()
        try {
          globalScannerInstance.clear();
        } catch (err) {
          console.warn('Error clearing scanner:', err);
        } finally {
          globalScannerInstance = null;
        }
      }
      
      // Clean up container - CRITICAL to prevent DOM errors
      const container = scannerRef.current;
      if (container) {
        // Remove all child nodes safely
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.innerHTML = '';
      }
      
    } catch (error) {
      console.error('Error during scanner cleanup:', error);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
      cleanupInProgress = false;
    }
  };

  const initializeScanner = async () => {
    if (globalScannerInstance) {
      cleanupScanner();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!open || !isMountedRef.current) {
      return;
    }
    
    const container = scannerRef.current;
    if (!container) {
      setCameraError('Scanner container not available');
      return;
    }
    
    // Ensure container is empty and has proper dimensions
    container.innerHTML = '';
    container.id = containerIdRef.current;
    
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.777777, // 16:9 aspect ratio for most cameras
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      };

      globalScannerInstance = new Html5QrcodeScanner(
        containerIdRef.current,
        config,
        false // verbose = false
      );

      const onScanSuccess = (decodedText: string) => {
        if (!isMountedRef.current) return;
        onScan(decodedText);
        handleClose();
      };

      const onScanFailure = (error: string) => {
        // Ignore common errors
        if (!error.includes('No QR code') && !error.includes('NotFoundException')) {
          console.debug('Scan error:', error);
        }
      };

      await globalScannerInstance.render(onScanSuccess, onScanFailure);
      
      if (isMountedRef.current) {
        setIsScanning(true);
        setCameraError(null);
      }
    } catch (error: any) {
      console.error('Failed to initialize scanner:', error);
      
      let errorMessage = 'Failed to initialize camera. ';
      
      if (error?.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and try again.';
      } else if (error?.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please check if you have a camera connected.';
      } else if (error?.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (error?.name === 'OverconstrainedError') {
        errorMessage += 'Camera constraints could not be satisfied.';
      } else {
        errorMessage += 'Please check permissions and try again.';
      }
      
      if (isMountedRef.current) {
        setCameraError(errorMessage);
        setIsScanning(false);
      }
      cleanupScanner();
    }
  };

  const handleClose = () => {
    cleanupScanner();
    onOpenChange(false);
    onClose?.();
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleRetry = () => {
    setCameraError(null);
    if (open) {
      initializeScanner();
    }
  };

  // Handle scanner lifecycle
  useEffect(() => {
    if (open) {
      // Delay initialization to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isMountedRef.current && open) {
          initializeScanner();
        }
      }, 300); // Increased delay for modal animation
      
      return () => clearTimeout(timer);
    } else {
      cleanupScanner();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Barcode / QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at a barcode or QR code to scan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container - completely empty */}
          <div className="relative rounded-lg border bg-black overflow-hidden min-h-[300px]">
            <div 
              id={containerIdRef.current}
              ref={scannerRef}
              className="min-h-[300px] w-full"
            />
            
            {/* Overlay and messages are absolutely positioned, not children of scanner container */}
            {!isScanning && !cameraError && open && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center p-8 text-white">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p>Initializing camera...</p>
                  <p className="text-xs mt-2 opacity-75">Please allow camera permissions if prompted</p>
                </div>
              </div>
            )}
            
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-green-500 rounded-lg"></div>
                <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Scanning...
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">{cameraError}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="flex items-center gap-1"
                    >
                      <Camera className="h-3 w-3" />
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Position barcode/QR code within the frame</p>
            <p>• Ensure good lighting for better scanning</p>
            <p>• Scanning will automatically stop after successful read</p>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupScanner}
              disabled={!isScanning}
              className="flex items-center gap-2"
            >
              <CameraOff className="h-4 w-4" />
              Stop Camera
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
