import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Download } from "lucide-react";

export default function Inventory() {
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const spreadsheetId = "1RjYIJyNTIFs9oCp-l3klH53ZbUd0aKRPu4JmW2agDw0";
  const range = "Sheet1"; // Adjust if needed

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('fetchGoogleSheet', {
        spreadsheetId,
        range
      });

      if (response.data.values && response.data.values.length > 0) {
        const [headerRow, ...dataRows] = response.data.values;
        setHeaders(headerRow);
        setSheetData(dataRows);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = sheetData.filter(row => {
    if (!searchTerm) return true;
    return row.some(cell => 
      cell?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const exportToCSV = () => {
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading && sheetData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
              <p className="text-slate-600">Loading inventory data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
            {lastUpdated && (
              <p className="text-sm text-slate-600 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="bg-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={fetchData}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search inventory..."
              className="pl-10 bg-white"
            />
          </div>
        </div>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle>
              {filteredData.length} {filteredData.length === 1 ? 'Item' : 'Items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="text-left py-3 px-4 text-sm font-semibold text-slate-700 bg-slate-50"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="py-3 px-4 text-sm text-slate-700"
                        >
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {searchTerm ? 'No items match your search' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}