import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Circle } from "lucide-react";

export default function CircleCalculator() {
  const [radius, setRadius] = useState("");
  const [diameter, setDiameter] = useState("");
  const [circumference, setCircumference] = useState("");
  const [area, setArea] = useState("");

  const calculateFromRadius = (r) => {
    const rad = parseFloat(r);
    if (!isNaN(rad)) {
      setDiameter((rad * 2).toFixed(2));
      setCircumference((2 * Math.PI * rad).toFixed(2));
      setArea((Math.PI * rad * rad).toFixed(2));
    } else {
      setDiameter("");
      setCircumference("");
      setArea("");
    }
  };

  const calculateFromDiameter = (d) => {
    const dia = parseFloat(d);
    if (!isNaN(dia)) {
      setRadius((dia / 2).toFixed(2));
      setCircumference((Math.PI * dia).toFixed(2));
      setArea((Math.PI * (dia / 2) * (dia / 2)).toFixed(2));
    } else {
      setRadius("");
      setCircumference("");
      setArea("");
    }
  };

  const calculateFromCircumference = (c) => {
    const circ = parseFloat(c);
    if (!isNaN(circ)) {
      const r = circ / (2 * Math.PI);
      setRadius(r.toFixed(2));
      setDiameter((r * 2).toFixed(2));
      setArea((Math.PI * r * r).toFixed(2));
    } else {
      setRadius("");
      setDiameter("");
      setArea("");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Circle className="w-5 h-5 text-purple-600" />
          Circle Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm text-slate-700">Radius</Label>
            <Input
              type="number"
              placeholder="Enter radius"
              value={radius}
              onChange={(e) => {
                setRadius(e.target.value);
                calculateFromRadius(e.target.value);
              }}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700">Diameter</Label>
            <Input
              type="number"
              placeholder="Enter diameter"
              value={diameter}
              onChange={(e) => {
                setDiameter(e.target.value);
                calculateFromDiameter(e.target.value);
              }}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700">Circumference</Label>
            <Input
              type="number"
              placeholder="Enter circumference"
              value={circumference}
              onChange={(e) => {
                setCircumference(e.target.value);
                calculateFromCircumference(e.target.value);
              }}
              className="text-sm"
            />
          </div>

          <div className="bg-purple-100 rounded-md p-3">
            <Label className="text-sm font-semibold text-purple-900">Area</Label>
            <div className="text-lg font-bold text-purple-800 mt-1">
              {area ? `${area} sq in` : "Enter any value above"}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-purple-200 text-xs text-slate-600 space-y-1">
          <div>• Diameter = 2 × Radius</div>
          <div>• Circumference = 2π × Radius</div>
          <div>• Area = π × Radius²</div>
        </div>
      </CardContent>
    </Card>
  );
}