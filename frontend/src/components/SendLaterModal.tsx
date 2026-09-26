import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface SendLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (date: Date) => void;
}

export const SendLaterModal: React.FC<SendLaterModalProps> = ({ isOpen, onClose, onSelectTime }) => {
  if (!isOpen) return null;

  const [customDateTime, setCustomDateTime] = useState('');

  const getTomorrowPreset = (hour?: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (hour !== undefined) {
      d.setHours(hour, 0, 0, 0);
    }
    return d;
  };

  const presets = [
    { label: 'Tomorrow', date: getTomorrowPreset(9) },
    { label: 'Tomorrow, 10:00 AM', date: getTomorrowPreset(10) },
    { label: 'Tomorrow, 11:00 AM', date: getTomorrowPreset(11) },
    { label: 'Tomorrow, 3:00 PM', date: getTomorrowPreset(15) },
  ];

  const handleDone = () => {
    if (customDateTime) {
      onSelectTime(new Date(customDateTime));
    } else {
      onSelectTime(presets[1].date);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-8 bg-black/20 backdrop-blur-2xs">
      <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 mt-16 mr-8 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-base font-bold text-gray-900 mb-4">Send Later</h3>

        {/* Pick date & time input matching screenshot 4 */}
        <div className="relative mb-4">
          <input
            type="datetime-local"
            value={customDateTime}
            onChange={(e) => setCustomDateTime(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 pr-9 text-gray-700 focus:outline-none focus:border-green-500"
            placeholder="Pick date & time"
          />
          <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Presets list matching screenshot 4 */}
        <div className="space-y-1 mb-6">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectTime(preset.date);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Footer actions matching screenshot 4 */}
        <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-4 py-1.5 text-xs font-semibold text-[#00A859] border-2 border-[#00A859] hover:bg-[#00A859] hover:text-white rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
