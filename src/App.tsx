import { useState } from 'react';
import { AppShell, type RouteKey } from './components/layout/AppShell';
import { AktivitasPage } from './pages/AktivitasPage';
import { AnggaranPage } from './pages/AnggaranPage';
import { DashboardPage } from './pages/DashboardPage';
import { DokumenBuktiPage } from './pages/DokumenBuktiPage';
import { EvaluasiPage, KeputusanPage, RisikoPage } from './pages/EvaluasiKeputusanRisikoPages';
import { LaporanPage } from './pages/LaporanPage';
import { ManajemenDataPage } from './pages/ManajemenDataPage';
import { MasterOrganisasiPage } from './pages/MasterOrganisasiPage';
import { MasterPenugasanJabatanPage } from './pages/MasterPenugasanJabatanPage';
import { MasterPersonelPage } from './pages/MasterPersonelPage';
import {
  MasterIkuPage,
  MasterJenisAktivitasPage,
  MasterMitraPage,
  MasterSdgsPage,
} from './pages/MasterReferensiPages';
import { PelaksanaanKegiatanPage } from './pages/PelaksanaanKegiatanPage';
import { RenstraPage, SasaranStrategisPage } from './pages/PerencanaanStrategisPages';
import { ProgramKerjaPage } from './pages/ProgramKerjaPage';
import { TargetPemantauanPage } from './pages/TargetPemantauanPage';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveRoute} />;
      case 'master-organisasi':
        return <MasterOrganisasiPage />;
      case 'master-personel':
        return <MasterPersonelPage />;
      case 'master-penugasan':
        return <MasterPenugasanJabatanPage />;
      case 'master-jenis-aktivitas':
        return <MasterJenisAktivitasPage />;
      case 'master-mitra':
        return <MasterMitraPage />;
      case 'master-iku':
        return <MasterIkuPage />;
      case 'master-sdgs':
        return <MasterSdgsPage />;
      case 'renstra':
        return <RenstraPage />;
      case 'sasaran-strategis':
        return <SasaranStrategisPage />;
      case 'program-kerja':
        return <ProgramKerjaPage />;
      case 'aktivitas':
        return <AktivitasPage />;
      case 'pelaksanaan-kegiatan':
        return <PelaksanaanKegiatanPage />;
      case 'anggaran':
        return <AnggaranPage />;
      case 'target-pemantauan':
        return <TargetPemantauanPage />;
      case 'dokumen-bukti':
        return <DokumenBuktiPage />;
      case 'evaluasi':
        return <EvaluasiPage />;
      case 'keputusan':
        return <KeputusanPage />;
      case 'risiko':
        return <RisikoPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'manajemen-data':
        return <ManajemenDataPage />;
      default:
        return <DashboardPage onNavigate={setActiveRoute} />;
    }
  };

  return (
    <AppShell activeRoute={activeRoute} onNavigate={setActiveRoute}>
      {renderPage()}
    </AppShell>
  );
}
