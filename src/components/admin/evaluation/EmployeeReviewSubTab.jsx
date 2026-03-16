import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ReviewForm from "./ReviewForm";

export default function EmployeeReviewSubTab() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [reviewPeriod] = useState(() => {
    const month = new Date().getMonth();
    return month < 6 ? "H1" : "H2";
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list().then(qs => qs.filter(q => q.is_active)),
  });

  const { data: existingReview } = useQuery({
    queryKey: ["employeeReview", selectedEmployee, reviewPeriod],
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
        console.error("Error fetching reviews:", e);
        return null;
      }
    },
    enabled: !!selectedEmployee,
  });

  const createReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeReview.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeReview"] });
      setShowForm(false);
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeReview.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeReview"] });
      setShowForm(false);
    },
  });

  const handleSubmit = (answers, isDraft) => {
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;
    const reviewData = {
      employee_email: emp.email,
      employee_name: emp.full_name,
      review_type: "self",
      review_period: reviewPeriod,
      year: new Date().getFullYear(),
      answers: answers,
      is_submitted: !isDraft,
      submitted_date: !isDraft ? format(new Date(), "yyyy-MM-dd") : null,
    };

    if (existingReview) {
      updateReviewMutation.mutate({ id: existingReview.id, ...reviewData });
    } else {
      createReviewMutation.mutate(reviewData);
    }
  };

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee Self-Review</CardTitle>
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

          {selectedEmployee && (
            <>
              {existingReview?.is_submitted ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✓ Submitted on {existingReview.submitted_date}</p>
                </div>
              ) : (
                <>
                  {!showForm ? (
                    <Button onClick={() => setShowForm(true)} className="w-full gap-1">
                      {existingReview ? "Edit Review" : "Start Review"}
                    </Button>
                  ) : (
                    <ReviewForm
                      questions={questions}
                      onSubmit={handleSubmit}
                      onCancel={() => setShowForm(false)}
                      initialAnswers={existingReview?.answers}
                    />
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}