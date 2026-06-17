import { useState, useRef, useCallback, useEffect } from 'react';
import { QrCode, X, Camera, CameraOff, AlertCircle, Keyboard, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CameraBarcodeScannerProps {
  onScan: (result: string) => void;
  onClose?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = 'idle' | 'requesting-permission' | 'starting' | 'scanning' | 'error';
type Html5QrcodeInstance = { stop: () => Promise<void>; clear: () => Promise<void>; start: (...a: any[]) => Promise<void>; scanFile: (file: File, showImage?: boolean) => Promise<string> };

/**
 * Production-grade camera barcode scanner.
 *
 * Uses the lower-level `Html5Qrcode` class directly (NOT `Html5QrcodeScanner.render()`,
 * which silently swallows camera errors and presents a black void with a green
 * "Scanning…" badge — see react-camera-qr-integration skill).
 *
 * Always ships three fallbacks alongside the camera so the feature never
 * dead-ends: Upload image, Manual entry, Retry.
 */
export function CameraBarcodeScanner({ onScan, onClose, open, onOpenChange }: CameraBarcodeScannerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [showManual, setShowManual] = useState(false);
  const containerIdRef = useRef('barcode-scanner-container-' + Date.now());
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Html5QrcodeCtorRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try { await s.stop().catch(() => undefined); } catch { /* noop */ }
    try { await s.clear().catch(() => undefined); } catch { /* noop */ }
  }, []);

  const startScanning = useCallback(async () => {
    if (!isMountedRef.current) return;
    setErrorMsg(null);
    setPhase('requesting-permission');
    await stopScanner();

    let Html5Qrcode: any;
    try {
      const mod = await import('html5-qrcode');
      Html5Qrcode = mod.Html5Qrcode;
      Html5QrcodeCtorRef.current = Html5Qrcode;
    } catch (err: any) {
      setErrorMsg('Failed to load scanner library: ' + (err?.message || String(err)));
      setPhase('error');
      return;
    }

    const container = document.getElementById(containerIdRef.current);
    if (!container) {
      setErrorMsg('Scanner container not available. Reopen the dialog.');
      setPhase('error');
      return;
    }
    container.innerHTML = '';

    let instance: Html5QrcodeInstance;
    try {
      instance = new Html5Qrcode(containerIdRef.current, false);
    } catch (err: any) {
      setErrorMsg('Failed to create scanner: ' + (err?.message || String(err)));
      setPhase('error');
      return;
    }

    // Probe for cameras — DOMException names surface here.
    let devices: Array<{ id: string; label: string }> = [];
    try {
      const raw = await Html5Qrcode.getCameras();
      if (!raw || raw.length === 0) {
        setErrorMsg('No camera found. Connect a camera and try again, or use manual entry below.');
        setPhase('error');
        return;
      }
      devices = raw.map((c: any, i: number) => ({ id: c.id, label: c.label || `Camera ${i + 1}` }));
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || /permission/i.test(err?.message || '')) {
        setErrorMsg('Camera permission denied. Allow camera access in your browser settings, then retry.');
      } else if (name === 'NotFoundError') {
        setErrorMsg('No camera found. Connect a camera and try again, or use manual entry below.');
      } else {
        setErrorMsg('Could not enumerate cameras: ' + (err?.message || String(err)));
      }
      setPhase('error');
      return;
    }

    if (!isMountedRef.current) return;
    setCameras(devices);
    // Pick the best default camera:
    //   - Mobile: prefer the back camera (labeled "back", "rear", or "environment")
    //   - Desktop: prefer non-front (no "front", "facetime", "user" in label)
    //   - Fallback: devices[0]
    const findBack = (devs: typeof devices) => {
      const back = devs.find((d) => /back|rear|environment/i.test(d.label) && !/front|user|facetime/i.test(d.label));
      if (back) return back.id;
      const nonFront = devs.find((d) => !/front|user|facetime/i.test(d.label));
      return nonFront?.id ?? devs[0].id;
    };
    setSelectedCameraId(findBack(devices));
    setPhase('starting');

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.777777 };
    try {
      scannerRef.current = instance;
      const cameraToStart = findBack(devices);
      await instance.start(
        cameraToStart,
        config,
        (decodedText: string) => {
          if (!isMountedRef.current) return;
          onScan(decodedText);
          handleClose();
        },
        () => undefined
      );
      if (isMountedRef.current) setPhase('scanning');
    } catch (err: any) {
      const name = err?.name || '';
      const messages: Record<string, string> = {
        NotAllowedError: 'Camera permission denied. Allow camera access and try again.',
        NotFoundError: 'Camera not found. Use manual entry below.',
        NotReadableError: 'Camera is in use by another application. Close it and try again.',
        OverconstrainedError: 'Selected camera does not meet requirements. Try a different camera.',
      };
      setErrorMsg(messages[name] || (err?.message ? `Camera error: ${err.message}` : 'Failed to start camera.'));
      setPhase('error');
      await stopScanner();
    }
  }, [onScan, stopScanner]);

  // Drive lifecycle off the `open` prop with a small delay so the dialog mounts first
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => { if (isMountedRef.current) void startScanning(); }, 300);
      return () => clearTimeout(t);
    } else {
      void stopScanner();
      setPhase('idle');
      setErrorMsg(null);
      setShowManual(false);
      setManualValue('');
    }
  }, [open, startScanning, stopScanner]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tmpId = 'decode-tmp-' + Date.now();
      const tmpDiv = document.createElement('div');
      tmpDiv.id = tmpId;
      tmpDiv.style.display = 'none';
      document.body.appendChild(tmpDiv);
      const inst = new Html5Qrcode(tmpId, false);
      try {
        const text = await inst.scanFile(file, false);
        if (isMountedRef.current) {
          onScan(text);
          handleClose();
        }
      } finally {
        try { await inst.clear(); } catch { /* noop */ }
        tmpDiv.remove();
      }
    } catch (err: any) {
      setErrorMsg('Could not read barcode from image: ' + (err?.message || String(err)));
      setPhase('error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualValue.trim();
    if (!code) return;
    onScan(code);
    handleClose();
  };

  const handleClose = useCallback(() => {
    void stopScanner().finally(() => {
      if (isMountedRef.current) onOpenChange(false);
      onClose?.();
    });
  }, [stopScanner, onOpenChange, onClose]);

  const handleRetry = () => {
    setErrorMsg(null);
    if (open) void startScanning();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Barcode / QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at a barcode or QR code, upload an image, or type the code manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera picker — visible as soon as we know the camera list, so user can switch before scanning starts */}
          {cameras.length > 1 && (phase === 'scanning' || phase === 'starting') && (
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="camera-select" className="text-muted-foreground">Camera:</label>
              <select
                id="camera-select"
                value={selectedCameraId ?? ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCameraId(newId);
                  // Re-start the scanner with the chosen camera id
                  void (async () => {
                    if (!isMountedRef.current) return;
                    await stopScanner();
                    if (!isMountedRef.current) return;
                    const Html5QrcodeCtor = Html5QrcodeCtorRef.current;
                    if (!Html5QrcodeCtor) {
                      setErrorMsg('Scanner library not loaded. Reopen the dialog.');
                      setPhase('error');
                      return;
                    }
                    setPhase('starting');
                    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.777777 };
                    try {
                      const fresh = new Html5QrcodeCtor(containerIdRef.current, false);
                      scannerRef.current = fresh;
                      await fresh.start(
                        newId,
                        config,
                        (decodedText: string) => {
                          if (!isMountedRef.current) return;
                          onScan(decodedText);
                          handleClose();
                        },
                        () => undefined
                      );
                      if (isMountedRef.current) setPhase('scanning');
                    } catch (err: any) {
                      const name = err?.name || '';
                      const messages: Record<string, string> = {
                        NotAllowedError: 'Camera permission denied. Allow camera access and try again.',
                        NotFoundError: 'Camera not found. Use manual entry below.',
                        NotReadableError: 'Camera is in use by another application. Close it and try again.',
                        OverconstrainedError: 'Selected camera does not meet requirements. Try a different camera.',
                      };
                      setErrorMsg(messages[name] || (err?.message ? `Camera error: ${err.message}` : 'Failed to start camera.'));
                      setPhase('error');
                      await stopScanner();
                    }
                  })();
                }}
                className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner container — html5-qrcode injects its own UI here */}
          <div className="relative rounded-lg border bg-black overflow-hidden min-h-[260px]">
            <div
              id={containerIdRef.current}
              className="min-h-[260px] w-full"
            />

            {/* Phase overlays (absolutely positioned, not children of scanner container) */}
            {(phase === 'idle' || phase === 'requesting-permission' || phase === 'starting') && !errorMsg && open && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                <div className="text-center p-6 text-white">
                  <Camera className="h-10 w-10 mx-auto mb-3 opacity-70 animate-pulse" />
                  <p className="text-sm">{phase === 'requesting-permission' ? 'Requesting camera permission…' : 'Starting camera…'}</p>
                </div>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-green-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                  Scanning…
                </div>
              </div>
            )}

            {errorMsg && phase === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4">
                <div className="text-center text-white max-w-xs">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error panel below the camera so the message is always visible */}
          {errorMsg && phase === 'error' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Upload image
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowManual((s) => !s)} className="flex items-center gap-1">
                  <Keyboard className="h-3 w-3" /> Enter manually
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* Manual entry — always available as a fallback */}
          {(showManual || phase === 'error') && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Type or paste barcode/QR code…"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
              />
              <Button type="submit" disabled={!manualValue.trim()}>
                Scan
              </Button>
            </form>
          )}

          {!errorMsg && phase === 'scanning' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1">
                <Upload className="h-3 w-3" /> Upload image
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowManual((s) => !s)} className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" /> Enter manually
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void stopScanner()}
              disabled={phase !== 'scanning'}
              className="flex items-center gap-2"
            >
              <CameraOff className="h-4 w-4" /> Stop Camera
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose} className="flex items-center gap-2">
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
