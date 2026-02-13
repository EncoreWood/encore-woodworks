import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors } from "lucide-react";

export default function KerfCalculator() {
  const [desiredLength, setDesiredLength] = useState("");
  const [numberOfCuts, setNumberOfCuts] = useState("1");
  const [bladeWidth, setBladeWidth] = useState("0.125"); // Default 1/8" blade

  const calculateActualCut = () => {
    const length = parseFloat(desiredLength);
    const cuts = parseInt(numberOfCuts);
    const kerf = parseFloat(bladeWidth);

    if (!isNaN(length) && !isNaN(cuts) && !isNaN(kerf) && cuts > 0) {
      const totalKerf = kerf * cuts;
      const adjustedLength = length + totalKerf;
      return {
        totalKerf: totalKerf.toFixed(3),
        adjustedLength: adjustedLength.toFixed(3),
        perPiece: cuts > 1 ? ((length + totalKerf) / cuts).toFixed(3) : adjustedLength.toFixed(3)
      };
    }
    return null;
  };

  const results = calculateActualCut();

  // Common blade widths
  const commonBlades = [
    { label: '1/16" (0.0625)', value: "0.0625" },
    { label: '1/8" (0.125)', value: "0.125" },
    { label: '3/32" (0.09375)', value: "0.09375" },
    { label: '5/32" (0.15625)', value: "0.15625" }
  ];

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-600" />
          Kerf Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm text-slate-700">Desired Final Length (inches)</Label>
            <Input
              type="number"
              placeholder="Enter length"
              value={desiredLength}
              onChange={(e) => setDesiredLength(e.target.value)}
              className="text-sm"
              step="0.001"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700">Number of Cuts</Label>
            <Input
              type="number"
              placeholder="Number of cuts"
              value={numberOfCuts}
              onChange={(e) => setNumberOfCuts(e.target.value)}
              className="text-sm"
              min="1"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700">Blade Width (Kerf)</Label>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Blade width"
                value={bladeWidth}
                onChange={(e) => setBladeWidth(e.target.value)}
                className="text-sm"
                step="0.001"
              />
              <div className="flex gap-1 flex-wrap">
                {commonBlades.map((blade) => (
                  <button
                    key={blade.value}
                    onClick={() => setBladeWidth(blade.value)}
                    className="text-xs px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                  >
                    {blade.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {results && (
            <div className="bg-amber-100 rounded-md p-4 space-y-2">
              <div className="font-semibold text-amber-900 mb-2">Cutting Guide:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Material Lost (Kerf):</span>
                  <span className="font-bold">{results.totalKerf}"</span>
                </div>
                <div className="flex justify-between">
                  <span>Cut Material At:</span>
                  <span className="font-bold text-lg">{results.adjustedLength}"</span>
                </div>
                {parseInt(numberOfCuts) > 1 && (
                  <div className="flex justify-between text-xs text-amber-700 pt-2 border-t border-amber-200">
                    <span>Per piece before cutting:</span>
                    <span className="font-semibold">{results.perPiece}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-amber-200 text-xs text-slate-600 space-y-1">
          <div>💡 <strong>Tip:</strong> Always add kerf loss back to your measurements</div>
          <div>• Formula: Final Length + (Blade Width × Number of Cuts)</div>
        </div>
      </CardContent>
    </Card>
  );
}