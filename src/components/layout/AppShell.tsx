import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Database,
  FileCheck2,
  FileText,
  FolderKanban,
  Gavel,
  Globe,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Menu,
  ShieldAlert,
  Target,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

export type RouteKey =
  | 'dashboard'
  | 'master-organisasi'
  | 'master-personel'
  | 'master-penugasan'
  | 'master-jenis-aktivitas'
  | 'master-mitra'
  | 'master-iku'
  | 'master-sdgs'
  | 'renstra'
  | 'sasaran-strategis'
  | 'program-kerja'
  | 'aktivitas'
  | 'pelaksanaan-kegiatan'
  | 'anggaran'
  | 'target-pemantauan'
  | 'dokumen-bukti'
  | 'evaluasi'
  | 'keputusan'
  | 'risiko'
  | 'laporan'
  | 'manajemen-data';

interface NavChild {
  key: RouteKey;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  key?: RouteKey;
  children?: NavChild[];
}

export const NAV_STRUCTURE: NavGroup[] = [
  { id: 'dashboard', key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'master-data',
    label: 'Master Data',
    icon: Building2,
    children: [
      { key: 'master-organisasi', label: 'Organisasi', icon: Building2 },
      { key: 'master-personel', label: 'Personel', icon: Users },
      { key: 'master-penugasan', label: 'Penugasan Jabatan', icon: Briefcase },
      { key: 'master-jenis-aktivitas', label: 'Jenis Aktivitas', icon: ListChecks },
      { key: 'master-mitra', label: 'Mitra', icon: Handshake },
      { key: 'master-iku', label: 'IKU', icon: Award },
      { key: 'master-sdgs', label: 'SDGs', icon: Globe },
    ],
  },
  {
    id: 'perencanaan-strategis',
    label: 'Perencanaan Strategis',
    icon: Compass,
    children: [
      { key: 'renstra', label: 'Renstra', icon: FileText },
      { key: 'sasaran-strategis', label: 'Sasaran Strategis', icon: Target },
    ],
  },
  {
    id: 'program-kerja-group',
    label: 'Program Kerja',
    icon: FolderKanban,
    children: [
      { key: 'program-kerja', label: 'Daftar Program Kerja', icon: FolderKanban },
      { key: 'aktivitas', label: 'Aktivitas', icon: Activity },
      { key: 'pelaksanaan-kegiatan', label: 'Pelaksanaan Kegiatan', icon: CalendarCheck },
    ],
  },
  { id: 'anggaran', key: 'anggaran', label: 'Anggaran', icon: Wallet },
  { id: 'target-pemantauan', key: 'target-pemantauan', label: 'Target dan Pemantauan', icon: BarChart3 },
  { id: 'dokumen-bukti', key: 'dokumen-bukti', label: 'Dokumen dan Bukti', icon: FileCheck2 },
  { id: 'evaluasi', key: 'evaluasi', label: 'Evaluasi', icon: ClipboardCheck },
  { id: 'keputusan', key: 'keputusan', label: 'Keputusan', icon: Gavel },
  { id: 'risiko', key: 'risiko', label: 'Risiko', icon: ShieldAlert },
  { id: 'laporan', key: 'laporan', label: 'Laporan', icon: FileText },
  { id: 'manajemen-data', key: 'manajemen-data', label: 'Manajemen Data', icon: Database },
];

export function getBreadcrumb(route: RouteKey): { group?: string; label: string } {
  for (const g of NAV_STRUCTURE) {
    if (g.key === route) {
      return { label: g.label };
    }
    if (g.children) {
      const child = g.children.find((c) => c.key === route);
      if (child) {
        return { group: g.label, label: child.label };
      }
    }
  }
  return { label: 'Dashboard' };
}

interface AppShellProps {
  activeRoute: RouteKey;
  onNavigate: (route: RouteKey) => void;
  children: ReactNode;
}

export function AppShell({ activeRoute, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'master-data': true,
    'perencanaan-strategis': true,
    'program-kerja-group': true,
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const breadcrumb = getBreadcrumb(activeRoute);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
          FMIPA UNM
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Sistem Manajemen Program Kerja
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Navigasi Utama">
        {NAV_STRUCTURE.map((group) => {
          if (group.key) {
            const Icon = group.icon;
            const isActive = activeRoute === group.key;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  onNavigate(group.key!);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-normal'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{group.label}</span>
              </button>
            );
          }

          const isExpanded = !!expandedGroups[group.id];
          const GroupIcon = group.icon;
          const hasActiveChild = group.children?.some((c) => c.key === activeRoute);

          return (
            <div key={group.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  hasActiveChild
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="truncate">{group.label}</span>
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
                )}
              </button>

              {isExpanded && group.children && (
                <div className="mt-0.5 ml-4 pl-2.5 border-l border-slate-200 space-y-0.5">
                  {group.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isActive = activeRoute === child.key;
                    return (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => {
                          onNavigate(child.key);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap text-left ${
                          isActive
                            ? 'bg-slate-900 text-white font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0 transition-colors"
              >
                FMIPA UNM
              </button>
              {breadcrumb.group && (
                <>
                  <span className="text-slate-300 shrink-0" aria-hidden="true">/</span>
                  <span className="text-slate-500 truncate">{breadcrumb.group}</span>
                </>
              )}
              <span className="text-slate-300 shrink-0" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{breadcrumb.label}</span>
            </nav>
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap shrink-0 hidden sm:block">
            Fakultas Matematika dan Ilmu Pengetahuan Alam
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
