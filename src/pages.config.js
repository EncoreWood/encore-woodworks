/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Calendar from './pages/Calendar';
import ChatBoard from './pages/ChatBoard';
import Dashboard from './pages/Dashboard';
import EncoreDocs from './pages/EncoreDocs';
import Forms from './pages/Forms';
import Inventory from './pages/Inventory';
import Invoicing from './pages/Invoicing';
import Kanban from './pages/Kanban';
import MorningMeeting from './pages/MorningMeeting';
import OrdersBoard from './pages/OrdersBoard';
import PickupList from './pages/PickupList';
import ProjectDetails from './pages/ProjectDetails';
import PurchaseOrders from './pages/PurchaseOrders';
import SOPBoard from './pages/SOPBoard';
import ShopProduction from './pages/ShopProduction';
import StretchingRoutine from './pages/StretchingRoutine';
import Suppliers from './pages/Suppliers';
import Team from './pages/Team';
import TimeSheet from './pages/TimeSheet';
import Tools from './pages/Tools';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "ChatBoard": ChatBoard,
    "Dashboard": Dashboard,
    "EncoreDocs": EncoreDocs,
    "Forms": Forms,
    "Inventory": Inventory,
    "Invoicing": Invoicing,
    "Kanban": Kanban,
    "MorningMeeting": MorningMeeting,
    "OrdersBoard": OrdersBoard,
    "PickupList": PickupList,
    "ProjectDetails": ProjectDetails,
    "PurchaseOrders": PurchaseOrders,
    "SOPBoard": SOPBoard,
    "ShopProduction": ShopProduction,
    "StretchingRoutine": StretchingRoutine,
    "Suppliers": Suppliers,
    "Team": Team,
    "TimeSheet": TimeSheet,
    "Tools": Tools,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};