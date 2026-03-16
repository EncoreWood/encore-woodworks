import * as THREE from "three";

// Detect geometry type based on bounding box dimensions
export function detectGeometryType(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const width = size.x;
  const height = size.y;
  const depth = size.z;
  
  const dimensions = [width, height, depth].sort((a, b) => a - b);
  const [smallest, medium, largest] = dimensions;
  
  // Very conservative detection - only very clear geometry
  const flatThreshold = 0.05; // Even flatter
  const flatRatio = smallest / largest;
  
  // Check if it's an extremely flat plane
  if (flatRatio < flatThreshold) {
    // Determine orientation - must be very obvious
    if (Math.abs(height - smallest) < 0.001 && height < 0.5 && largest > 5) {
      // Very flat in Y direction at bottom, large area
      return "Floor";
    } else if (Math.abs(height - smallest) < 0.001 && height > 2 && largest > 5) {
      // Very flat in Y direction at top, large area
      return "Ceiling";
    } else if ((Math.abs(width - smallest) < 0.001 || Math.abs(depth - smallest) < 0.001) && height > 2 && largest > 5) {
      // Very thin wall-like, tall, large area
      return "Wall";
    }
  }
  
  // Check for cabinet proportions (taller than wide, reasonable depth)
  const heightToWidth = height / width;
  const depthToWidth = depth / width;
  if (heightToWidth > 1.8 && heightToWidth < 3.5 && depthToWidth > 0.5 && depthToWidth < 1.2 && width > 0.3 && height > 1.5) {
    return "Cabinet";
  }
  
  return null;
}

// Detect all geometries in a scene
export function detectAllGeometries(scene) {
  const detected = {};
  scene.traverse((obj) => {
    if (obj.isMesh && obj.name) {
      const type = detectGeometryType(obj);
      if (type) {
        detected[obj.uuid] = type;
      }
    }
  });
  return detected;
}

// Load labels from localStorage
export function loadLabelsFromStorage(fileUrl) {
  try {
    const key = `glb_labels_${btoa(fileUrl)}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

// Save labels to localStorage
export function saveLabelsToStorage(fileUrl, labels) {
  try {
    const key = `glb_labels_${btoa(fileUrl)}`;
    localStorage.setItem(key, JSON.stringify(labels));
  } catch (e) {
    console.error("Failed to save labels:", e);
  }
}