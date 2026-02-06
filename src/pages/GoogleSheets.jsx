import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function GoogleSheetsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:Z100');
  const [sheetData, setSheetData] = useState(null);
  const [editData, setEditData] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRead = async () => {
    if (!spreadsheetId.trim()) {
      setMessage('Please enter a spreadsheet ID');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await base44.functions.invoke('googleSheetsEditor', {
        action: 'read',
        spreadsheetId: spreadsheetId.trim(),
        range: range.trim() || 'Sheet1!A1:Z100'
      });

      if (response.data?.error) {
        setMessage(response.data.error);
      } else {
        setSheetData(response.data);
        setMessage('Data loaded successfully');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWrite = async () => {
    if (!spreadsheetId.trim() || !editData.trim()) {
      setMessage('Please enter spreadsheet ID and data');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      // Parse the data - expect JSON array format
      let values;
      try {
        values = JSON.parse(editData);
      } catch {
        setMessage('Data must be valid JSON array. Example: [["A1", "B1"], ["A2", "B2"]]');
        setLoading(false);
        return;
      }

      const response = await base44.functions.invoke('googleSheetsEditor', {
        action: 'write',
        spreadsheetId: spreadsheetId.trim(),
        range: range.trim() || 'Sheet1!A1',
        values
      });

      if (response.data?.error) {
        setMessage(response.data.error);
      } else {
        setMessage('Data written successfully!');
        setEditData('');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Google Sheets Editor</h1>
          <p className="text-slate-500 mt-1">Read and edit your Google Sheets directly</p>
        </div>

        {/* Configuration */}
        <Card className="p-6 bg-white border-0 shadow-lg mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Paste your Google Sheets ID here"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Find it in your sheet URL: docs.google.com/spreadsheets/d/<span className="font-mono">YOUR_ID</span>
              </p>
            </div>

            <div>
              <Label htmlFor="range">Range</Label>
              <Input
                id="range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="Sheet1!A1:Z100"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Format: SheetName!StartCell:EndCell (e.g., Sheet1!A1:D10)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRead}
                disabled={loading || !spreadsheetId.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reading...
                  </>
                ) : (
                  'Read Sheet'
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Display Data */}
        {sheetData && (
          <Card className="p-6 bg-white border-0 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {sheetData.values?.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Write Data */}
        <Card className="p-6 bg-white border-0 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Edit Data</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editData">Data (JSON format)</Label>
              <Textarea
                id="editData"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
                placeholder='[["Header 1", "Header 2"], ["Value 1", "Value 2"]]'
                className="mt-1 font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter data as JSON array of arrays. Example: [["A1", "B1"], ["A2", "B2"]]
              </p>
            </div>

            <Button
              onClick={handleWrite}
              disabled={loading || !spreadsheetId.trim() || !editData.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Writing...
                </>
              ) : (
                'Write to Sheet'
              )}
            </Button>
          </div>
        </Card>

        {/* Messages */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              message.includes('Error') || message.includes('Please')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}