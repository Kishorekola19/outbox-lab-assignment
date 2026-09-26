import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Send, AlertTriangle } from 'lucide-react';
import { emailApi } from '../services/api';
import { EmailItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const EmailDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      emailApi
        .getEmailById(id)
        .then((res) => setEmail(res.email))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading email details...</div>;
  }

  if (!email) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-lg font-bold text-gray-800">Email not found</h3>
        <button
          onClick={() => navigate('/dashboard/scheduled')}
          className="mt-4 text-sm font-semibold text-[#00A859] hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-8 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 pb-6 border-b border-gray-100 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight flex-1">{email.subject}</h1>
        <StatusBadge status={email.status} scheduledAt={email.scheduledAt} sentAt={email.sentAt} />
      </div>

      <div className="space-y-4 mb-8 text-sm">
        <div className="flex">
          <span className="w-28 text-gray-400 font-medium">From:</span>
          <span className="font-semibold text-gray-900">{email.sender}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-gray-400 font-medium">To:</span>
          <span className="font-semibold text-gray-900">{email.recipient}</span>
        </div>
        <div className="flex">
          <span className="w-28 text-gray-400 font-medium">Scheduled:</span>
          <span className="text-gray-700">{new Date(email.scheduledAt).toLocaleString()}</span>
        </div>
        {email.sentAt && (
          <div className="flex">
            <span className="w-28 text-gray-400 font-medium">Sent At:</span>
            <span className="text-green-700 font-medium">{new Date(email.sentAt).toLocaleString()}</span>
          </div>
        )}
        {email.errorMessage && (
          <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-xl">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Error: {email.errorMessage}</span>
          </div>
        )}
      </div>

      <div className="bg-[#F9FAFB] border border-gray-200/80 rounded-2xl p-6">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Email Content</h4>
        <div
          className="prose text-sm text-gray-800"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>
    </div>
  );
};
