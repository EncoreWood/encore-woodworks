import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Delete } from "lucide-react";

export default function WoodworkingCalculator() {
  // Calculator state
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Converter state
  const [convertValue, setConvertValue] = useState("");
  const [fromUnit, setFromUnit] = useState("inches");
  const [toUnit, setToUnit] = useState("mm");

  const handleNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, op) => {
    switch (op) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (operation && previousValue !== null) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (!waitingForOperand) {
      const newDisplay = display.slice(0, -1);
      setDisplay(newDisplay || "0");
    }
  };

  // Unit conversion
  const decimalToFraction = (decimal) => {
    const tolerance = 1.0e-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;
    
    do {
      let a = Math.floor(b);
      let aux = h1;
      h1 = a * h1 + h2;
      h2 = aux;
      aux = k1;
      k1 = a * k1 + k2;
      k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

    return `${h1}/${k1}`;
  };

  const convertUnits = () => {
    const value = parseFloat(convertValue);
    if (!value) return "0";

    let result;

    // Convert to inches first
    let inches;
    if (fromUnit === "inches") inches = value;
    else if (fromUnit === "mm") inches = value / 25.4;
    else if (fromUnit === "fractions") {
      // Parse fraction like "3/4" or "1 1/2"
      const parts = convertValue.trim().split(/\s+/);
      let whole = 0;
      let frac = 0;
      
      if (parts.length === 2) {
        whole = parseFloat(parts[0]);
        const fracParts = parts[1].split("/");
        frac = parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
      } else {
        const fracParts = parts[0].split("/");
        if (fracParts.length === 2) {
          frac = parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
        } else {
          whole = parseFloat(parts[0]);
        }
      }
      inches = whole + frac;
    }

    // Convert to target unit
    if (toUnit === "inches") {
      result = inches.toFixed(4);
    } else if (toUnit === "mm") {
      result = (inches * 25.4).toFixed(2);
    } else if (toUnit === "fractions") {
      const whole = Math.floor(inches);
      const decimal = inches - whole;
      const fraction = decimalToFraction(decimal);
      result = whole > 0 ? `${whole} ${fraction}` : fraction;
    }

    return result;
  };

  return (
    <Card className="bg-white border-0 shadow-sm max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Calculator className="w-4 h-4 text-amber-600" />
          Calculator & Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="calculator" className="text-xs h-8">Calculator</TabsTrigger>
            <TabsTrigger value="converter" className="text-xs h-8">Unit Converter</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-2">
            <div className="bg-slate-900 text-white p-3 rounded-lg text-right text-2xl font-mono mb-2 min-h-[50px] flex items-center justify-end break-all">
              {display}
            </div>
            
            <div className="grid grid-cols-4 gap-1.5">
              <Button variant="outline" onClick={handleClear} className="h-10 text-xs text-red-600">
                AC
              </Button>
              <Button variant="outline" onClick={handleBackspace} className="h-10 text-xs">
                <Delete className="w-3 h-3" />
              </Button>
              <Button variant="outline" onClick={() => handleOperation("/")} className="h-10 text-xs text-amber-600">
                ÷
              </Button>
              <Button variant="outline" onClick={() => handleOperation("*")} className="h-10 text-xs text-amber-600">
                ×
              </Button>

              <Button variant="outline" onClick={() => handleNumber(7)} className="h-10 text-xs">
                7
              </Button>
              <Button variant="outline" onClick={() => handleNumber(8)} className="h-10 text-xs">
                8
              </Button>
              <Button variant="outline" onClick={() => handleNumber(9)} className="h-10 text-xs">
                9
              </Button>
              <Button variant="outline" onClick={() => handleOperation("-")} className="h-10 text-xs text-amber-600">
                −
              </Button>

              <Button variant="outline" onClick={() => handleNumber(4)} className="h-10 text-xs">
                4
              </Button>
              <Button variant="outline" onClick={() => handleNumber(5)} className="h-10 text-xs">
                5
              </Button>
              <Button variant="outline" onClick={() => handleNumber(6)} className="h-10 text-xs">
                6
              </Button>
              <Button variant="outline" onClick={() => handleOperation("+")} className="h-10 text-xs text-amber-600">
                +
              </Button>

              <Button variant="outline" onClick={() => handleNumber(1)} className="h-10 text-xs">
                1
              </Button>
              <Button variant="outline" onClick={() => handleNumber(2)} className="h-10 text-xs">
                2
              </Button>
              <Button variant="outline" onClick={() => handleNumber(3)} className="h-10 text-xs">
                3
              </Button>
              <Button 
                variant="default" 
                onClick={handleEquals} 
                className="h-10 row-span-2 bg-amber-600 hover:bg-amber-700 text-xs"
              >
                =
              </Button>

              <Button variant="outline" onClick={() => handleNumber(0)} className="h-10 text-xs col-span-2">
                0
              </Button>
              <Button variant="outline" onClick={handleDecimal} className="h-10 text-xs">
                .
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="converter" className="space-y-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Value to Convert</Label>
                <Input
                  value={convertValue}
                  onChange={(e) => setConvertValue(e.target.value)}
                  placeholder="e.g., 25.4 or 1 1/2"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Select value={fromUnit} onValueChange={setFromUnit}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="mm">Millimeters</SelectItem>
                      <SelectItem value="fractions">Fractions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Select value={toUnit} onValueChange={setToUnit}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="mm">Millimeters</SelectItem>
                      <SelectItem value="fractions">Fractions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Result:</span>
                <span className="text-xl font-bold text-amber-600">{convertUnits()}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}