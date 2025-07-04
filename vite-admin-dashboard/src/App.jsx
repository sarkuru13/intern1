import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseLinkPage from './pages/CourseLinkPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/link/:programme/:semester" element={<CourseLinkPage />} />
      </Routes>
    </Router>
  );
}

export default App;
