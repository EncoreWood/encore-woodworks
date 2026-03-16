import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function GlbViewer({ file, onClose }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
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

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f1a]/90 backdrop-blur border-b border-white/10">
        <span className="text-white font-semibold text-sm truncate max-w-xs">{file.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Drag to rotate · Scroll to zoom · Right-click to pan</span>
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div ref={mountRef} className="flex-1" />
    </div>
  );
}