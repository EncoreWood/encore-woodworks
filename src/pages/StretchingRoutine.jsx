import { Clock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StretchingRoutine() {
  const stretches = [
    {
      name: "Neck Rolls",
      duration: "30 seconds",
      description: "Slowly roll your head in circles. This helps release tension in your neck and shoulders.",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop"
    },
    {
      name: "Shoulder Shrugs",
      duration: "20 seconds",
      description: "Lift shoulders up to ears, hold for 1 second, then release. Repeat 10 times.",
      image: "https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=400&h=300&fit=crop"
    },
    {
      name: "Arm Circles",
      duration: "30 seconds",
      description: "Extend arms out to sides and make small circles, gradually increasing size.",
      image: "https://images.unsplash.com/photo-1518611505868-48d0b8fb7167?w=400&h=300&fit=crop"
    },
    {
      name: "Seated Forward Bend",
      duration: "30 seconds",
      description: "Sit upright and slowly bend forward from the hips. Reach toward your toes.",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop"
    },
    {
      name: "Spinal Twist",
      duration: "30 seconds",
      description: "Sit with good posture, cross one leg over the other, and gently twist toward the bent knee.",
      image: "https://images.unsplash.com/photo-1535397097300-3b314f6d0df5?w=400&h=300&fit=crop"
    },
    {
      name: "Wrist & Ankle Circles",
      duration: "20 seconds",
      description: "Rotate wrists and ankles in circles to improve circulation in extremities.",
      image: "https://images.unsplash.com/photo-1518835912916-a9e76e5f2e88?w=400&h=300&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pre-Meeting Stretch Routine</h1>
          <p className="text-sm text-slate-600 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            3 minutes • 6 stretches
          </p>
        </div>

        {/* Stretches Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {stretches.map((stretch, idx) => (
            <Card key={idx} className="overflow-hidden">
              <img
                src={stretch.image}
                alt={stretch.name}
                className="w-full h-24 object-cover"
              />
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm text-slate-900">{stretch.name}</CardTitle>
                <p className="text-xs text-indigo-600 font-medium">{stretch.duration}</p>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xs text-slate-600 leading-snug">{stretch.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips */}
         <Card className="mt-12 bg-indigo-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-700">
            <p>✓ Breathe slowly and deeply throughout each stretch</p>
            <p>✓ Never bounce or force a stretch—move gently</p>
            <p>✓ Hold stretches without pain</p>
            <p>✓ Do this routine 2-3 minutes before your meeting</p>
          </CardContent>
        </Card>

        {/* Done Button */}
        <div className="text-center mt-8">
          <Link to={createPageUrl("MorningMeeting")}>
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              ✓ Done Stretching - Back to Meeting
            </Button>
          </Link>
        </div>
        </div>
        </div>
  );
}