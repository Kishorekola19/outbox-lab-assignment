import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { emailApi } from '../services/api';

export const DashboardLayout: React.FC = () => {
  const [scheduledCount, setScheduledCount] = useState<number>(12);
  const [sentCount, setSentCount] = useState<number>(785);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCounts = async () => {
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        emailApi.getScheduledEmails(),
        emailApi.getSentEmails(),
      ]);
      setScheduledCount(scheduledRes.count);
      setSentCount(sentRes.count);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      <Sidebar scheduledCount={scheduledCount} sentCount={sentCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={fetchCounts}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ searchQuery, refreshCounts: fetchCounts }} />
        </main>
      </div>
    </div>
  );
};
