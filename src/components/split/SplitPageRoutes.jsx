import { useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import { PaneSearchContext } from "@/lib/paneSearch";

import AccountSettings from "@/pages/AccountSettings";
import Calendar from "@/pages/Calendar";
import ChatBoard from "@/pages/ChatBoard";
import ContactsBoard from "@/pages/ContactsBoard";
import Dashboard from "@/pages/Dashboard";
import EncoreDocs from "@/pages/EncoreDocs";
import Forms from "@/pages/Forms";
import Inventory from "@/pages/Inventory";
import Invoicing from "@/pages/Invoicing";
import Kanban from "@/pages/Kanban";
import MorningMeeting from "@/pages/MorningMeeting";
import Notepad from "@/pages/Notepad";
import OrdersBoard from "@/pages/OrdersBoard";
import PickupList from "@/pages/PickupList";
import PlanBidding from "@/pages/PlanBidding";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import ProjectDetails from "@/pages/ProjectDetails";
import PurchaseOrders from "@/pages/PurchaseOrders";
import SOPBoard from "@/pages/SOPBoard";
import ShopProduction from "@/pages/ShopProduction";
import StretchingRoutine from "@/pages/StretchingRoutine";
import Suppliers from "@/pages/Suppliers";
import Team from "@/pages/Team";
import TimeSheet from "@/pages/TimeSheet";
import Tools from "@/pages/Tools";
import Presentations from "@/pages/Presentations";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import Assignments from "@/pages/Assignments";
import Admin from "@/pages/Admin";
import BillingTracker from "@/pages/BillingTracker";
import GroupLean from "@/pages/GroupLean";
import IndividualLean from "@/pages/IndividualLean";
import ArchivedProjects from "@/pages/ArchivedProjects";
import StrugglesSolutions from "@/pages/StrugglesSolutions";
import ProductionPlanning from "@/pages/ProductionPlanning";
import MistakeReport from "@/pages/MistakeReport";
import MyProfile from "@/pages/MyProfile";
import MyAssignments from "@/pages/MyAssignments";
import Trainings from "@/pages/Trainings";
import Flow from "@/pages/Flow";
import Education from "@/pages/Education";

// Education folders are one page with a prop, so each folder gets a stable wrapper.
const EducationCut = () => <Education folder="Cut" />;
const EducationFaceFrame = () => <Education folder="Face Frame" />;
const EducationSpray = () => <Education folder="Spray" />;
const EducationBuild = () => <Education folder="Build" />;
const EducationDelivery = () => <Education folder="Delivery" />;
const EducationInstall = () => <Education folder="Install" />;
const EducationSpecialty = () => <Education folder="Specialty" />;
const EducationGeneral = () => <Education folder="General" />;

export const SPLIT_PAGES = {
  AccountSettings,
  Calendar,
  ChatBoard,
  ContactsBoard,
  Dashboard,
  EncoreDocs,
  Forms,
  Inventory,
  Invoicing,
  Kanban,
  MorningMeeting,
  Notepad,
  OrdersBoard,
  PickupList,
  PlanBidding,
  PrivacyPolicy,
  ProjectDetails,
  PurchaseOrders,
  SOPBoard,
  ShopProduction,
  StretchingRoutine,
  Suppliers,
  Team,
  TimeSheet,
  Tools,
  Presentations,
  EmployeeDashboard,
  Assignments,
  Admin,
  BillingTracker,
  GroupLean,
  IndividualLean,
  ArchivedProjects,
  StrugglesSolutions,
  ProductionPlanning,
  MistakeReport,
  MyProfile,
  MyAssignments,
  Trainings,
  Flow,
  EducationCut,
  EducationFaceFrame,
  EducationSpray,
  EducationBuild,
  EducationDelivery,
  EducationInstall,
  EducationSpecialty,
  EducationGeneral,
};

/**
 * Routes for the secondary pane. It matches against the pane's own location,
 * so navigating inside the pane never disturbs the page on the other side.
 */
export default function SplitPageRoutes({ path, search }) {
  const paneSearch = search || "";
  const paneLocation = useMemo(
    () => ({ pathname: path, search: paneSearch, hash: "", state: null, key: "pane" }),
    [path, paneSearch]
  );

  return (
    <PaneSearchContext.Provider value={paneSearch}>
      <Routes location={paneLocation}>
        {Object.entries(SPLIT_PAGES).map(([pagePath, Page]) => (
          <Route key={pagePath} path={`/${pagePath}`} element={<Page />} />
        ))}
        <Route
          path="*"
          element={
            <div className="p-6 text-sm text-slate-500">
              Pick a page for this side from the menu above.
            </div>
          }
        />
      </Routes>
    </PaneSearchContext.Provider>
  );
}