import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProposalViewer({ proposal }) {
  if (!proposal) return null;

  const selectedOptionsTotal = proposal.options
    ?.filter(opt => opt.selected)
    .reduce((sum, opt) => sum + (opt.price || 0), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 bg-white p-8 rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center border-b pb-6">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" 
          alt="Encore Woodworks" 
          className="h-24 mx-auto mb-4"
        />
        <div className="text-sm text-slate-600 mb-4">
          736 S 5725 W Hurricane, Utah 84737<br/>
          (435)632-2903 - Mitch<br/>
          (435)632-2292 - Ben<br/>
          Team@encorewood.com
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Proposal</h1>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="font-semibold text-slate-700">Job Name:</div>
          <div className="text-lg">{proposal.job_name}</div>
        </div>
        <div>
          <div className="font-semibold text-slate-700">Address:</div>
          <div className="text-lg">{proposal.address}</div>
        </div>
      </div>

      {/* Specifications */}
      <Card className="p-4 bg-slate-50">
        <h3 className="font-semibold text-lg mb-3">Specifications</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Cabinet Style:</span> {proposal.cabinet_style}</div>
          <div><span className="font-medium">Wood Species:</span> {proposal.wood_species}</div>
          <div><span className="font-medium">Door Style:</span> {proposal.door_style}</div>
          <div><span className="font-medium">Handles:</span> {proposal.handles}</div>
          <div><span className="font-medium">Drawerbox:</span> {proposal.drawerbox}</div>
          <div><span className="font-medium">Drawer Glides:</span> {proposal.drawer_glides}</div>
          <div><span className="font-medium">Hinges:</span> {proposal.hinges}</div>
        </div>
      </Card>

      {/* Rooms */}
      {proposal.rooms && proposal.rooms.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Standard Rooms</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="text-left p-3 font-semibold">Room Name</th>
                <th className="text-left p-3 font-semibold">Finish</th>
                <th className="text-left p-3 font-semibold">Items of Recognition</th>
                <th className="text-right p-3 font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {proposal.rooms.map((room, index) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="p-3">{room.room_name}</td>
                  <td className="p-3">{room.finish}</td>
                  <td className="p-3">{room.items_of_recognition}</td>
                  <td className="p-3 text-right font-medium">${room.price?.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td colSpan="3" className="p-3 text-right">Standard Total:</td>
                <td className="p-3 text-right text-lg">${proposal.standard_total?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Options */}
      {proposal.options && proposal.options.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Options</h3>
          <table className="w-full border-collapse">
            <tbody>
              {proposal.options.map((option, index) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="p-3 w-10">
                    <Checkbox checked={option.selected} disabled />
                  </td>
                  <td className="p-3">{option.description}</td>
                  <td className="p-3 text-right font-medium w-32">
                    {option.selected && `$${option.price?.toLocaleString()}`}
                  </td>
                </tr>
              ))}
              {selectedOptionsTotal > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan="2" className="p-3 text-right">Options Total:</td>
                  <td className="p-3 text-right">${selectedOptionsTotal.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Overall Total */}
      <Card className="p-4 bg-amber-50 border-2 border-amber-200">
        <div className="flex justify-between items-center text-2xl font-bold">
          <span>Overall Total:</span>
          <span className="text-amber-700">${proposal.overall_total?.toLocaleString()}</span>
        </div>
      </Card>

      {/* Payment Terms */}
      {proposal.payment_terms && (
        <Card className="p-4 bg-slate-50">
          <h3 className="font-semibold text-lg mb-3">Payment Terms</h3>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
            {proposal.payment_terms}
          </pre>
        </Card>
      )}

      {/* Notes */}
      {proposal.notes && (
        <Card className="p-4 bg-slate-50">
          <h3 className="font-semibold text-lg mb-3">Additional Notes</h3>
          <p className="text-sm text-slate-700">{proposal.notes}</p>
        </Card>
      )}
    </div>
  );
}