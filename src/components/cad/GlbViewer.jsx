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
      onClick={() => setMode(m)}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
        mode === m ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a]/90 backdrop-blur border-b border-white/10">
        <span className="text-white font-semibold text-sm truncate max-w-xs">{file.name}</span>
        <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="relative flex-1">
        <div ref={mountRef} className="w-full h-full" />
        {/* Floating controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 shadow-xl">
          {modeBtn("orbit", <RotateCcw className="w-4 h-4" />, "Orbit")}
          {modeBtn("pan", <Move className="w-4 h-4" />, "Pan")}
          {modeBtn("zoom", <ZoomIn className="w-4 h-4" />, "Zoom")}
          <div className="w-px h-10 bg-white/20 mx-1" />
          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-all"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}