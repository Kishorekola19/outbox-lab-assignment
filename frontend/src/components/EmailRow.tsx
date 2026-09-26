import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { EmailItem } from '../types';
import { StatusBadge } from './StatusBadge';

interface EmailRowProps {
  email: EmailItem;
}

export const EmailRow: React.FC<EmailRowProps> = ({ email }) => {
  const navigate = useNavigate();
  const [starred, setStarred] = useState(false);

  // Clean HTML snippet from body
  const textSnippet = email.body
    ? email.body.replace(/<[^>]+>/g, '').substring(0, 70)
    : '';

  return (
    <div
      onClick={() => navigate(`/email/${email.id}`)}
      className="group flex items-center justify-between px-6 py-3.5 border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors select-none"
    >
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        {/* Recipient column matching screenshot 1/3 */}
        <div className="w-48 flex-shrink-0 text-sm font-semibold text-gray-900 truncate">
          To: {email.recipient.split('@')[0]}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <StatusBadge status={email.status} scheduledAt={email.scheduledAt} sentAt={email.sentAt} />
        </div>

        {/* Subject & Preview snippet matching screenshot 1/3 */}
        <div className="min-w-0 flex-1 text-sm truncate pl-2">
          <span className="font-semibold text-gray-900 mr-1.5">{email.subject}</span>
          <span className="text-gray-400 font-normal">- {textSnippet}...</span>
        </div>
      </div>

      {/* Star button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setStarred(!starred);
        }}
        className="p-1 text-gray-300 group-hover:text-gray-400 hover:!text-amber-400 transition-colors ml-4"
      >
        <Star className={`w-4 h-4 ${starred ? 'fill-amber-400 text-amber-400' : ''}`} />
      </button>
    </div>
  );
};
