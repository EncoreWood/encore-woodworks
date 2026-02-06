import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";

export default function WoodworkingCalculator() {
  // Board Feet Calculator
  const [thickness, setThickness] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [quantity, setQuantity] = useState("1");

  // Sheet Goods Calculator
  const [sheetLength, setSheetLength] = useState("96");
  const [sheetWidth, setSheetWidth] = useState("48");
  const [cutLength, setCutLength] = useState("");
  const [cutWidth, setCutWidth] = useState("");

  // Material Cost Calculator
  const [boardFeet, setBoardFeet] = useState("");
  const [pricePerBF, setPricePerBF] = useState("");

  const calculateBoardFeet = () => {
    const t = parseFloat(thickness);
    const w = parseFloat(width);
    const l = parseFloat(length);
    const q = parseFloat(quantity) || 1;
    
    if (!t || !w || !l) return "0";
    
    const bf = (t * w * l) / 144 * q;
    return bf.toFixed(2);
  };

  const calculateSheetCuts = () => {
    const sl = parseFloat(sheetLength);
    const sw = parseFloat(sheetWidth);
    const cl = parseFloat(cutLength);
    const cw = parseFloat(cutWidth);
    
    if (!sl || !sw || !cl || !cw) return "0";
    
    const cutsPerRow = Math.floor(sw / cw);
    const rowsPerSheet = Math.floor(sl / cl);
    const total = cutsPerRow * rowsPerSheet;
    
    return total;
  };

  const calculateMaterialCost = () => {
    const bf = parseFloat(boardFeet);
    const price = parseFloat(pricePerBF);
    
    if (!bf || !price) return "0.00";
    
    return (bf * price).toFixed(2);
  };

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Calculator className="w-5 h-5 text-amber-600" />
          Woodworking Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="boardfeet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="boardfeet" className="text-xs">Board Feet</TabsTrigger>
            <TabsTrigger value="sheet" className="text-xs">Sheet Cuts</TabsTrigger>
            <TabsTrigger value="cost" className="text-xs">Material Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="boardfeet" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Thickness (in)</Label>
                <Input
                  type="number"
                  step="0.125"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  placeholder="1.5"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Width (in)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="6"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Length (in)</Label>
                <Input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="96"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="h-8"
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Board Feet:</span>
                <span className="text-2xl font-bold text-amber-600">{calculateBoardFeet()}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sheet" className="space-y-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sheet Length (in)</Label>
                  <Input
                    type="number"
                    value={sheetLength}
                    onChange={(e) => setSheetLength(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sheet Width (in)</Label>
                  <Input
                    type="number"
                    value={sheetWidth}
                    onChange={(e) => setSheetWidth(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cut Length (in)</Label>
                  <Input
                    type="number"
                    value={cutLength}
                    onChange={(e) => setCutLength(e.target.value)}
                    placeholder="24"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cut Width (in)</Label>
                  <Input
                    type="number"
                    value={cutWidth}
                    onChange={(e) => setCutWidth(e.target.value)}
                    placeholder="12"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Cuts Per Sheet:</span>
                <span className="text-2xl font-bold text-amber-600">{calculateSheetCuts()}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="space-y-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Board Feet</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={boardFeet}
                  onChange={(e) => setBoardFeet(e.target.value)}
                  placeholder="25.5"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price per Board Foot ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pricePerBF}
                  onChange={(e) => setPricePerBF(e.target.value)}
                  placeholder="4.50"
                  className="h-8"
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Cost:</span>
                <span className="text-2xl font-bold text-emerald-600">${calculateMaterialCost()}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}