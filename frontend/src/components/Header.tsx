import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange, onRefresh }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
      <div className="flex-1 max-w-2xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-gray-200 text-sm rounded-full pl-11 pr-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 ml-4">
        <button
          title="Filter"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          title="Refresh"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
