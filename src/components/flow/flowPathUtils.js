export function getZoneCenter(zone) {
  return { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function lineIntersectsZone(p1, p2, zone) {
  const rx = zone.x, ry = zone.y, rw = zone.width, rh = zone.height;
  if (pointInRect(p1.x, p1.y, rx, ry, rw, rh) || pointInRect(p2.x, p2.y, rx, ry, rw, rh)) return true;
  const corners = [
    { x: rx, y: ry }, { x: rx + rw, y: ry },
    { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh },
  ];
  for (let i = 0; i < 4; i++) {
    if (segmentsIntersect(p1, p2, corners[i], corners[(i + 1) % 4])) return true;
  }
  return false;
}

function routeBetween(from, to, obstacles) {
  const blockedBy = obstacles.filter((obs) => lineIntersectsZone(from, to, obs));
  if (blockedBy.length === 0) return [from, to];

  const midH = { x: to.x, y: from.y };
  const midV = { x: from.x, y: to.y };

  const hBlocked = obstacles.filter((obs) =>
    lineIntersectsZone(from, midH, obs) || lineIntersectsZone(midH, to, obs)
  ).length;
  const vBlocked = obstacles.filter((obs) =>
    lineIntersectsZone(from, midV, obs) || lineIntersectsZone(midV, to, obs)
  ).length;

  if (hBlocked <= vBlocked && hBlocked < blockedBy.length) return [from, midH, to];
  if (vBlocked < blockedBy.length) return [from, midV, to];
  return [from, to];
}

export function generateFlowPath(zones, sequenceIds) {
  const seqZones = sequenceIds.map((id) => zones.find((z) => z.id === id)).filter(Boolean);
  if (seqZones.length < 2) return null;

  const obstacles = zones.filter((z) => !sequenceIds.includes(z.id));
  const points = [];
  const stepIndices = [];

  for (let i = 0; i < seqZones.length; i++) {
    const center = getZoneCenter(seqZones[i]);
    stepIndices.push(points.length);
    points.push([+center.x.toFixed(2), +center.y.toFixed(2)]);

    if (i < seqZones.length - 1) {
      const next = getZoneCenter(seqZones[i + 1]);
      const segment = routeBetween(center, next, obstacles);
      for (let j = 1; j < segment.length - 1; j++) {
        points.push([+segment[j].x.toFixed(2), +segment[j].y.toFixed(2)]);
      }
    }
  }

  return { points, auto_generated: true, zone_ids: sequenceIds, step_indices: stepIndices };
}