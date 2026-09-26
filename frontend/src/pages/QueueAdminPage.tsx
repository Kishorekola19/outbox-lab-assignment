import React from 'react';
import { Cpu, ExternalLink } from 'lucide-react';

export const QueueAdminPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-green-50 text-[#00A859] rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">BullMQ Live Queue Dashboard</h1>
            <p className="text-xs text-gray-500">
              Monitor real-time delayed jobs, active workers, rate limit pauses, and job retries.
            </p>
          </div>
        </div>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
        >
          <span>Open Full Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs">
        <iframe
          src="/admin/queues"
          title="BullMQ Dashboard"
          className="w-full h-full min-h-[600px] border-none"
        />
      </div>
    </div>
  );
};
