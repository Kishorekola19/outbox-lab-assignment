import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  ChevronDown,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Send,
  X,
  Mail,
} from 'lucide-react';
import { emailApi, authApi } from '../services/api';
import { parseCSVRecipients } from '../utils/csvParser';
import { SendLaterModal } from '../components/SendLaterModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email?: string } | null>(null);
  const [fromEmail, setFromEmail] = useState<string>(user?.email || 'oliver.brown@domain.io');
  const [toInputValue, setToInputValue] = useState('sricharangoud0608@gmail.com');
  const [recipientList, setRecipientList] = useState<string[]>(['sricharangoud0608@gmail.com']);
  const [subject, setSubject] = useState('ReachInbox Test');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [body, setBody] = useState('This is a real email delivery test.');

  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string }[]>([
    {
      id: 'att-1',
      name: 'tennis_player.jpg',
      url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=300&auto=format&fit=crop&q=80',
    },
  ]);
  
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.getGmailStatus().then((res) => {
      setGmailStatus(res);
      if (res.connected && res.email) {
        setFromEmail(res.email);
      }
    }).catch(() => {});
  }, []);

  const getTargetEmails = (): string[] => {
    if (recipientList.length > 0 && recipientList[0] !== '') {
      return recipientList;
    }
    return toInputValue.split(/[\s,;]+/).filter(Boolean);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { validEmails, invalidEmails } = parseCSVRecipients(content);
        if (validEmails.length > 0) {
          setRecipientList(validEmails);
          setToInputValue(validEmails.join(', '));
          toast.success(`Parsed CSV! ${validEmails.length} recipients detected.`);
          if (invalidEmails.length > 0) {
            toast.error(`Ignored ${invalidEmails.length} invalid email strings.`);
          }
        } else {
          toast.error('No valid email addresses found in file.');
        }
      }
    };
    reader.readAsText(file);
  };

  // SEND NOW Action
  const handleSendNow = async () => {
    const targetEmails = getTargetEmails();
    if (targetEmails.length === 0) {
      toast.error('Please enter at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject.');
      return;
    }

    try {
      setIsSendingNow(true);
      const res = await emailApi.sendNowEmail({
        subject,
        body: body || '<p>This is a real email delivery test.</p>',
        sender: fromEmail,
        recipients: targetEmails,
      });

      toast.success('✓ Email sent successfully via Gmail API!');
      navigate('/dashboard/sent');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to send email';
      toast.error(errMsg);

      if (errMsg.toLowerCase().includes('gmail') || errMsg.toLowerCase().includes('connect')) {
        setTimeout(() => navigate('/settings/slack'), 1500);
      }
    } finally {
      setIsSendingNow(false);
    }
  };

  // SCHEDULE / SEND LATER Action
  const handleSchedule = async () => {
    const targetEmails = getTargetEmails();
    if (targetEmails.length === 0) {
      toast.error('Please enter at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject.');
      return;
    }

    const targetTime = scheduledTime || new Date(Date.now() + 60000);

    try {
      setIsScheduling(true);
      await emailApi.scheduleEmail({
        subject,
        body: body || '<p>This is a real email delivery test.</p>',
        sender: fromEmail,
        recipients: targetEmails,
        startTime: targetTime.toISOString(),
        delayBetweenEmails: Number(delayBetweenEmails),
        hourlyLimit: Number(hourlyLimit),
      });

      toast.success(`✓ Email scheduled successfully for ${targetTime.toLocaleTimeString()}`);
      navigate('/dashboard/scheduled');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to schedule email';
      toast.error(errMsg);

      if (errMsg.toLowerCase().includes('gmail') || errMsg.toLowerCase().includes('connect')) {
        setTimeout(() => navigate('/settings/slack'), 1500);
      }
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs p-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard/scheduled')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Compose New Email</h1>
        </div>

        {/* Action Buttons: [Send Now] and [Schedule / Send Later] */}
        <div className="flex items-center space-x-3">
          {/* Attachment Paperclip */}
          <button
            onClick={() => toast('Image attachment added to email body')}
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Paperclip className="w-5 h-5" />
            {attachments.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#00A859] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Clock Icon to Pick Schedule Time */}
          <button
            onClick={() => setShowScheduleModal(true)}
            title="Pick date & time"
            className={`p-2 rounded-full transition-colors ${
              scheduledTime ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* SEND NOW Button */}
          <button
            type="button"
            onClick={handleSendNow}
            disabled={isSendingNow || isScheduling}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-sm text-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSendingNow ? 'Sending...' : 'Send Now'}</span>
          </button>

          {/* SCHEDULE / SEND LATER Button */}
          <button
            type="button"
            onClick={handleSchedule}
            disabled={isSendingNow || isScheduling}
            className="px-5 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white font-semibold rounded-full shadow-sm text-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            <span>
              {isScheduling
                ? 'Scheduling...'
                : scheduledTime
                ? `Schedule (${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                : 'Schedule / Send Later'}
            </span>
          </button>
        </div>
      </div>

      {/* Gmail Status Banner */}
      {!gmailStatus?.connected && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-amber-600" />
            <span>
              <strong>Note:</strong> Connect your Gmail account in Integrations to send real emails directly to recipient inboxes via Gmail API.
            </span>
          </div>
          <button
            onClick={() => navigate('/settings/slack')}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Connect Gmail
          </button>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="py-4 space-y-4">
        {/* From field */}
        <div className="flex items-center text-sm py-1 border-b border-gray-100">
          <span className="w-20 text-gray-400 font-medium">From</span>
          <div className="relative inline-block">
            <div className="flex items-center space-x-2 bg-gray-100/70 hover:bg-gray-100 px-3 py-1 rounded-lg cursor-pointer text-gray-800 font-medium text-xs">
              <span>{fromEmail}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
        </div>

        {/* To field with Upload List button */}
        <div className="flex items-center text-sm py-1 border-b border-gray-100">
          <span className="w-20 text-gray-400 font-medium">To</span>
          <div className="flex-1 flex items-center justify-between">
            {recipientList.length > 1 ? (
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-[#00A859] bg-[#E6F4EA] px-2.5 py-1 rounded-full">
                  {recipientList.length} recipients detected
                </span>
                {recipientList.slice(0, 3).map((email, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {email}
                  </span>
                ))}
                {recipientList.length > 3 && (
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    +{recipientList.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={toInputValue}
                onChange={(e) => {
                  setToInputValue(e.target.value);
                  setRecipientList([e.target.value]);
                }}
                placeholder="sricharangoud0608@gmail.com"
                className="w-full text-sm text-gray-800 focus:outline-none placeholder-gray-300 font-medium"
              />
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 text-xs font-semibold text-[#00A859] hover:underline cursor-pointer ml-4 flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>
          </div>
        </div>

        {/* Subject field */}
        <div className="flex items-center text-sm py-1 border-b border-gray-100">
          <span className="w-20 text-gray-400 font-medium">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full text-sm text-gray-800 focus:outline-none placeholder-gray-300 font-medium"
          />
        </div>

        {/* Scheduling controls row */}
        <div className="flex items-center space-x-8 text-xs py-2 bg-gray-50/60 p-3 rounded-2xl border border-gray-100">
          <div className="flex items-center space-x-3">
            <span className="text-gray-700 font-medium">Delay between 2 emails</span>
            <input
              type="number"
              min="1"
              max="60"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
              className="w-16 bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-center font-mono text-gray-800 focus:outline-none focus:border-green-500"
            />
            <span className="text-gray-400">sec</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-gray-700 font-medium">Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-center font-mono text-gray-800 focus:outline-none focus:border-green-500"
            />
            <span className="text-gray-400">emails</span>
          </div>
        </div>
      </div>

      {/* Editor Body container */}
      <div className="bg-[#F9FAFB] border border-gray-200/80 rounded-3xl p-4 mt-2">
        {/* Rich text formatting toolbar */}
        <div className="flex items-center space-x-2 border-b border-gray-200/70 pb-3 mb-3 text-gray-500 overflow-x-auto">
          <button className="p-1 hover:text-gray-800"><Undo className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><Redo className="w-4 h-4" /></button>
          <span className="w-px h-4 bg-gray-200 mx-1"></span>
          <button className="p-1 hover:text-gray-800 text-xs font-serif font-bold">T T</button>
          <button className="p-1 hover:text-gray-800"><Bold className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><Italic className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><Underline className="w-4 h-4" /></button>
          <span className="w-px h-4 bg-gray-200 mx-1"></span>
          <button className="p-1 hover:text-gray-800"><AlignLeft className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><ListOrdered className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><List className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><Quote className="w-4 h-4" /></button>
          <button className="p-1 hover:text-gray-800"><Strikethrough className="w-4 h-4" /></button>
        </div>

        {/* Content text area */}
        <textarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type Your Reply..."
          className="w-full bg-transparent text-sm text-gray-800 focus:outline-none resize-none placeholder-gray-400"
        />

        {/* Attached image preview card */}
        {attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200/60">
            <div className="relative inline-block group">
              <img
                src={attachments[0].url}
                alt="Attachment preview"
                className="w-44 h-28 object-cover rounded-xl border border-gray-200 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setAttachments([])}
                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Later Modal Popup */}
      <SendLaterModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSelectTime={(selectedDate) => {
          setScheduledTime(selectedDate);
          toast.success(`Schedule time set to ${selectedDate.toLocaleString()}`);
        }}
      />
    </div>
  );
};
