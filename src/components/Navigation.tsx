import { useState } from 'react';
import { 
  Files, 
  Workflow, 
  Network, 
  AlertTriangle, 
  ShieldCheck, 
  CheckSquare, 
  FileCheck2, 
  Menu, 
  X,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Bot
} from 'lucide-react';
import type { NavigationTab } from '../types';

interface NavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  metrics: {
    documents: number;
    relationships: number;
    conflicts: number;
    proposals: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab, metrics }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'registry', label: 'Document Registry', icon: <Files className="w-4 h-4" />, badge: metrics.documents },
    { id: 'workspace', label: 'Accounting Workspace', icon: <Workflow className="w-4 h-4" /> },
    { id: 'relationship', label: 'Relationship Mapping', icon: <Network className="w-4 h-4" />, badge: metrics.relationships },
    { 
      id: 'consistency', 
      label: 'Consistency Checker', 
      icon: <AlertTriangle className="w-4 h-4" />, 
      badge: metrics.conflicts, 
      badgeColor: 'bg-red-100 text-red-700' 
    },
    { 
      id: 'graphrag', 
      label: 'GraphRAG Assistant', 
      icon: <Bot className="w-4 h-4" /> 
    },
    {
      id: 'aiworkspace',
      label: 'AI Workspace',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: metrics.proposals,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    { id: 'audit', label: 'Integrity & Audit Log', icon: <ShieldCheck className="w-4 h-4" /> },
    { 
      id: 'approval', 
      label: 'Approval Center', 
      icon: <CheckSquare className="w-4 h-4" />, 
      badge: metrics.proposals,
      badgeColor: 'bg-blue-100 text-blue-700'
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-700 text-white p-2 rounded-lg shadow-sm flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-blue-700">AKSARA</span>
                <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  MVP v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Accounting Knowledge & Secure Audit Record Assurance</p>
            </div>
          </div>

          {/* Quick Context & Status */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>PT Audit Tekno Mandiri</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-blue-700">Sesi Audit Q3 2026</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Browser In-Memory State</span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-blue-700 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation for Desktop */}
      <div className="hidden md:block border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none" aria-label="Tabs">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/80'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Dropdown Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-3 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 opacity-50" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
