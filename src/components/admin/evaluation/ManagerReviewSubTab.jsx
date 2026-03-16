import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ReviewForm from "./ReviewForm";

export default function ManagerReviewSubTab() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [reviewPeriod] = useState(() => {
    const month = new Date().getMonth();
    return month < 6 ? "H1" : "H2";
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list().then(qs => qs.filter(q => q.is_active)),
  });

  const { data: managerReview } = useQuery({
    queryKey: ["managerReview", selectedEmployee, reviewPeriod],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      const emp = employees.find(e => e.id === selectedEmployee);
      if (!emp) return null;
      try {
        const reviews = await base44.entities.EmployeeReview.list();
        const year = new Date().getFullYear();
        return reviews.find(r => 
          r.employee_email === emp.email && 
          r.review_type === "manager" && 
          r.review_period === reviewPeriod && 
          r.year === year
        );
      } catch (e) {
        console.error("Error fetching manager review:", e);
        return null;
      }
    },
    enabled: !!selectedEmployee,
  });

  const { data: selfReview } = useQuery({
    queryKey: ["selfReview", selectedEmployee, reviewPeriod],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      const emp = employees.find(e => e.id === selectedEmployee);
      if (!emp) return null;
      try {
        const reviews = await base44.entities.EmployeeReview.list();
        const year = new Date().getFullYear();
        return reviews.find(r => 
          r.employee_email === emp.email && 
          r.review_type === "self" && 
          r.review_period === reviewPeriod && 
          r.year === year
        );
      } catch (e) {
        console.error("Error fetching self review:", e);
        return null;
      }
    },
    enabled: !!selectedEmployee,
  });

  const createReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeReview.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerReview"] });
      setShowForm(false);
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeReview.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerReview"] });
      setShowForm(false);
    },
  });

  const handleSubmit = (answers) => {
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;

    const reviewData = {
      employee_email: emp.email,
      employee_name: emp.full_name,
      review_type: "manager",
      review_period: reviewPeriod,
      year: new Date().getFullYear(),
      answers: answers,
      is_submitted: true,
      submitted_date: format(new Date(), "yyyy-MM-dd"),
    };

    if (managerReview) {
      updateReviewMutation.mutate({ id: managerReview.id, ...reviewData });
    } else {
      createReviewMutation.mutate(reviewData);
    }
  };

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="space-y-6">
      {!showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Manager Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
              </SelectContent>
            </Select>

            {selectedEmployeeObj && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Employee: <span className="font-medium text-slate-900">{selectedEmployeeObj.full_name}</span></p>
                <p className="text-sm text-slate-600">Period: {reviewPeriod === "H1" ? "Jan - Jun" : "Jul - Dec"} {new Date().getFullYear()}</p>
              </div>
            )}

            {selectedEmployee && (managerReview?.is_submitted && selfReview?.is_submitted) && (
              <Button onClick={() => setShowComparison(true)} className="w-full gap-1">
                Compare Reviews
              </Button>
            )}

            {selectedEmployee && !showForm && (
              <Button onClick={() => setShowForm(true)} className="w-full gap-1">
                {managerReview ? "Edit Review" : "Add Manager Review"}
              </Button>
            )}

            {showForm && (
              <ReviewForm
                questions={questions}
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                initialAnswers={managerReview?.answers}
              />
            )}
          </CardContent>
        </Card>
      )}

      {showComparison && selfReview && managerReview && (
        <ComparisonView
          selfReview={selfReview}
          managerReview={managerReview}
          questions={questions}
          employeeName={selectedEmployeeObj?.full_name}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

function ComparisonView({ selfReview, managerReview, questions, employeeName, onClose }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Review Comparison: {employeeName}</CardTitle>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map(q => {
          const selfAnswer = selfReview.answers?.[q.id];
          const managerAnswer = managerReview.answers?.[q.id];
          const isNumeric = ["Rating 1-5", "Rating 1-10"].includes(q.question_type);
          const hasGap = isNumeric && selfAnswer && managerAnswer && Math.abs(selfAnswer - managerAnswer) > 2;

          return (
            <div key={q.id} className={`p-4 border rounded-lg ${hasGap ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <p className="font-medium text-slate-900 mb-2">{q.question_text}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Your Answer</p>
                  <p className="font-bold text-slate-900">{selfAnswer || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Manager's Answer</p>
                  <p className="font-bold text-slate-900">{managerAnswer || "—"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}