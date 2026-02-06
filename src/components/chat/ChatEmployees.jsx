import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ChatEmployees({ room, employees = [] }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const queryClient = useQueryClient();

  const updateRoomMutation = useMutation({
    mutationFn: (updatedEmployees) =>
      base44.entities.ChatRoom.update(room.id, { employees: updatedEmployees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    }
  });

  const handleAddEmployee = () => {
    if (selectedEmployee && !room.employees?.includes(selectedEmployee)) {
      const updated = [...(room.employees || []), selectedEmployee];
      updateRoomMutation.mutate(updated);
      setSelectedEmployee('');
      setShowAddDialog(false);
    }
  };

  const handleRemoveEmployee = (email) => {
    const updated = (room.employees || []).filter(e => e !== email);
    updateRoomMutation.mutate(updated);
  };

  return (
    <>
      <Card className="p-4 bg-white border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Team Members</h3>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="text-xs"
          >
            + Add
          </Button>
        </div>
        <div className="space-y-2">
          {!room.employees || room.employees.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet</p>
          ) : (
            room.employees.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
              >
                <span className="text-slate-700">{email}</span>
                <button
                  onClick={() => handleRemoveEmployee(email)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              placeholder="Enter employee email"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEmployee}
                disabled={!selectedEmployee}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}