import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { emailApi } from '../services/api';
import { EmailItem } from '../types';
import { EmailRow } from '../components/EmailRow';
import { Send } from 'lucide-react';

interface ContextType {
  searchQuery: string;
  refreshCounts: () => void;
}

export const SentPage: React.FC = () => {
  const { searchQuery } = useOutletContext<ContextType>();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSent = async () => {
    try {
      setLoading(true);
      if (searchQuery.trim()) {
        const res = await emailApi.searchEmails(searchQuery, 'SENT');
        setEmails(res.results);
      } else {
        const res = await emailApi.getSentEmails();
        setEmails(res.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
    const interval = setInterval(fetchSent, 4000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const displayEmails = emails;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
      {loading && emails.length === 0 ? (
        <div className="p-12 text-center text-gray-400 font-medium">Loading sent emails...</div>
      ) : displayEmails.length === 0 ? (
        <div className="p-16 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No sent emails yet</h3>
          <p className="text-sm text-gray-400 mt-1">
            Emails that have been successfully dispatched will be listed here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayEmails.map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
};
