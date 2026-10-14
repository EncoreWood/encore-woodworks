import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Parse a legacy dimension list string ("16 9/16 & 5 13/16" or "23 1/4, 11 7/8")
function splitDimList(str) {
  if (!str) return [];
  return String(str).split(/\s*(?:&|,)\s*/).filter(Boolean);
}

// Normalize an incoming report payload to per-size rows
function toRows(sizeBreakdown, quantity, width, length) {
  const rows = (Array.isArray(sizeBreakdown) ? sizeBreakdown : [])
    .filter(r => r && (r.qty || r.width || r.length))
    .map(r => ({ qty: r.qty ?? null, width: r.width ?? null, length: r.length ?? null }));
  if (rows.length > 0) return rows;
  if (quantity != null || width || length) {
    return [{ qty: quantity ?? null, width: width || null, length: length || null }];
  }
  return [];
}

// Merge existing + incoming rows, combining identical sizes (qty sums)
function mergeRows(existingRows, incomingRows) {
  const merged = [];
  const key = (r) => `${(r.width || '').toLowerCase()}|${(r.length || '').toLowerCase()}`;
  const existing = new Map();
  for (const r of existingRows) existing.set(key(r), r);
  for (const r of incomingRows) {
    const match = existing.get(key(r));
    if (match) {
      match.qty = (parseFloat(match.qty) || 0) + (parseFloat(r.qty) || 0);
    } else {
      merged.push({ ...r });
    }
  }
  return [...existingRows, ...merged];
}

function rowsTotalQty(rows) {
  const known = rows.filter(r => r.qty != null);
  if (known.length === 0) return null;
  return known.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);
}

// Distinct joined legacy strings, e.g. widths "13 13/16 & 5 13/16"
function joinedDims(rows, field) {
  const vals = [];
  for (const r of rows) {
    const v = (r[field] || '').trim();
    if (v && !vals.includes(v)) vals.push(v);
  }
  return vals.join(' & ') || null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    production_item_id,
    production_item_name,
    project_name,
    room,
    cabinet,
    item_description,
    notes,
    pickup_type,
    width,
    length,
    quantity,
    size_breakdown,
    material,
    finish,
  } = body;

  if (!item_description?.trim()) {
    return Response.json({ error: 'item_description is required' }, { status: 400 });
  }

  const reporterName = user.full_name || user.email || 'Unknown';
  const incomingRows = toRows(size_breakdown, quantity, width, length);

  // Check for an existing open/ordered report matching this card + room + cabinet + description.
  // Different sizes on the same card merge into the same record (appended per-size rows).
  const existing = await base44.asServiceRole.entities.MissingItem.filter({
    production_item_id: production_item_id || null,
  });

  const match = existing.find(m =>
    !m.archived &&
    (m.status === 'Open' || m.status === 'Ordered') &&
    (m.room_name || '').toLowerCase() === (room || '').toLowerCase() &&
    (m.cabinet_name || '').toLowerCase() === (cabinet || '').toLowerCase() &&
    (m.item_description || '').toLowerCase() === item_description.trim().toLowerCase()
  );

  if (match) {
    // Build the existing record's rows (stored breakdown, or legacy width/length strings)
    let existingRows = toRows(match.size_breakdown, match.quantity, match.width, match.length);
    if (existingRows.length === 0) {
      const widths = splitDimList(match.width);
      const lengths = splitDimList(match.length);
      const n = Math.max(widths.length, lengths.length);
      for (let i = 0; i < n; i++) {
        existingRows.push({
          qty: null,
          width: widths[i] ?? (widths.length ? widths[widths.length - 1] : ''),
          length: lengths[i] ?? (lengths.length ? lengths[lengths.length - 1] : ''),
        });
      }
    }

    const sizeKey = (r) => `${(r.width || '').toLowerCase()}|${(r.length || '').toLowerCase()}`;
    const knownSizes = new Set(existingRows.map(sizeKey));
    const newRows = incomingRows.filter(r => !knownSizes.has(sizeKey(r)));
    const confirmed = JSON.parse(match.confirmed_by || '[]');
    const alreadyReporter = match.reported_by === reporterName || confirmed.includes(reporterName);

    // Every incoming size already exists on this record: it's a confirmation, not new qty
    if (newRows.length === 0 && incomingRows.length > 0) {
      if (alreadyReporter) {
        return Response.json({
          result: 'already_confirmed',
          reported_by: match.reported_by,
        });
      }

      confirmed.push(reporterName);
      await base44.asServiceRole.entities.MissingItem.update(match.id, {
        confirmed_by: JSON.stringify(confirmed),
      });

      return Response.json({
        result: 'confirmed',
        reported_by: match.reported_by,
      });
    }

    // New sizes on the same card: merge into one record, keep every size row
    const merged = mergeRows(existingRows, newRows);
    const hadPerSizeQty = existingRows.some(r => r.qty != null);
    const total = (!hadPerSizeQty && match.quantity != null)
      ? (match.quantity || 0) + (rowsTotalQty(merged) || 0)
      : rowsTotalQty(merged);
    const updates = {
      size_breakdown: merged,
      quantity: total ?? match.quantity ?? null,
      width: joinedDims(merged, 'width') ?? match.width ?? null,
      length: joinedDims(merged, 'length') ?? match.length ?? null,
      material: match.material || material || null,
      finish: match.finish || finish || null,
    };
    if (!alreadyReporter) {
      confirmed.push(reporterName);
      updates.confirmed_by = JSON.stringify(confirmed);
    }
    await base44.asServiceRole.entities.MissingItem.update(match.id, updates);

    return Response.json({
      result: 'merged',
      id: match.id,
      reported_by: match.reported_by,
    });
  }

  // Create new report
  const newItem = await base44.asServiceRole.entities.MissingItem.create({
    production_item_id: production_item_id || null,
    production_item_name: production_item_name || null,
    project_name: project_name || null,
    room_name: room || null,
    cabinet_name: cabinet || null,
    item_description: item_description.trim(),
    description: notes || null,
    pickup_type: pickup_type || null,
    width: width || null,
    length: length || null,
    quantity: quantity ?? null,
    size_breakdown: incomingRows.length > 0 ? incomingRows : null,
    material: material || null,
    finish: finish || null,
    reported_by: reporterName,
    reported_at: new Date().toISOString(),
    confirmed_by: '[]',
    status: 'Open',
  });

  return Response.json({ result: 'created', id: newItem.id });
});