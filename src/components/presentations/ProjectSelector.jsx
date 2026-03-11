import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";

export default function ProjectSelector({ onProjectSelected }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [linkedSource, setLinkedSource] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list(),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["bids"],
    queryFn: () => base44.entities.Bid.list(),
  });

  const filteredProjects = projects.filter(
    (p) =>
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = selectedProjectId ? filteredProjects.find((p) => p.id === selectedProjectId) : null;
  const proposalForProject = selectedProject ? proposals.find((p) => p.project_id === selectedProject.id) : null;
  const bidForProject = selectedProject ? bids.find((b) => b.project_id === selectedProject.id) : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const presentation = {
        project_id: selectedProject.id,
        project_name: selectedProject.project_name,
        client_name: selectedProject.client_name,
        address: selectedProject.address,
        cabinet_style: selectedProject.cabinet_style,
        wood_species: selectedProject.wood_species,
        finish: selectedProject.finish,
        status: "draft",
      };

      if (linkedSource === "proposal" && proposalForProject) {
        presentation.proposal_id = proposalForProject.id;
      } else if (linkedSource === "bid" && bidForProject) {
        presentation.bid_id = bidForProject.id;
      }

      const created = await base44.entities.Presentation.create(presentation);

      // Auto-generate slides from proposal/bid
      if (linkedSource === "proposal" && proposalForProject?.rooms) {
        for (let i = 0; i < proposalForProject.rooms.length; i++) {
          const room = proposalForProject.rooms[i];
          await base44.entities.PresentationSlide.create({
            presentation_id: created.id,
            room_name: room.room_name,
            notes: room.items_of_recognition || "",
            sort_order: i,
          });
        }
      } else if (linkedSource === "bid" && bidForProject?.rooms) {
        for (let i = 0; i < bidForProject.rooms.length; i++) {
          const room = bidForProject.rooms[i];
          await base44.entities.PresentationSlide.create({
            presentation_id: created.id,
            room_name: room.room_name,
            notes: "",
            sort_order: i,
          });
        }
      }

      return created;
    },
    onSuccess: (pres) => {
      onProjectSelected(pres);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Search Project</label>
        <Input
          placeholder="Project or client name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedProjectId("");
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a project..." />
          </SelectTrigger>
          <SelectContent>
            {filteredProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.project_name} - {project.client_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProject && (proposalForProject || bidForProject) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Link to Document</label>
          <Select value={linkedSource || ""} onValueChange={setLinkedSource}>
            <SelectTrigger>
              <SelectValue placeholder="Optional: link to proposal or bid..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {proposalForProject && <SelectItem value="proposal">Proposal</SelectItem>}
              {bidForProject && <SelectItem value="bid">Bid</SelectItem>}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Selecting a proposal or bid will auto-generate slides from its rooms.
          </p>
        </div>
      )}

      <Button
        onClick={() => createMutation.mutate()}
        disabled={!selectedProject || createMutation.isPending}
        className="w-full bg-amber-600 hover:bg-amber-700"
      >
        {createMutation.isPending ? "Creating..." : "Create Presentation"}
      </Button>
    </div>
  );
}