import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Clock, Send, Plus, ChevronDown, LogOut, Slack, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  scheduledCount?: number;
  sentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ scheduledCount = 0, sentCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 p-4 select-none">
      <div>
        {/* Logo matching screenshot 1 */}
        <div className="flex items-center space-x-2 px-2 py-1 mb-6">
          <span className="text-3xl font-extrabold tracking-tighter text-black font-mono">ONG</span>
        </div>

        {/* User Card matching screenshot 1 */}
        <div className="relative mb-6">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200/80 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name || 'Oliver Brown'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email || 'oliver.brown@domain.io'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>

          {/* User Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 text-sm text-gray-700">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/settings/slack');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
              >
                <Slack className="w-4 h-4 text-gray-500" />
                <span>Slack Settings</span>
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  window.open('/admin/queues', '_blank');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
              >
                <Cpu className="w-4 h-4 text-gray-500" />
                <span>BullMQ Admin Board</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Button matching screenshots */}
        <button
          onClick={() => navigate('/compose')}
          className="w-full py-2.5 px-4 mb-8 bg-white border-2 border-[#00A859] text-[#00A859] hover:bg-[#00A859]/5 font-semibold rounded-full flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <span>Compose</span>
        </button>

        {/* Navigation Core section */}
        <div className="mb-2">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-3">CORE</span>
        </div>

        <nav className="space-y-1">
          <NavLink
            to="/dashboard/scheduled"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E6F4EA] text-[#00A859] font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-4 h-4" />
              <span>Scheduled</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500">
              {scheduledCount}
            </span>
          </NavLink>

          <NavLink
            to="/dashboard/sent"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#E6F4EA] text-[#00A859] font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500">
              {sentCount}
            </span>
          </NavLink>
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span>BullMQ Status</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
            Active
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redis & Postgres</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
            Connected
          </span>
        </div>
      </div>
    </aside>
  );
};
