import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

function RoleBasedHome() {
  const { user } = useAuth();
  const [dest, setDest] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') { setDest('/Calendar'); return; }
    if (user.role === 'client') { setDest('/ClientPortal'); return; }
    // Invited clients join with role "user" — send them to the portal if their email
    // is listed as a client on any project's portal settings.
    base44.entities.ClientPortalSettings.filter({ client_email: user.email })
      .then(s => setDest(s && s.length > 0 ? '/ClientPortal' : '/TimeSheet'))
      .catch(() => setDest('/TimeSheet'));
  }, [user]);

  if (!dest) return null;
  return <Navigate to={dest} replace />;
}
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Admin from './pages/Admin';
import BillingTracker from './pages/BillingTracker';
import GroupLean from './pages/GroupLean';
import IndividualLean from './pages/IndividualLean';
import ArchivedProjects from './pages/ArchivedProjects';
import StrugglesSolutions from './pages/StrugglesSolutions';
import ProductionPlanning from './pages/ProductionPlanning';
import MistakeReport from './pages/MistakeReport';
import InventoryScan from './pages/InventoryScan';
import ClientPortal from './pages/ClientPortal';
import MyAssignments from './pages/MyAssignments';
import Trainings from './pages/Trainings';
import Flow from './pages/Flow';
import Education from './pages/Education';
import ShopAreas from './pages/ShopAreas';
import ShopAreaDetail from './pages/ShopAreaDetail';
import MyProfile from './pages/MyProfile';
import PdfViewer from './pages/PdfViewer';
import TabShell from './components/tabs/TabShell';
import AppUpdateWatcher from '@/components/AppUpdateWatcher';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// The app's route tree. Each open tab renders it at its own location, so every
// tab keeps its own page mounted independently of the browser URL.
const TabRouteView = ({ location }) => (
  <Routes location={location}>
    <Route path="/" element={<RoleBasedHome />} />
    {Object.entries(Pages).map(([path, Page]) => (
      <Route key={path} path={`/${path}`} element={<Page />} />
    ))}
    <Route path="/Admin" element={<Admin />} />
    <Route path="/BillingTracker" element={<BillingTracker />} />
    <Route path="/GroupLean" element={<GroupLean />} />
    <Route path="/IndividualLean" element={<IndividualLean />} />
    <Route path="/ArchivedProjects" element={<ArchivedProjects />} />
    <Route path="/StrugglesSolutions" element={<StrugglesSolutions />} />
    <Route path="/ProductionPlanning" element={<ProductionPlanning />} />
    <Route path="/MistakeReport" element={<MistakeReport />} />
    <Route path="/InventoryScan" element={<InventoryScan />} />
    <Route path="/ClientPortal" element={<ClientPortal />} />
    <Route path="/MyProfile" element={<MyProfile />} />
    <Route path="/PdfViewer" element={<PdfViewer />} />
    <Route path="/MyAssignments" element={<MyAssignments />} />
    <Route path="/Trainings" element={<Trainings />} />
    <Route path="/Flow" element={<Flow />} />
    <Route path="/EducationCut" element={<Education folder="Cut" />} />
    <Route path="/EducationFaceFrame" element={<Education folder="Face Frame" />} />
    <Route path="/EducationSpray" element={<Education folder="Spray" />} />
    <Route path="/EducationBuild" element={<Education folder="Build" />} />
    <Route path="/EducationDelivery" element={<Education folder="Delivery" />} />
    <Route path="/EducationInstall" element={<Education folder="Install" />} />
    <Route path="/EducationSpecialty" element={<Education folder="Specialty" />} />
    <Route path="/EducationGeneral" element={<Education folder="General" />} />
    <Route path="/ShopAreas" element={<ShopAreas />} />
    <Route path="/ShopAreaCut" element={<ShopAreaDetail area="Cut" />} />
    <Route path="/ShopAreaFaceFrame" element={<ShopAreaDetail area="Face Frame" />} />
    <Route path="/ShopAreaSpray" element={<ShopAreaDetail area="Spray" />} />
    <Route path="/ShopAreaBuild" element={<ShopAreaDetail area="Build" />} />
    <Route path="/ShopAreaDelivery" element={<ShopAreaDetail area="Delivery" />} />
    <Route path="/ShopAreaInstall" element={<ShopAreaDetail area="Install" />} />
    <Route path="/ShopAreaSpecialty" element={<ShopAreaDetail area="Specialty" />} />
    <Route path="/ShopAreaGeneral" element={<ShopAreaDetail area="General" />} />
    <Route path="/ShopAreaOffice" element={<ShopAreaDetail area="Office" />} />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the app inside browser-style tabs
  return <TabShell RouteView={TabRouteView} LayoutWrapper={LayoutWrapper} />;
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <AppUpdateWatcher />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App