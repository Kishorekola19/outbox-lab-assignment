import React, { useEffect, useState } from 'react';
import { Slack, Mail, CheckCircle, AlertCircle, Trash2, Zap } from 'lucide-react';
import { slackApi, authApi } from '../services/api';
import { SlackStatus } from '../types';
import toast from 'react-hot-toast';

export const SlackSettingsPage: React.FC = () => {
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSlackConfirmModal, setShowSlackConfirmModal] = useState(false);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const [sRes, gRes] = await Promise.all([
        slackApi.getStatus(),
        authApi.getGmailStatus().catch(() => ({ connected: false })),
      ]);
      setSlackStatus(sRes);
      setGmailStatus(gRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();

    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      toast.success('Gmail account connected successfully! Real sending enabled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('gmail_error')) {
      toast.error(`Gmail connection error: ${params.get('gmail_error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectSlack = () => {
    window.location.href = '/api/slack/connect';
  };

  const handleConnectGmail = () => {
    const token = localStorage.getItem('token');
    window.location.href = token ? `/api/auth/gmail/connect?token=${token}` : '/api/auth/gmail/connect';
  };

  const handleMockConnectSlack = async () => {
    try {
      await slackApi.mockConnect();
      toast.success('Slack connected successfully (Demo Mode)');
      fetchStatuses();
    } catch (e: any) {
      toast.error('Failed to connect mock Slack');
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await slackApi.disconnect();
      toast.success('Slack disconnected');
      setShowSlackConfirmModal(false);
      fetchStatuses();
    } catch (e: any) {
      toast.error('Failed to disconnect Slack');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Integrations & Accounts</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Connect your Gmail account for real email dispatching and Slack for live rate limit alerts.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading settings...</div>
      ) : (
        <div className="space-y-6">
          {/* GMAIL CONNECT CARD */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {gmailStatus?.connected ? `Gmail Connected (${gmailStatus.email})` : 'Connect Gmail Account'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {gmailStatus?.connected
                      ? 'Emails will be sent directly from your personal Gmail account via Gmail API.'
                      : 'Connect your Gmail account to send real emails directly to recipients.'}
                  </p>
                </div>
              </div>

              {gmailStatus?.connected ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center space-x-2 shadow-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Connect Gmail for Sending</span>
                </button>
              )}
            </div>
          </div>

          {/* SLACK CONNECT CARD */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Slack className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {slackStatus?.connected ? 'Slack Rate Limit Alerts Connected' : 'Slack Rate Limit Integration'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {slackStatus?.connected
                      ? 'Slack notifications active for hourly rate limit triggers.'
                      : 'Receive real Slack alerts when hourly email rate limit is hit.'}
                  </p>
                </div>
              </div>

              {slackStatus?.connected ? (
                <button
                  type="button"
                  onClick={() => setShowSlackConfirmModal(true)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleMockConnectSlack}
                    className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>1-Click Mock Connect</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectSlack}
                    className="px-5 py-2.5 bg-[#4A154B] hover:bg-[#3F123F] text-white font-semibold text-xs rounded-xl flex items-center space-x-2 shadow-sm transition-colors"
                  >
                    <Slack className="w-4 h-4" />
                    <span>Connect Slack</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showSlackConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Disconnect Slack?</h3>
            <p className="text-xs text-gray-500 mb-6">
              You will no longer receive live notifications when your email campaign hits hourly rate limits.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSlackConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnectSlack}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
