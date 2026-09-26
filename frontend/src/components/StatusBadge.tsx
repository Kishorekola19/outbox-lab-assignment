import React from 'react';
import { RecipientStatus } from '../types';

interface StatusBadgeProps {
  status: RecipientStatus;
  scheduledAt?: string;
  sentAt?: string | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, scheduledAt, sentAt }) => {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${dayName} ${timeStr}`;
  };

  if (status === 'SENT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200/70 text-gray-600">
        Sent
      </span>
    );
  }

  if (status === 'PENDING' || status === 'QUEUED' || status === 'RESCHEDULED') {
    return (
      <span className="inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FFEDD5] text-[#C2410C] border border-[#FDBA74]/50 shadow-2xs">
        <span>⏰</span>
        <span>{formatTime(scheduledAt)}</span>
        {status === 'RESCHEDULED' && <span className="text-[10px] ml-1 text-amber-700">(Delayed)</span>}
      </span>
    );
  }

  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {status}
    </span>
  );
};
