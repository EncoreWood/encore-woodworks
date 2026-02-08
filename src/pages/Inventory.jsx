import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, Download, ExternalLink } from "lucide-react";

export default function Inventory() {
  const [allSheets, setAllSheets] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("");

  const spreadsheetId = "1RjYIJyNTIFs9oCp-l3klH53ZbUd0aKRPu4JmW2agDw0";

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('fetchGoogleSheet', {
        spreadsheetId,
        getAllSheets: true
      });

      if (response.data.sheets) {
        setAllSheets(response.data.sheets);
        setLastUpdated(new Date());
        
        // Set first sheet as active tab
        const sheetNames = Object.keys(response.data.sheets);
        if (sheetNames.length > 0 && !activeTab) {
          setActiveTab(sheetNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredSheetData = (sheetName) => {
    const sheetData = allSheets[sheetName] || [];
    if (sheetData.length === 0) return { headers: [], data: [] };
    
    const [headers, ...rows] = sheetData;
    const filteredRows = rows.filter(row => {
      if (!searchTerm) return true;
      return row.some(cell => 
        cell?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    return { headers, data: filteredRows };
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const statusLower = status.toLowerCase();
    if (statusLower.includes("full stock")) return "bg-green-100 text-green-800";
    if (statusLower.includes("low stock") || statusLower.includes("need order")) return "bg-red-100 text-red-800";
    if (statusLower.includes("over")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const getSupplierLink = (itemId, notes) => {
    if (!notes) return null;
    const notesLower = notes.toLowerCase();
    
    const supplier = suppliers.find(s => 
      notesLower.includes(s.name.toLowerCase())
    );
    
    if (supplier && supplier.ordering_url && itemId) {
      return `${supplier.ordering_url}?search=${encodeURIComponent(itemId)}`;
    }
    return null;
  };

  const exportToCSV = (sheetName) => {
    const { headers, data } = getFilteredSheetData(sheetName);
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheetName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading && Object.keys(allSheets).length === 0) {
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

  const sheetNames = Object.keys(allSheets);

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
              onClick={() => exportToCSV(activeTab)}
              variant="outline"
              className="bg-white"
              disabled={!activeTab}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 mb-4">
            {sheetNames.map((sheetName) => (
              <TabsTrigger
                key={sheetName}
                value={sheetName}
                className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                {sheetName}
              </TabsTrigger>
            ))}
          </TabsList>

          {sheetNames.map((sheetName) => {
            const { headers, data } = getFilteredSheetData(sheetName);
            
            return (
              <TabsContent key={sheetName} value={sheetName}>
                <Card className="bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      {data.length} {data.length === 1 ? 'Item' : 'Items'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-slate-300">
                            {headers.map((header, index) => (
                              <th
                                key={index}
                                className="text-left py-3 px-4 text-sm font-semibold text-slate-900 bg-slate-100 whitespace-nowrap"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, rowIndex) => {
                            const itemId = row[0];
                            const notes = row[headers.indexOf("Notes")];
                            const supplierLink = getSupplierLink(itemId, notes);
                            
                            return (
                              <tr
                                key={rowIndex}
                                className="border-b border-slate-100 hover:bg-amber-50 transition-colors"
                              >
                                {row.map((cell, cellIndex) => {
                                  const header = headers[cellIndex];
                                  const isStatus = header === "Status";
                                  const isNotes = header === "Notes";
                                  
                                  return (
                                    <td
                                      key={cellIndex}
                                      className="py-3 px-4 text-sm text-slate-700"
                                    >
                                      {isStatus && cell ? (
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cell)}`}>
                                          {cell}
                                        </span>
                                      ) : isNotes && supplierLink ? (
                                        <a
                                          href={supplierLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                                        >
                                          {cell}
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ) : (
                                        cell || '-'
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {data.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        {searchTerm ? 'No items match your search' : 'No data available'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}