import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Move, ZoomIn } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import VisibilityPanel from "./VisibilityPanel";

function GlbViewerInner({ file, onClose }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const [mode, setMode] = useState("orbit");
  const [loading, setLoading] = useState(true);
  const [isIPad, setIsIPad] = useState(false);

  // Detect iPad on mount
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIPad(/iPad|Mac OS/.test(ua) && navigator.maxTouchPoints > 2);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf0f0f0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100000);
    camera.position.set(5, 4, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls — always orbit by default on both mouse and touch
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      file.url,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        model.position.sub(center);
        scene.add(model);

        camera.position.set(maxDim * 1.5, maxDim * 0.8, maxDim * 1.5);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        setLoading(false);
      }
    );

    // Animate
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [file.url]);

  // Apply mode to controls
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    if (mode === "orbit") {
      c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    } else if (mode === "pan") {
      c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
      c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    } else if (mode === "zoom") {
      c.mouseButtons = { LEFT: THREE.MOUSE.DOLLY, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      c.touches = { ONE: THREE.TOUCH.DOLLY_PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    }
  }, [mode]);

  const modeBtn = (m, icon, label) => (
    <button
      onPointerDown={(e) => { e.stopPropagation(); setMode(m); }}
      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none touch-manipulation ${
        mode === m
          ? "bg-slate-800 text-white shadow-md"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 active:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        background: "#f0f0f0",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
          {file.name}
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }} className="hidden sm:block">
          Left-drag rotate · Right-drag pan · Scroll zoom
        </span>
        <button
          onClick={onClose}
          style={{ padding: "6px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
        >
          <X size={20} />
        </button>
      </div>

      {/* 3D canvas area */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div ref={mountRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" }}>
            <div style={{ textAlign: "center", color: "#64748b" }}>
              <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTop: "4px solid #475569", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14 }}>Loading 3D model...</div>
            </div>
          </div>
        )}

        {/* Floating toolbar — always visible, fixed inside the viewer */}
        <div
          style={{
            position: "absolute",
            bottom: isIPad ? 280 : 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: 20,
            padding: "12px 16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
          {modeBtn("orbit", <RotateCcw size={20} />, "Orbit")}
          {modeBtn("pan", <Move size={20} />, "Pan")}
          {modeBtn("zoom", <ZoomIn size={20} />, "Zoom")}
          <div style={{ width: 1, height: 48, background: "#e2e8f0", margin: "0 4px" }} />
          <button
            onPointerDown={onClose}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#ef4444", fontSize: 14, fontWeight: 500, cursor: "pointer", touchAction: "manipulation" }}
          >
            <X size={20} />
            Exit
          </button>
        </div>

        {/* Visibility Panel */}
        {sceneRef.current && <VisibilityPanel scene={sceneRef.current} isIPad={isIPad} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GlbViewer({ file, onClose }) {
  return createPortal(<GlbViewerInner file={file} onClose={onClose} />, document.body);
}