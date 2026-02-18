import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import Writing from './pages/Writing';
import Connect from './pages/Connect';
import Thesis from './pages/learn/Thesis';
import Patterns from './pages/learn/Patterns';
import Glossary from './pages/learn/Glossary';
import CaseStudy from './pages/learn/CaseStudy';
import REA from './pages/learn/REA';
import Matrix from './pages/learn/Matrix';

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
            <Route path="/projects" element={<Projects />} />
            <Route path="/writing" element={<Writing />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/learn/thesis" element={<Thesis />} />
            <Route path="/learn/patterns" element={<Patterns />} />
            <Route path="/learn/glossary" element={<Glossary />} />
            <Route path="/learn/case-study" element={<CaseStudy />} />
            <Route path="/learn/rea" element={<REA />} />
            <Route path="/learn/matrix" element={<Matrix />} />
            {/* Catch-all */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
