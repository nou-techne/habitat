import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import Writing from './pages/Writing';
import Connect from './pages/Connect';
import Thesis from './pages/Thesis';
import Patterns from './pages/Patterns';
import Glossary from './pages/Glossary';
import CaseStudy from './pages/CaseStudy';
import REA from './pages/REA';
import Matrix from './pages/Matrix';
import Agents from './pages/Agents';
import Patronage from './pages/Patronage';
import Identity from './pages/Identity';
import Compliance from './pages/Compliance';
import FAQ from './pages/FAQ';
import License from './pages/License';

// Global reset
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { overflow-x: hidden; }
  a { text-decoration: none; }
  ::selection { background: rgba(124, 200, 104, 0.3); }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/about/" element={<About />} />
            <Route path="/matrix" element={<Matrix />} />
            <Route path="/matrix/" element={<Matrix />} />
            <Route path="/patronage" element={<Patronage />} />
            <Route path="/patronage/" element={<Patronage />} />
            <Route path="/identity" element={<Identity />} />
            <Route path="/identity/" element={<Identity />} />
            <Route path="/thesis" element={<Thesis />} />
            <Route path="/thesis/" element={<Thesis />} />
            <Route path="/journal" element={<Writing />} />
            <Route path="/journal/" element={<Writing />} />
            <Route path="/writing" element={<Navigate to="/journal" replace />} />
            <Route path="/writing/" element={<Navigate to="/journal" replace />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/" element={<Agents />} />
            <Route path="/patterns" element={<Patterns />} />
            <Route path="/patterns/" element={<Patterns />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/glossary/" element={<Glossary />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/compliance/" element={<Compliance />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/faq/" element={<FAQ />} />
            <Route path="/license" element={<License />} />
            <Route path="/license/" element={<License />} />
            <Route path="/rea" element={<REA />} />
            <Route path="/rea/" element={<REA />} />
            <Route path="/case-study" element={<CaseStudy />} />
            <Route path="/case-study/" element={<CaseStudy />} />
            {/* Legacy routes - keep for now */}
            <Route path="/projects" element={<Projects />} />
            <Route path="/connect" element={<Connect />} />
            {/* Catch-all */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
