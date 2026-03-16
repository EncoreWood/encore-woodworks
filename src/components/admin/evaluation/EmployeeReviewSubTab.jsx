import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import ReviewForm from "./ReviewForm";

export default function EmployeeReviewSubTab() {
  const queryClient = useQueryClient();
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

  const { data: questions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list().then(qs => qs.filter(q => q.is_active)),
  });

  const { data: existingReview } = useQuery({
    queryKey: ["employeeReview", currentUser?.email, reviewPeriod],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const reviews = await base44.entities.EmployeeReview.filter({
        employee_email: currentUser.email,
        review_type: "self",
      });
      const year = new Date().getFullYear();
      return reviews.find(r => r.review_period === reviewPeriod && r.year === year);
    },
    enabled: !!currentUser?.email,
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
    if (!currentUser) return;
    const reviewData = {
      employee_email: currentUser.email,
      employee_name: currentUser.full_name,
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

  if (!currentUser) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Self-Review</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Review Period: {reviewPeriod === "H1" ? "Jan - Jun" : "Jul - Dec"} {new Date().getFullYear()}</p>
        </CardHeader>
        <CardContent>
          {existingReview?.is_submitted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✓ Submitted on {existingReview.submitted_date}</p>
            </div>
          ) : (
            <>
              {!showForm ? (
                <Button onClick={() => setShowForm(true)} className="gap-1">
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
        </CardContent>
      </Card>
    </div>
  );
}