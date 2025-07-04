import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/authService';
import Students from './Students';
import Courses from './Courses';
import Holidays from './Holidays';
import Attendance from './Attendance';
import AttendanceList from './AttendanceList';
import SettingsPage from './SettingsPage';
import Overview from './Overview';
import { Users, BookOpen, Calendar, CheckCircle, Settings, List } from 'lucide-react';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !(currentUser.labels?.includes('admin') || currentUser.prefs?.role === 'admin')) {
          navigate('/');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth:', error.message);
        navigate('/');
      }
    }
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'students':
        return <Students />;
      case 'attendance':
        return <Attendance />;
      case 'attendance-overview':
        return <AttendanceList />;
      case 'courses':
        return <Courses />;
      case 'holidays':
        return <Holidays />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Overview user={user} />;
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
          <div className="text-gray-900 text-xl font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:z-10`}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => handleSectionChange(null)}>
            Admin Dashboard
          </h2>
          <button className="md:hidden" onClick={toggleSidebar}>
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto mt-2 mb-2">
          <button
            onClick={() => handleSectionChange(null)}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
              activeSection === null ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => handleSectionChange('students')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
              activeSection === 'students' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5 mr-3" />
            Students
          </button>
          <button
            onClick={() => handleSectionChange('attendance')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
              activeSection === 'attendance' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CheckCircle className="h-5 w-5 mr-3" />
            Attendance
          </button>
          <button
            onClick={() => handleSectionChange('attendance-overview')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
              activeSection === 'attendance-overview' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <List className="h-5 w-5 mr-3" />
            Attendance Overview
          </button>
          <button
            onClick={() => handleSectionChange('courses')}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
              activeSection === 'courses' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-5 w-5 mr-3" />
            Courses
          </button>
        </nav>
        <div className="flex-shrink-0 p-6 border-t border-gray-200">
          <button
            onClick={() => handleSectionChange('holidays')}
            className={`w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
              activeSection === 'holidays' ? 'bg-indigo-50 text-indigo-600' : ''
            }`}
          >
            <Calendar className="h-5 w-5 mr-3" />
            Holidays
          </button>
          <button
            onClick={() => handleSectionChange('settings')}
            className={`w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
              activeSection === 'settings' ? 'bg-indigo-50 text-indigo-600' : ''
            }`}
          >
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen md:ml-72">
        <header className="flex-shrink-0 bg-white shadow-lg p-6 flex justify-between items-center md:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <button onClick={toggleSidebar}>
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:pt-6">
          {renderContent()}
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default Dashboard;