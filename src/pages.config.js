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
import Admin from './pages/Admin';
import AdminAgendamentos from './pages/AdminAgendamentos';
import AdminAssistente from './pages/AdminAssistente';
import AdminCarrossel from './pages/AdminCarrossel';
import AdminClientes from './pages/AdminClientes';
import AdminCombos from './pages/AdminCombos';
import AdminConfiguracoes from './pages/AdminConfiguracoes';
import AdminDepoimentos from './pages/AdminDepoimentos';
import AdminGaleria from './pages/AdminGaleria';
import AdminInstagramVideos from './pages/AdminInstagramVideos';
import AdminPacotesCredito from './pages/AdminPacotesCredito';
import AdminProdutos from './pages/AdminProdutos';
import AdminProfissionais from './pages/AdminProfissionais';
import AdminServicos from './pages/AdminServicos';
import AgendaProfissional from './pages/AgendaProfissional';
import CanalCliente from './pages/CanalCliente';
import Carrinho from './pages/Carrinho';
import Catalogo from './pages/Catalogo';
import ComboLanding from './pages/ComboLanding';
import Home from './pages/Home';
import ProdutoLanding from './pages/ProdutoLanding';
import StripeCancel from './pages/StripeCancel';
import StripeSuccess from './pages/StripeSuccess';
import AdminTentativasCompra from './pages/AdminTentativasCompra';
import AdminWhatsApp from './pages/AdminWhatsApp';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminAgendamentos": AdminAgendamentos,
    "AdminAssistente": AdminAssistente,
    "AdminCarrossel": AdminCarrossel,
    "AdminClientes": AdminClientes,
    "AdminCombos": AdminCombos,
    "AdminConfiguracoes": AdminConfiguracoes,
    "AdminDepoimentos": AdminDepoimentos,
    "AdminGaleria": AdminGaleria,
    "AdminInstagramVideos": AdminInstagramVideos,
    "AdminPacotesCredito": AdminPacotesCredito,
    "AdminProdutos": AdminProdutos,
    "AdminProfissionais": AdminProfissionais,
    "AdminServicos": AdminServicos,
    "AgendaProfissional": AgendaProfissional,
    "CanalCliente": CanalCliente,
    "Carrinho": Carrinho,
    "Catalogo": Catalogo,
    "ComboLanding": ComboLanding,
    "Home": Home,
    "ProdutoLanding": ProdutoLanding,
    "StripeCancel": StripeCancel,
    "StripeSuccess": StripeSuccess,
    "AdminTentativasCompra": AdminTentativasCompra,
    "AdminWhatsApp": AdminWhatsApp,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};