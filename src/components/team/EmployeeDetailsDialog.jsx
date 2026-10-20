import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  User, Mail, Phone, Calendar, Cake, FileText, ShieldCheck, Pencil, ListTodo,
  Upload, Trash2, DollarSign, CalendarX, Award, Clock, Timer, Loader2
} from "lucide-react";
import EmployeeReviewViewer from "./EmployeeReviewViewer";
import EmployeePtoDialog from "./EmployeePtoDialog";

const SKILL_AREAS = ["Office", "Cut", "Face Frame", "Spray", "Build", "Install", "Custom"];
const SKILL_LABELS = ["No experience", "Beginner", "Basic", "Competent", "Advanced", "Expert"];

export default function EmployeeDetailsDialog({ open, onOpenChange, employee, tasks = [], presenters = [], bathroomCleanings = [], onEdit, onAssignTask, onArchive, archivePending }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  const [skills, setSkills] = useState([]);
  const [skillsEditing, setSkillsEditing] = useState(false);
  const [viewingReview, setViewingReview] = useState(null);
  const [showPto, setShowPto] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && employee) {
      setNotesDraft(employee.notes || "");
      setNotesEditing(false);
      setSkills(SKILL_AREAS.map(a => ({ area: a, level: employee.skill_levels?.find(s => s.area === a)?.level ?? 0 })));
      setSkillsEditing(false);
    }
  }, [open, employee]);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["employeeTime", employee?.id],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_id: employee.id }),
    enabled: open && !!employee
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["employeeReviews", employee?.id],
    queryFn: async () => {
      let r = await base44.entities.EmployeeReview.filter({ employee_id: employee.id });
      if (!r.length && employee.email) {
        r = await base44.entities.EmployeeReview.filter({ employee_email: employee.email });
      }
      return r;
    },
    enabled: open && !!employee
  });

  const { data: reviewQuestions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list(),
    enabled: open
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(employee.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: (error) => toast.error(error.message || "Failed to update employee")
  });

  const isHourly = (employee?.pay_type || "hourly") !== "salary";

  // Days Missed: Mon-Thu workdays this year (up to yesterday) with no time entry of any kind,
  // counting from the later of Jan 1 and the employee's hire date. Hourly employees only.
  const missedDays = useMemo(() => {
    if (!employee || !isHourly) return [];
    const year = new Date().getFullYear();
    const entryDates = new Set(timeEntries.map(e => e.date));
    const startDate = employee.hire_date && employee.hire_date > `${year}-01-01` ? employee.hire_date : `${year}-01-01`;
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    const missed = [];
    for (let d = new Date(startDate + "T12:00:00"); format(d, "yyyy-MM-dd") <= yesterday; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const dateStr = format(d, "yyyy-MM-dd");
      if (dow >= 1 && dow <= 4 && !entryDates.has(dateStr)) missed.push(dateStr);
    }
    return missed;
  }, [employee, timeEntries, isHourly]);

  const submittedReviews = reviews.filter(r => r.is_submitted)
    .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.review_period || "").localeCompare(a.review_period || ""));

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes: notesDraft });
    setNotesEditing(false);
  };

  const handleSaveSkills = () => {
    updateMutation.mutate({ skill_levels: skills });
    setSkillsEditing(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      updateMutation.mutate({ files: [...(employee.files || []), { name: file.name, url: file_url }] });
    } catch (err) {
      console.error("Failed to upload file:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = (index) => {
    updateMutation.mutate({ files: (employee.files || []).filter((_, i) => i !== index) });
  };

  if (!employee) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                {employee.profile_image ? (
                  <img src={employee.profile_image} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900">{employee.full_name}</h3>
                {employee.position && (
                  <p className="text-slate-600 mt-1">{employee.position}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {employee.department && (
                    <Badge className="border-0 bg-amber-100 text-amber-700">
                      {employee.department.charAt(0).toUpperCase() + employee.department.slice(1)}
                    </Badge>
                  )}
                  {isHourly && (
                    <Badge className="border-0 bg-slate-100 text-slate-700">Hourly</Badge>
                  )}
                  {isHourly && missedDays.length > 0 && (
                    <Badge className="border-0 bg-red-100 text-red-700">
                      <CalendarX className="w-3 h-3 mr-1" /> {missedDays.length} day{missedDays.length !== 1 ? "s" : ""} missed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
              <div className="space-y-2">
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${employee.email}`} className="text-slate-600 hover:text-amber-600">
                      {employee.email}
                    </a>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${employee.phone}`} className="text-slate-600 hover:text-amber-600">
                      {employee.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Important Dates</h4>
              <div className="space-y-2">
                {employee.hire_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Hired: {format(new Date(employee.hire_date + "T12:00:00"), "MMMM d, yyyy")}
                    </span>
                  </div>
                )}
                {employee.birthday && (
                  <div className="flex items-center gap-2 text-sm">
                    <Cake className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      Birthday: {format(new Date(employee.birthday + "T12:00:00"), "MMMM d")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pay Rate */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" /> Pay Rate
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <Badge className="border-0 bg-blue-100 text-blue-700 capitalize">
                  {employee.pay_type || "hourly"}
                </Badge>
                <span className="font-semibold text-slate-900">
                  {employee.pay_type === "salary"
                    ? `$${(employee.monthly_salary || 0).toLocaleString()} / month`
                    : `$${(employee.hourly_rate || 0).toFixed(2)} / hour`}
                </span>
              </div>
            </div>

            {/* Days Missed (hourly only) */}
            {isHourly && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-slate-400" /> Days Missed ({new Date().getFullYear()})
                </h4>
                <p className="text-sm text-slate-600">
                  {missedDays.length === 0
                    ? "No missed workdays this year — clocked in every Monday–Thursday."
                    : `${missedDays.length} Monday–Thursday workday${missedDays.length !== 1 ? "s" : ""} this year without a clock-in.`}
                </p>
                {missedDays.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {missedDays.slice().reverse().map(d => (
                      <span key={d} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full border border-red-200">
                        {format(new Date(d + "T12:00:00"), "MMM d")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Skill Levels */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Award className="w-4 h-4 text-slate-400" /> Skill Levels
                </h4>
                {skillsEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setSkills(SKILL_AREAS.map(a => ({ area: a, level: employee.skill_levels?.find(s => s.area === a)?.level ?? 0 })));
                      setSkillsEditing(false);
                    }}>Cancel</Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveSkills} disabled={updateMutation.isPending}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setSkillsEditing(true)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {skills.map((skill) => (
                  <div key={skill.area} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{skill.area}</span>
                    {skillsEditing ? (
                      <Select
                        value={String(skill.level)}
                        onValueChange={(v) => setSkills(prev => prev.map(s => s.area === skill.area ? { ...s, level: Number(v) } : s))}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LABELS.map((label, i) => (
                            <SelectItem key={i} value={String(i)}>{i} — {label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full ${i <= skill.level ? "bg-amber-500" : "bg-slate-200"}`}
                          />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">{SKILL_LABELS[skill.level]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* User Access */}
            {employee.user_email && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">User Access</h4>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-600">
                    {employee.user_role === 'admin' ? 'Admin User' : 'User'} - {employee.user_email}
                  </span>
                </div>
              </div>
            )}

            {/* Files */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Files
              </h4>
              <div className="space-y-2">
                {(employee.files || []).length === 0 && (
                  <p className="text-sm text-slate-400">No files yet.</p>
                )}
                {(employee.files || []).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 flex-1 min-w-0 hover:bg-slate-100 rounded transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                      onClick={() => handleDeleteFile(index)}
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <label className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Add File"}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Notes</h4>
                {notesEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setNotesDraft(employee.notes || ""); setNotesEditing(false); }}>Cancel</Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => { setNotesEditing(true); setNotesDraft(employee.notes || ""); }}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                )}
              </div>
              {notesEditing ? (
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-600"
                  placeholder="Notes about this employee..."
                />
              ) : employee.notes ? (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{employee.notes}</p>
              ) : (
                <p className="text-sm text-slate-400">No notes yet.</p>
              )}
            </div>

            {/* Evaluations */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-slate-400" /> Employee Evaluations
              </h4>
              {submittedReviews.length === 0 ? (
                <p className="text-sm text-slate-400">No submitted evaluations yet.</p>
              ) : (
                <div className="space-y-2">
                  {submittedReviews.map(review => (
                    <button
                      key={review.id}
                      onClick={() => setViewingReview(review)}
                      className="w-full flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                    >
                      <Badge className={`border-0 ${review.review_type === "manager" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {review.review_type === "manager" ? "Manager" : "Self"}
                      </Badge>
                      <span className="text-sm text-slate-800">{review.review_period} {review.year}</span>
                      {review.submitted_date && (
                        <span className="text-xs text-slate-500 ml-auto">
                          Submitted {format(new Date(review.submitted_date + "T12:00:00"), "MMM d, yyyy")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Tasks */}
            {(() => {
              const employeeTasks = tasks.filter(task => task.assignee === employee.full_name);
              const upcomingTasks = employeeTasks.filter(task => !task.completed && new Date(task.date) >= new Date());
              if (upcomingTasks.length === 0) return null;
              return (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Tasks</h4>
                  <div className="space-y-2">
                    {upcomingTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">{task.task}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(new Date(task.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Calendar Events */}
            {(() => {
              const upcomingPresenters = presenters.filter(
                p => p.presenter_name === employee.full_name && new Date(p.date) >= new Date()
              );
              const upcomingCleanings = bathroomCleanings.filter(
                c => c.assigned_to?.includes(employee.full_name) && new Date(c.date) >= new Date()
              );
              if (upcomingPresenters.length === 0 && upcomingCleanings.length === 0) return null;
              return (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Calendar Events</h4>
                  <div className="space-y-2">
                    {upcomingPresenters.slice(0, 3).map((presenter) => (
                      <div key={presenter.id} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                        <User className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">Morning Meeting Presenter</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(new Date(presenter.date), "MMM d, yyyy")}
                            {presenter.time && ` at ${presenter.time}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {upcomingCleanings.slice(0, 3).map((cleaning) => (
                      <div key={cleaning.id} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">Bathroom Cleaning</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(new Date(cleaning.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="border-t pt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(employee);
                  }}
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onAssignTask(employee);
                  }}
                  className="flex-1"
                >
                  <ListTodo className="w-4 h-4 mr-2" />
                  Assign Task
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/TimeSheet?employee_id=${employee.id}`)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Timesheet
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPto(true)}
                >
                  <Timer className="w-4 h-4 mr-2" />
                  PTO
                </Button>
              </div>
              <Button
                variant="outline"
                className={employee.archived ? "text-emerald-600 border-emerald-300 hover:bg-emerald-50" : "text-red-600 border-red-300 hover:bg-red-50"}
                disabled={archivePending}
                onClick={() => {
                  if (confirm(`${employee.archived ? 'Restore' : 'Remove'} ${employee.full_name}?${
                    !employee.archived ? ' This will remove them from future meeting rotations and cleaning schedules. Their time cards will remain archived and accessible.' : ''
                  }`)) {
                    onArchive(employee);
                  }
                }}
              >
                {archivePending ? "Processing..." : employee.archived ? "Restore Employee" : "Remove from Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EmployeeReviewViewer
        open={!!viewingReview}
        onOpenChange={(o) => { if (!o) setViewingReview(null); }}
        review={viewingReview}
      />

      <EmployeePtoDialog
        open={showPto}
        onOpenChange={setShowPto}
        employee={employee}
      />
    </>
  );
}