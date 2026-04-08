import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Positions from './pages/Positions';
import Orders from './pages/Orders';
import MarketData from './pages/MarketData';
import Strategies from './pages/Strategies';
import Risk from './pages/Risk';
import Configuration from './pages/Configuration';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/market" element={<MarketData />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
