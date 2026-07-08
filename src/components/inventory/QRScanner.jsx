import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScanLine, X, Package } from "lucide-react";

/**
 * Native browser QR scanner using getUserMedia + BarcodeDetector API.
 * No external packages required. Works on Chrome/Edge Android and Safari iOS 15.4+.
 */
export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      // Check for BarcodeDetector support
      if (!("BarcodeDetector" in window)) {
        setSupported(false);
        setError("Your browser doesn't support in-app QR scanning. Please use your device's camera app to scan the next code.");
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch (e) {
        setSupported(false);
        setError("QR scanning isn't supported on this device. Please use your device's camera app.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        detectLoop();
      } catch (e) {
        console.error("Camera error:", e);
        if (e.name === "NotAllowedError") {
          setError("Camera access was denied. Please allow camera permissions in your browser settings, or use your device's camera app to scan.");
        } else {
          setError("Unable to access camera. Please use your device's camera app to scan the next QR code.");
        }
      }
    };

    const detectLoop = async () => {
      if (cancelled || !videoRef.current || !detectorRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes && codes.length > 0) {
          const raw = codes[0].rawValue;
          cleanup();
          onScan(raw);
          return;
        }
      } catch (e) {
        // detection errors are transient, keep going
      }
      rafRef.current = requestAnimationFrame(detectLoop);
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera feed */}
      <div className="relative flex-1 overflow-hidden">
        {supported && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Scan overlay frame */}
        {supported && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-white/70 rounded-2xl shadow-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg -translate-x-1 -translate-y-1" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg translate-x-1 -translate-y-1" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg -translate-x-1 translate-y-1" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg translate-x-1 translate-y-1" />
            </div>
          </div>
        )}
        {/* Error / unsupported state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <Package className="w-12 h-12 text-white/30 mb-3" />
            <p className="text-white text-sm font-medium max-w-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-black px-6 py-6 pb-10 flex flex-col items-center gap-3">
        <p className="text-white/80 text-sm font-medium">
          {supported ? "Point your camera at a QR code label" : "Camera unavailable"}
        </p>
        <Button
          onClick={handleClose}
          variant="outline"
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}