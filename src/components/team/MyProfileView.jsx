import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, UserCircle } from "lucide-react";
import EmployeeCard from "./EmployeeCard";
import EmployeeDetailsDialog from "./EmployeeDetailsDialog";
import { findMyEmployee } from "@/lib/findMyEmployee";

// Profile view shown to non-admin users: only their own employee card.
export default function MyProfileView() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setUserLoaded(true));
  }, []);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.MeetingTask.list("-date")
  });

  const { data: presenters = [] } = useQuery({
    queryKey: ["presenters"],
    queryFn: () => base44.entities.MeetingPresenter.list("-date")
  });

  const { data: bathroomCleanings = [] } = useQuery({
    queryKey: ["bathroomCleanings"],
    queryFn: () => base44.entities.BathroomCleaning.list("-date")
  });

  if (isLoading || !userLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const matched = currentUser ? findMyEmployee(employees, currentUser.email) : null;
  const me = matched && !matched.archived ? matched : null;

  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 flex items-center justify-center px-4">
        <Card className="p-12 bg-white border-0 shadow-sm text-center max-w-md">
          <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No profile found</h3>
          <p className="text-slate-500">
            No employee card is linked to {currentUser?.email || "your account"}. Ask an admin to link your account to your employee card.
          </p>
        </Card>
      </div>
    );
  }

  const myTasks = tasks.filter(t => t.assignee === me.full_name && !t.completed);
  const myPresentations = presenters.filter(p => p.presenter_name === me.full_name);
  const myCleanings = bathroomCleanings.filter(c => c.assigned_to?.includes(me.full_name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-slate-500 mt-1">Your personal team card</p>
        </div>

        <div className="max-w-md">
          <EmployeeCard
            employee={me}
            tasks={myTasks}
            presentations={myPresentations}
            cleanings={myCleanings}
            onClick={() => setShowDetails(true)}
          />
        </div>

        <EmployeeDetailsDialog
          open={showDetails}
          onOpenChange={setShowDetails}
          employee={me}
          tasks={tasks}
          presenters={presenters}
          bathroomCleanings={bathroomCleanings}
        />
      </div>
    </div>
  );
}