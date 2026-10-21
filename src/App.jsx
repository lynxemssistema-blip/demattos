import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import TrackingInjector from '@/components/TrackingInjector'
import AdminRastreamento from '@/pages/AdminRastreamento'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
// useLocation used in AuthenticatedApp for AnimatePresence
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MobileBottomNav from '@/components/home/MobileBottomNav';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Só bloqueia se houver erro que exige ação imediata (login obrigatório / usuário não registrado)
  // Não bloqueia por loading — a Home renderiza imediatamente
  if (!isLoadingPublicSettings && !isLoadingAuth && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </PageTransition>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <PageTransition>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </PageTransition>
            }
          />
        ))}
        <Route path="/AdminRastreamento" element={<PageTransition><LayoutWrapper currentPageName="AdminRastreamento"><AdminRastreamento /></LayoutWrapper></PageTransition>} />
        <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};


function App() {
  // Detecção automática de dark mode (prefers-color-scheme)
  React.useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Detectar mudanças do sistema (quando usuário muda tema no celular)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Adicionar listener com suporte a navegadores antigos
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Aplicar fixes para Safari iOS
  React.useEffect(() => {
    // Prevenir zoom automático ao focar em inputs com font-size < 16px
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.style.fontSize = '16px';
    });

    // Listener para novos inputs adicionados dinamicamente
    const observer = new MutationObserver(() => {
      const newInputs = document.querySelectorAll('input[style*="font-size"], textarea[style*="font-size"], select[style*="font-size"]');
      newInputs.forEach(input => {
        if (parseInt(window.getComputedStyle(input).fontSize) < 16) {
          input.style.fontSize = '16px';
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TrackingInjector />
          <NavigationTracker />
          <AuthenticatedApp />
          {/* MobileBottomNav fora do guard de auth — sempre presente no DOM desde o primeiro frame */}
          <MobileBottomNav />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App