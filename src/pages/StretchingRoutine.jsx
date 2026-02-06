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
      description: "Gently roll your head in slow circles. Breathe deeply and relax your shoulders.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/7631b038c_generated_image.png"
    },
    {
      name: "Shoulder Rolls",
      duration: "30 seconds",
      description: "Roll your shoulders backward in slow circles, then reverse direction.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/3b487860b_generated_image.png"
    },
    {
      name: "Arm Circles",
      duration: "30 seconds",
      description: "Extend arms out to sides and make small circles, gradually increasing size.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/9baac4e1c_generated_image.png"
    },
    {
      name: "Standing Forward Bend",
      duration: "30 seconds",
      description: "Stand with feet hip-width apart and slowly bend forward from the hips. Let your arms hang down.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/501b7bc0d_generated_image.png"
    },
    {
      name: "Quad Stretch",
      duration: "30 seconds",
      description: "Stand on one leg and pull the other foot toward your buttocks. Keep your balance.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/56deaa5c4_generated_image.png"
    },
    {
      name: "Calf Stretch",
      duration: "30 seconds",
      description: "Step one leg back and press your heel down while keeping your leg straight. Feel the stretch in your calf.",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/308324154_generated_image.png"
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
            3 minutes • 6 standing stretches
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