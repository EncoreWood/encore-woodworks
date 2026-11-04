import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { denverDateStr } from "@/lib/stagePoints";
import {
  PACING_SECTION, normalizePacingConfig, resolvePacingTargets, withPacingTargets,
} from "@/lib/pacingSettings";

export const PACING_TARGETS_KEY = ["pacingTargets"];

async function loadPacingConfig() {
  const rows = await base44.entities.DashboardSettings.filter({ section: PACING_SECTION });
  const record = rows[0] || null;
  let stored = {};
  try {
    stored = record?.value ? JSON.parse(record.value) : {};
  } catch {
    stored = {};
  }
  return { recordId: record?.id || null, config: normalizePacingConfig(stored) };
}

// One cached read feeds every chart and label, so a save repaints them all at once.
export default function usePacingTargets() {
  const queryClient = useQueryClient();
  const todayStr = denverDateStr(new Date());

  const query = useQuery({
    queryKey: PACING_TARGETS_KEY,
    queryFn: loadPacingConfig,
    staleTime: 60_000,
  });

  const config = query.data?.config || normalizePacingConfig();
  const targetsFor = useCallback((dateStr) => resolvePacingTargets(config, dateStr), [config]);
  const today = targetsFor(todayStr);

  const mutation = useMutation({
    mutationFn: async ({ target, minimum }) => {
      const snapshot = query.data || await loadPacingConfig();
      const dayStr = denverDateStr(new Date());
      const next = withPacingTargets(snapshot.config, { target, minimum }, dayStr);
      const value = JSON.stringify(next);
      let recordId = snapshot.recordId;
      if (recordId) {
        await base44.entities.DashboardSettings.update(recordId, { value });
      } else {
        const created = await base44.entities.DashboardSettings.create({
          section: PACING_SECTION, value, visible_to_admins: true, visible_to_users: true,
        });
        recordId = created?.id || null;
      }
      return { recordId, config: next };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(PACING_TARGETS_KEY, saved);
      queryClient.invalidateQueries({ queryKey: PACING_TARGETS_KEY });
    },
  });

  return {
    config,
    todayStr,
    target: today.target,
    minimum: today.minimum,
    targetsFor,
    saveTargets: (values) => mutation.mutateAsync(values),
    isSaving: mutation.isPending,
    isLoading: query.isLoading,
  };
}