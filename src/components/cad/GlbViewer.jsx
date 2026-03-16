import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Move, ZoomIn } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function GlbViewer({ file, onClose }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const [mode, setMode] = useState("orbit"); // orbit | pan | zoom

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000);
    camera.position.set(5, 4, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      file.url,
      (gltf) => {
        const model = gltf.scene;
        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        model.position.sub(center);
        scene.add(model);

        // Fit camera
        camera.position.set(maxDim * 1.5, maxDim, maxDim * 1.5);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => console.error("GLB load error:", err)
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
      const nw = container.clientWidth, nh = container.clientHeight;
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
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
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
      onPointerDown={() => setMode(m)}
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
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <span className="text-slate-900 font-semibold text-sm truncate max-w-xs">{file.name}</span>
        <span className="text-slate-400 text-xs hidden sm:block">1-finger rotate · 2-finger zoom/pan</span>
        <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-900 h-9 w-9 p-0" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="relative flex-1">
        <div ref={mountRef} className="w-full h-full" />
        {/* Floating controls — large touch targets for iPad */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-slate-200 shadow-xl">
          {modeBtn("orbit", <RotateCcw className="w-5 h-5" />, "Orbit")}
          {modeBtn("pan", <Move className="w-5 h-5" />, "Pan")}
          {modeBtn("zoom", <ZoomIn className="w-5 h-5" />, "Zoom")}
          <div className="w-px h-12 bg-slate-200 mx-1" />
          <button
            onPointerDown={onClose}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-all select-none touch-manipulation"
          >
            <X className="w-5 h-5" />
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}