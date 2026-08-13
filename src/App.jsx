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


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

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

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<RoleBasedHome />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Admin" element={<LayoutWrapper currentPageName="Admin"><Admin /></LayoutWrapper>} />
      <Route path="/BillingTracker" element={<LayoutWrapper currentPageName="BillingTracker"><BillingTracker /></LayoutWrapper>} />
      <Route path="/GroupLean" element={<LayoutWrapper currentPageName="GroupLean"><GroupLean /></LayoutWrapper>} />
      <Route path="/IndividualLean" element={<LayoutWrapper currentPageName="IndividualLean"><IndividualLean /></LayoutWrapper>} />
      <Route path="/ArchivedProjects" element={<LayoutWrapper currentPageName="ArchivedProjects"><ArchivedProjects /></LayoutWrapper>} />
      <Route path="/StrugglesSolutions" element={<LayoutWrapper currentPageName="StrugglesSolutions"><StrugglesSolutions /></LayoutWrapper>} />
      <Route path="/ProductionPlanning" element={<LayoutWrapper currentPageName="ProductionPlanning"><ProductionPlanning /></LayoutWrapper>} />
      <Route path="/MistakeReport" element={<LayoutWrapper currentPageName="MistakeReport"><MistakeReport /></LayoutWrapper>} />
      <Route path="/InventoryScan" element={<InventoryScan />} />
      <Route path="/ClientPortal" element={<ClientPortal />} />
      <Route path="/MyAssignments" element={<LayoutWrapper currentPageName="MyAssignments"><MyAssignments /></LayoutWrapper>} />
      <Route path="/Trainings" element={<LayoutWrapper currentPageName="Trainings"><Trainings /></LayoutWrapper>} />
      <Route path="/Flow" element={<LayoutWrapper currentPageName="Flow"><Flow /></LayoutWrapper>} />
      <Route path="/EducationCut" element={<LayoutWrapper currentPageName="EducationCut"><Education folder="Cut" /></LayoutWrapper>} />
      <Route path="/EducationFaceFrame" element={<LayoutWrapper currentPageName="EducationFaceFrame"><Education folder="Face Frame" /></LayoutWrapper>} />
      <Route path="/EducationSpray" element={<LayoutWrapper currentPageName="EducationSpray"><Education folder="Spray" /></LayoutWrapper>} />
      <Route path="/EducationBuild" element={<LayoutWrapper currentPageName="EducationBuild"><Education folder="Build" /></LayoutWrapper>} />
      <Route path="/EducationDelivery" element={<LayoutWrapper currentPageName="EducationDelivery"><Education folder="Delivery" /></LayoutWrapper>} />
      <Route path="/EducationInstall" element={<LayoutWrapper currentPageName="EducationInstall"><Education folder="Install" /></LayoutWrapper>} />
      <Route path="/EducationSpecialty" element={<LayoutWrapper currentPageName="EducationSpecialty"><Education folder="Specialty" /></LayoutWrapper>} />
      <Route path="/EducationGeneral" element={<LayoutWrapper currentPageName="EducationGeneral"><Education folder="General" /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App