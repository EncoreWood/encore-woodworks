import { useState, useEffect } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

const groupPatterns = {
  Walls: ["wall"],
  Ceiling: ["ceiling", "roof"],
  Floor: ["floor"],
  Cabinets: ["cabinet"],
  Windows: ["window"],
  Doors: ["door"],
  Counters: ["counter", "countertop"],
};

function categorizeObject(name) {
  const lower = name.toLowerCase();
  for (const [group, patterns] of Object.entries(groupPatterns)) {
    if (patterns.some(p => lower.includes(p))) return group;
  }
  return "Other";
}

export default function VisibilityPanel({ scene, isIPad }) {
  const [objects, setObjects] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [visibility, setVisibility] = useState({});

  // Parse the scene to extract all meshes
  useEffect(() => {
    if (!scene) return;

    const meshes = [];
    scene.traverse((obj) => {
      if (obj.isMesh && obj.name) {
        meshes.push(obj);
      }
    });

    setObjects(meshes);

    // Initialize visibility (all visible)
    const vis = {};
    meshes.forEach((m) => {
      vis[m.uuid] = true;
    });
    setVisibility(vis);

    // Build groups
    const grp = {};
    meshes.forEach((m) => {
      const cat = categorizeObject(m.name);
      if (!grp[cat]) grp[cat] = [];
      grp[cat].push(m);
    });
    setGrouped(grp);

    // Initialize all groups as expanded
    const expanded = {};
    Object.keys(grp).forEach((g) => {
      expanded[g] = true;
    });
    setExpandedGroups(expanded);
  }, [scene]);

  // Toggle visibility of a single object
  const toggleObject = (uuid) => {
    setVisibility((prev) => {
      const newVis = { ...prev, [uuid]: !prev[uuid] };
      // Update Three.js visibility
      const mesh = objects.find((m) => m.uuid === uuid);
      if (mesh) mesh.visible = newVis[uuid];
      return newVis;
    });
  };

  // Toggle visibility of all objects in a group
  const toggleGroup = (groupName) => {
    const groupMeshes = grouped[groupName] || [];
    const allVisible = groupMeshes.every((m) => visibility[m.uuid]);
    const newVis = { ...visibility };
    groupMeshes.forEach((m) => {
      newVis[m.uuid] = !allVisible;
      m.visible = !allVisible;
    });
    setVisibility(newVis);
  };

  // Quick actions
  const hideCeiling = () => {
    const newVis = { ...visibility };
    objects.forEach((m) => {
      if (categorizeObject(m.name) === "Ceiling") {
        newVis[m.uuid] = false;
        m.visible = false;
      }
    });
    setVisibility(newVis);
  };

  const hideWalls = () => {
    const newVis = { ...visibility };
    objects.forEach((m) => {
      if (categorizeObject(m.name) === "Walls") {
        newVis[m.uuid] = false;
        m.visible = false;
      }
    });
    setVisibility(newVis);
  };

  const showAll = () => {
    const newVis = {};
    objects.forEach((m) => {
      newVis[m.uuid] = true;
      m.visible = true;
    });
    setVisibility(newVis);
  };

  if (objects.length === 0) return null;

  // Container styles for iPad drawer vs desktop sidebar
  const containerStyle = isIPad
    ? {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "40vh",
        background: "white",
        borderTop: "1px solid #e2e8f0",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }
    : {
        position: "absolute",
        right: 16,
        top: 80,
        width: 280,
        maxHeight: "calc(100vh - 120px)",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>Visibility</h3>
      </div>

      {/* Quick Actions */}
      <div style={{ flexShrink: 0, padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #f1f5f9" }}>
        {grouped["Ceiling"] && (
          <button
            onClick={hideCeiling}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Hide Ceiling
          </button>
        )}
        {grouped["Walls"] && (
          <button
            onClick={hideWalls}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Hide Front Wall
          </button>
        )}
        <button
          onClick={showAll}
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Show All
        </button>
      </div>

      {/* Object List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {Object.entries(grouped).map(([groupName, meshes]) => (
          <div key={groupName}>
            {/* Group Header */}
            <button
              onClick={() => setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#1e293b",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <ChevronDown
                size={16}
                style={{
                  transform: expandedGroups[groupName] ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, textAlign: "left" }}>{groupName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(groupName);
                }}
                style={{
                  padding: 4,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: meshes.every((m) => visibility[m.uuid]) ? "#475569" : "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {meshes.every((m) => visibility[m.uuid]) ? (
                  <Eye size={16} />
                ) : (
                  <EyeOff size={16} />
                )}
              </button>
            </button>

            {/* Objects in Group */}
            {expandedGroups[groupName] && (
              <div style={{ paddingLeft: 24 }}>
                {meshes.map((mesh) => (
                  <button
                    key={mesh.uuid}
                    onClick={() => toggleObject(mesh.uuid)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#475569",
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleObject(mesh.uuid);
                      }}
                      style={{
                        padding: 2,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: visibility[mesh.uuid] ? "#3b82f6" : "#cbd5e1",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {visibility[mesh.uuid] ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mesh.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}