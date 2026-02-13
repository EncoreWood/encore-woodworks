import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";

export default function AngleCalculator() {
  const [angle1, setAngle1] = useState("");
  const [angle2, setAngle2] = useState("");
  const [hypotenuse, setHypotenuse] = useState("");
  const [adjacent, setAdjacent] = useState("");
  const [opposite, setOpposite] = useState("");

  const calculateFromAngles = () => {
    const a1 = parseFloat(angle1);
    const a2 = parseFloat(angle2);
    if (!isNaN(a1) && !isNaN(a2)) {
      const remaining = 180 - a1 - a2;
      return remaining.toFixed(2);
    }
    return "";
  };

  const calculateMiter = (angle) => {
    const a = parseFloat(angle);
    if (!isNaN(a)) {
      return (a / 2).toFixed(2);
    }
    return "";
  };

  const calculateComplementary = (angle) => {
    const a = parseFloat(angle);
    if (!isNaN(a)) {
      return (90 - a).toFixed(2);
    }
    return "";
  };

  const calculateTriangleSides = () => {
    const h = parseFloat(hypotenuse);
    const adj = parseFloat(adjacent);
    const opp = parseFloat(opposite);

    if (!isNaN(h) && !isNaN(adj)) {
      const calc_opp = Math.sqrt(h * h - adj * adj);
      const angle = Math.acos(adj / h) * (180 / Math.PI);
      return {
        opposite: calc_opp.toFixed(2),
        angle: angle.toFixed(2)
      };
    } else if (!isNaN(h) && !isNaN(opp)) {
      const calc_adj = Math.sqrt(h * h - opp * opp);
      const angle = Math.asin(opp / h) * (180 / Math.PI);
      return {
        adjacent: calc_adj.toFixed(2),
        angle: angle.toFixed(2)
      };
    } else if (!isNaN(adj) && !isNaN(opp)) {
      const calc_h = Math.sqrt(adj * adj + opp * opp);
      const angle = Math.atan(opp / adj) * (180 / Math.PI);
      return {
        hypotenuse: calc_h.toFixed(2),
        angle: angle.toFixed(2)
      };
    }
    return {};
  };

  const triangleResults = calculateTriangleSides();

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ruler className="w-5 h-5 text-blue-600" />
          Angle Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Triangle Angles */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Triangle Angles (sum = 180°)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Input
                type="number"
                placeholder="Angle 1"
                value={angle1}
                onChange={(e) => setAngle1(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Angle 2"
                value={angle2}
                onChange={(e) => setAngle2(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="bg-blue-100 rounded-md px-3 py-2 text-sm font-semibold text-blue-800 flex items-center justify-center">
              {calculateFromAngles() || "?"}°
            </div>
          </div>
        </div>

        {/* Miter Angles */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Miter Angle (Corner ÷ 2)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Corner angle"
              value={angle1}
              onChange={(e) => setAngle1(e.target.value)}
              className="text-sm"
            />
            <div className="bg-blue-100 rounded-md px-3 py-2 text-sm font-semibold text-blue-800 flex items-center justify-center">
              Miter: {calculateMiter(angle1) || "?"}°
            </div>
          </div>
        </div>

        {/* Complementary Angle */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Complementary (90° - angle)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Angle"
              value={angle1}
              onChange={(e) => setAngle1(e.target.value)}
              className="text-sm"
            />
            <div className="bg-blue-100 rounded-md px-3 py-2 text-sm font-semibold text-blue-800 flex items-center justify-center">
              {calculateComplementary(angle1) || "?"}°
            </div>
          </div>
        </div>

        {/* Right Triangle Calculator */}
        <div className="space-y-2 pt-2 border-t border-blue-200">
          <Label className="text-sm font-semibold text-slate-700">Right Triangle (Enter 2 sides)</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">Hypotenuse:</Label>
              <Input
                type="number"
                placeholder="Hypotenuse"
                value={hypotenuse}
                onChange={(e) => setHypotenuse(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">Adjacent:</Label>
              <Input
                type="number"
                placeholder="Adjacent"
                value={adjacent}
                onChange={(e) => setAdjacent(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">Opposite:</Label>
              <Input
                type="number"
                placeholder="Opposite"
                value={opposite}
                onChange={(e) => setOpposite(e.target.value)}
                className="text-sm"
              />
            </div>
            {Object.keys(triangleResults).length > 0 && (
              <div className="bg-blue-100 rounded-md p-3 text-sm">
                <div className="font-semibold text-blue-900 mb-1">Results:</div>
                {triangleResults.hypotenuse && <div>Hypotenuse: {triangleResults.hypotenuse}"</div>}
                {triangleResults.adjacent && <div>Adjacent: {triangleResults.adjacent}"</div>}
                {triangleResults.opposite && <div>Opposite: {triangleResults.opposite}"</div>}
                {triangleResults.angle && <div>Angle: {triangleResults.angle}°</div>}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}