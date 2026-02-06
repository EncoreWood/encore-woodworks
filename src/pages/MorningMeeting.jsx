import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User, Calendar, AlertCircle, Coffee, Sun, Target, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const motivationalQuotes = [
  "Excellence is not a skill, it's an attitude.",
  "Quality is not an act, it is a habit.",
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Do what you do so well that they will want to see it again.",
  "Strive for progress, not perfection.",
  "Great things are done by a series of small things brought together.",
  "The only way to do great work is to love what you do.",
  "Craftsmanship is a tradition of excellence.",
  "Precision and passion create perfection.",
  "Every project is an opportunity to exceed expectations.",
  "Build it right, build it once.",
  "Take pride in every cut, every joint, every finish.",
  "Attention to detail makes all the difference."
];

const agendaSections = [
  {
    id: "urgent",
    title: "🚨 Urgent - Needs Immediate Attention",
    icon: AlertCircle,
    bgColor: "bg-gradient-to-r from-red-50 to-orange-50",
    borderColor: "border-l-red-500",
    textColor: "text-red-700"
  },
  {
    id: "today",
    title: "☀️ Today's Focus - Installing & Ready",
    icon: Target,
    bgColor: "bg-gradient-to-r from-amber-50 to-yellow-50",
    borderColor: "border-l-amber-500",
    textColor: "text-amber-700"
  },
  {
    id: "production",
    title: "⚒️ In Production This Week",
    icon: Coffee,
    bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
    borderColor: "border-l-blue-500",
    textColor: "text-blue-700"
  },
  {
    id: "new",
    title: "✨ New Opportunities",
    icon: Sun,
    bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
    borderColor: "border-l-green-500",
    textColor: "text-green-700"
  }
];

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-slate-100 text-slate-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

export default function MorningMeeting() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  // Get daily quote based on day of year
  const getDailyQuote = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  };

  const getProjectsBySection = (sectionId) => {
    switch (sectionId) {
      case "urgent":
        return projects.filter((p) => p.priority === "urgent" && p.status !== "completed");
      case "today":
        return projects.filter((p) => ["ready_for_install", "installing"].includes(p.status));
      case "production":
        return projects.filter((p) => p.status === "in_production");
      case "new":
        return projects.filter((p) => p.status === "inquiry");
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md mb-4">
            <Coffee className="w-6 h-6 text-amber-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Daily Morning Meeting
            </h1>
          </div>
          <p className="text-lg text-slate-600 font-medium mb-4">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-6 shadow-md border-l-4 border-amber-500">
            <p className="text-xl font-semibold text-slate-700 italic">
              "{getDailyQuote()}"
            </p>
          </div>
        </div>

        {/* Agenda Sections */}
        <div className="space-y-6">
          {agendaSections.map((section) => {
            const sectionProjects = getProjectsBySection(section.id);
            const Icon = section.icon;

            return (
              <Card
                key={section.id}
                className={`overflow-hidden border-l-4 ${section.borderColor} shadow-lg hover:shadow-xl transition-all`}
              >
                <div className={`p-4 ${section.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${section.textColor}`} />
                      <h2 className={`text-xl font-bold ${section.textColor}`}>
                        {section.title}
                      </h2>
                    </div>
                    <Badge className={`text-base px-4 py-1 ${section.textColor} bg-white`}>
                      {sectionProjects.length}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  {sectionProjects.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>All clear!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sectionProjects.map((project) => (
                        <Link
                          key={project.id}
                          to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                        >
                          <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-slate-900">
                                    {project.project_name}
                                  </h3>
                                  <Badge className={`${priorityColors[project.priority]} border-0`}>
                                    {project.priority}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>{project.client_name}</span>
                                  </div>
                                  {project.estimated_completion && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>Due: {format(new Date(project.estimated_completion), "MMM d")}</span>
                                    </div>
                                  )}
                                  {project.rooms && project.rooms.length > 0 && (
                                    <span className="text-slate-500">
                                      {project.rooms.length} room{project.rooms.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}