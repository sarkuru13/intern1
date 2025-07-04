import React, { useState, useEffect, useMemo } from 'react';
import { fetchCourses, updateCourse } from '../services/courseService';
import { getStudents } from '../services/studentService';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, QrCode, XCircle } from 'lucide-react';

function Attendance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [courseResponse, studentResponse] = await Promise.all([
          fetchCourses(),
          getStudents(),
        ]);
        setCourses(courseResponse || []);
        setStudents(studentResponse?.documents || []);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const availableSemesters = useMemo(() => {
    if (!selectedCourse) return [];
    const studentsInCourse = students.filter(s => s.Course?.$id === selectedCourse.$id);
    const semesters = new Set(studentsInCourse.map(s => s.Semester).filter(Boolean));
    return Array.from(semesters).sort((a, b) => a - b);
  }, [selectedCourse, students]);

  const handleToggleLinkStatus = async (course) => {
    const newStatus = course.LinkStatus === 'Active' ? 'Inactive' : 'Active';
    const toastId = toast.loading(`${newStatus === 'Active' ? 'Activating' : 'Deactivating'} link...`);
    try {
      const updatedData = { ...course, LinkStatus: newStatus };
      const updated = await updateCourse(course.$id, updatedData);
      setCourses(prev => prev.map(c => (c.$id === course.$id ? updated : c)));
      toast.success(`Link ${newStatus.toLowerCase()}d successfully.`, { id: toastId });
    } catch (err) {
      toast.error('Failed to update link status: ' + err.message, { id: toastId });
    }
  };

  const handleOpenSemesterModal = (course) => {
    setSelectedCourse(course);
    setSelectedSemester('');
    setIsModalOpen(true);
  };

  const handleConfirmSemester = () => {
    if (!selectedSemester) {
      toast.error("Please select a semester.");
      return;
    }
    navigate(`/link/${encodeURIComponent(selectedCourse.Programme)}/${selectedSemester}`);
    setIsModalOpen(false);
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50">{error}</div>;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Course Attendance Links</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {courses.map(course => (
                <motion.div
                  key={course.$id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{course.Programme}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`w-3 h-3 rounded-full ${course.LinkStatus === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <p className="text-sm font-medium text-gray-600">Link Status: {course.LinkStatus}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => handleToggleLinkStatus(course)}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-white font-semibold transition-colors ${course.LinkStatus === 'Active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                      <Power className="w-5 h-5" />
                      {course.LinkStatus === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleOpenSemesterModal(course)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                    >
                      <QrCode className="w-5 h-5" />
                      Take Attendance
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Select Semester</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6 text-gray-500" /></button>
                </div>
                <p className="text-gray-600 mt-1">For course: <span className="font-semibold">{selectedCourse?.Programme}</span></p>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={e => setSelectedSemester(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a semester</option>
                    {availableSemesters.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                <button type="button" onClick={handleConfirmSemester} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">Confirm & Proceed</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Attendance;