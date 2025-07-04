import React, { useState, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fetchHolidays } from '../services/holidayService';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import { Calendar as CalendarIcon, UserCheck, UserX, Clock, PlusCircle, Edit, Trash2, Download } from 'lucide-react';

// Helper function to format date for display
const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Helper function to format date for input[type=datetime-local]
const formatToDateTimeLocal = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function AttendanceList() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Form States
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [bulkCourseId, setBulkCourseId] = useState('');
  const [bulkSemester, setBulkSemester] = useState('');
  const [studentStatuses, setStudentStatuses] = useState({});
  const [location, setLocation] = useState({ Latitude: '', Longitude: '' });
  
  // Export States
  const [exportType, setExportType] = useState('dateRange');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStudentId, setExportStudentId] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [holidayDocs, attendanceResponse, studentsResponse, coursesResponse] = await Promise.all([
          fetchHolidays(),
          getAttendance(),
          getStudents(),
          fetchCourses()
        ]);

        setHolidays(holidayDocs.map(h => ({ from: new Date(h.Date_from), to: new Date(h.Date_to), title: h.Title })) || []);
        setAttendanceRecords(attendanceResponse || []);
        setStudents(studentsResponse?.documents || []);
        setCourses(coursesResponse || []);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to fetch data. Please try again.');
        toast.error('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  
  const holidayDates = useMemo(() => {
    return holidays.flatMap(h => {
        const dates = [];
        let current = new Date(h.from);
        current.setHours(0,0,0,0);
        const endDate = new Date(h.to);
        endDate.setHours(0,0,0,0);
        while(current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    });
  }, [holidays]);

  const disabledDays = [{ dayOfWeek: [0, 6] }, ...holidayDates];

  const handleDateSelect = (date) => {
    if (date) setSelectedDate(date);
  };
  
  const dailyRecords = useMemo(() => {
    if (!selectedDate) return [];
    return attendanceRecords.filter(record => {
      const recordDate = new Date(record.Marked_at);
      return recordDate.toDateString() === selectedDate.toDateString();
    });
  }, [selectedDate, attendanceRecords]);

  const groupedRecords = useMemo(() => {
    return dailyRecords.reduce((acc, record) => {
      const student = students.find(s => s.$id === (record.Student_Id?.$id || record.Student_Id));
      if (!student) return acc;

      const courseId = student.Course?.$id || 'unknown';
      const semester = student.Semester || 'N/A';

      if (!acc[courseId]) {
        const course = courses.find(c => c.$id === courseId);
        acc[courseId] = {
          courseName: course ? course.Programme : 'Unknown Course',
          semesters: {},
        };
      }

      if (!acc[courseId].semesters[semester]) {
        acc[courseId].semesters[semester] = [];
      }

      acc[courseId].semesters[semester].push(record);
      return acc;
    }, {});
  }, [dailyRecords, students, courses]);

  // --- Edit Modal Logic ---
  const openEditModal = (record) => {
    setCurrentAttendance(record);
    setEditFormData({
      Status: record.Status,
      Marked_at: formatToDateTimeLocal(new Date(record.Marked_at)),
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Updating...');
    try {
      const data = {
        ...currentAttendance,
        Status: editFormData.Status,
        Marked_at: new Date(editFormData.Marked_at).toISOString(),
      };
      const updated = await updateAttendance(currentAttendance.$id, data);
      setAttendanceRecords(prev => prev.map(r => r.$id === updated.$id ? updated : r));
      toast.success('Attendance updated!', { id: toastId });
      closeEditModal();
    } catch (err) {
      toast.error(err.message || 'An error occurred.', { id: toastId });
    }
  };

  // --- Bulk Add Modal Logic ---
  const openBulkModal = () => {
    setBulkCourseId('');
    setBulkSemester('');
    setStudentStatuses({});
    setLocation({ Latitude: '', Longitude: '' });
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => setIsBulkModalOpen(false);

  const availableSemesters = useMemo(() => {
    if (!bulkCourseId) return [];
    const studentsInCourse = students.filter(s => s.Course?.$id === bulkCourseId);
    const semesters = new Set(studentsInCourse.map(s => s.Semester).filter(Boolean));
    return Array.from(semesters).sort((a, b) => a - b);
  }, [bulkCourseId, students]);

  useEffect(() => {
    setBulkSemester('');
  }, [bulkCourseId]);

  const studentsForBulkAdd = useMemo(() => {
    if (!bulkCourseId) return [];
    let studentsInCourse = students.filter(s => s.Course?.$id === bulkCourseId);
    if (bulkSemester) {
        studentsInCourse = studentsInCourse.filter(s => s.Semester === parseInt(bulkSemester));
    }
    const studentsWithAttendance = dailyRecords.map(r => r.Student_Id?.$id || r.Student_Id);
    return studentsInCourse.filter(s => !studentsWithAttendance.includes(s.$id));
  }, [bulkCourseId, bulkSemester, students, dailyRecords]);
  
  const groupedStudentsForBulkAdd = useMemo(() => {
      return studentsForBulkAdd.reduce((acc, student) => {
          const semester = student.Semester || 'N/A';
          if (!acc[semester]) {
              acc[semester] = [];
          }
          acc[semester].push(student);
          return acc;
      }, {});
  }, [studentsForBulkAdd]);

  useEffect(() => {
    const initialStatuses = {};
    studentsForBulkAdd.forEach(s => {
      initialStatuses[s.$id] = 'Present';
    });
    setStudentStatuses(initialStatuses);
  }, [studentsForBulkAdd]);

  const handleBulkStatusChange = (studentId, status) => {
    setStudentStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status) => {
    const newStatuses = { ...studentStatuses };
    studentsForBulkAdd.forEach(s => {
      newStatuses[s.$id] = status;
    });
    setStudentStatuses(newStatuses);
  };

  const handleGetLocation = () => {
    toast.loading('Fetching location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ Latitude: position.coords.latitude.toString(), Longitude: position.coords.longitude.toString() });
        toast.dismiss();
        toast.success('Location captured!');
      },
      (error) => {
        toast.dismiss();
        toast.error('Failed to get location: ' + error.message);
      }
    );
  };

  const handleBulkSubmit = async () => {
    if (!bulkCourseId || !location.Latitude || !location.Longitude) {
        toast.error("Please select a course and set a location.");
        return;
    }
    const toastId = toast.loading('Submitting attendance...');
    try {
        const recordsToCreate = Object.entries(studentStatuses).map(([studentId, status]) => ({
            Student_Id: studentId,
            Status: status,
            Course_Id: bulkCourseId,
            Marked_By: 'Admin',
            Marked_at: selectedDate.toISOString(),
            Latitude: parseFloat(location.Latitude),
            Longitude: parseFloat(location.Longitude),
        }));

        if (recordsToCreate.length === 0) {
            toast.success("No new records to add.", { id: toastId });
            closeBulkModal();
            return;
        }
        const newRecords = await Promise.all(recordsToCreate.map(data => createAttendance(data)));
        setAttendanceRecords(prev => [...prev, ...newRecords]);
        toast.success(`Added ${newRecords.length} attendance records!`, { id: toastId });
        closeBulkModal();
    } catch (err) {
        toast.error(err.message || 'An error occurred.', { id: toastId });
    }
  };

  // --- Export Logic ---
  const openExportModal = () => setIsExportModalOpen(true);
  const closeExportModal = () => setIsExportModalOpen(false);

  const handleExport = () => {
    let dataToExport = [];
    let filename = 'attendance_report.xlsx';

    if (exportType === 'dateRange') {
        if (!exportStartDate || !exportEndDate) {
            toast.error("Please select a start and end date.");
            return;
        }
        const start = new Date(exportStartDate);
        start.setHours(0,0,0,0);
        const end = new Date(exportEndDate);
        end.setHours(23,59,59,999);

        dataToExport = attendanceRecords.filter(record => {
            const recordDate = new Date(record.Marked_at);
            return recordDate >= start && recordDate <= end;
        });
        filename = `Attendance_${exportStartDate}_to_${exportEndDate}.xlsx`;
    } else if (exportType === 'individualStudent') {
        if (!exportStudentId) {
            toast.error("Please select a student.");
            return;
        }
        dataToExport = attendanceRecords.filter(record => (record.Student_Id?.$id || record.Student_Id) === exportStudentId);
        const studentName = students.find(s => s.$id === exportStudentId)?.Name || 'student';
        filename = `Attendance_${studentName.replace(' ', '_')}.xlsx`;
    }

    if (dataToExport.length === 0) {
        toast.error("No data found for the selected criteria.");
        return;
    }

    const formattedData = dataToExport.map(record => {
        const student = students.find(s => s.$id === (record.Student_Id?.$id || record.Student_Id));
        const course = courses.find(c => c.$id === record.Course_Id);
        return {
            'Date': new Date(record.Marked_at).toLocaleDateString(),
            'Time': new Date(record.Marked_at).toLocaleTimeString(),
            'Student Name': student ? student.Name : 'Unknown',
            'ABC ID': student ? student.ABC_ID : 'N/A',
            'Course': course ? course.Programme : 'Unknown',
            'Semester': student ? student.Semester : 'N/A',
            'Status': record.Status,
            'Marked By': record.Marked_By,
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    
    // Set column widths
    worksheet['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, filename);
    closeExportModal();
  };

  // --- General Functions ---
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
        const toastId = toast.loading('Deleting...');
        try {
            await deleteAttendance(id);
            setAttendanceRecords(prev => prev.filter(r => r.$id !== id));
            toast.success('Record deleted.', { id: toastId });
        } catch (err) {
            toast.error(err.message || 'Failed to delete.', { id: toastId });
        }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'Absent': return <UserX className="w-5 h-5 text-red-500" />;
      case 'Late': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return null;
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-lg h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Select a Date</h2>
            <DayPicker mode="single" selected={selectedDate} onSelect={handleDateSelect} disabled={disabledDays} modifiers={{ holiday: holidayDates }} modifiersStyles={{ holiday: { backgroundColor: '#E0F2FE', color: '#0284C7' }, disabled: { color: '#9CA3AF' }, selected: { backgroundColor: '#4F46E5', color: 'white' } }} footer={<div className="text-xs text-center text-gray-500 mt-2"><p><span className="inline-block w-3 h-3 bg-cyan-100 rounded-full mr-2"></span>Holidays</p><p><span className="inline-block w-3 h-3 bg-gray-200 rounded-full mr-2"></span>Weekends</p></div>} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
                  <p className="text-indigo-600 font-semibold mt-1">{formatDate(selectedDate)}</p>
                </div>
                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                    <button onClick={openBulkModal} className="flex items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"><PlusCircle className="w-5 h-5 mr-2" />Add Class Attendance</button>
                    <button onClick={openExportModal} className="flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"><Download className="w-5 h-5 mr-2" />Export</button>
                </div>
              </div>

              <AnimatePresence>
                {Object.keys(groupedRecords).length > 0 ? (
                  Object.entries(groupedRecords).map(([courseId, { courseName, semesters }]) => (
                    <motion.div key={courseId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 last:mb-0">
                      <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4">{courseName}</h3>
                      {Object.entries(semesters).sort(([semA], [semB]) => semA - semB).map(([semester, records]) => (
                        <div key={semester} className="mt-4 pl-2">
                            <h4 className="text-md font-semibold text-gray-600 mb-3">Semester {semester}</h4>
                            <div className="space-y-3">
                                {records.map(record => {
                                    const student = students.find(s => s.$id === (record.Student_Id?.$id || record.Student_Id));
                                    return (
                                        <div key={record.$id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center"><div className="flex-shrink-0">{getStatusIcon(record.Status)}</div><span className="font-medium text-gray-700 ml-3">{student ? student.Name : 'Unknown Student'}</span><span className="text-sm text-gray-500 ml-2">({record.Status})</span></div>
                                            <div className="flex items-center space-x-2"><button onClick={() => openEditModal(record)} className="p-1 text-gray-500 hover:text-indigo-600"><Edit className="w-4 h-4"/></button><button onClick={() => handleDelete(record.$id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                      ))}
                    </motion.div>
                  ))
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10"><CalendarIcon className="w-16 h-16 mx-auto text-gray-300" /><p className="mt-4 text-gray-500">No attendance records for this day.</p><p className="text-sm text-gray-400">Select another date or add a new record.</p></motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>{isEditModalOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md"><form onSubmit={handleEditSubmit}><div className="p-6"><h3 className="text-xl font-bold text-gray-900 mb-4">Edit Attendance</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select name="Status" value={editFormData.Status} onChange={(e) => setEditFormData({...editFormData, Status: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm" required><option>Present</option><option>Absent</option><option>Late</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Marked At</label><input type="datetime-local" name="Marked_at" value={editFormData.Marked_at} onChange={(e) => setEditFormData({...editFormData, Marked_at: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm" required /></div></div></div><div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl"><button type="button" onClick={closeEditModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">Save Changes</button></div></form></motion.div></motion.div>}</AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>{isBulkModalOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl"><div className="p-6"><h3 className="text-xl font-bold text-gray-900 mb-4">Bulk Add Attendance for {formatDate(selectedDate)}</h3><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><select value={bulkCourseId} onChange={e => setBulkCourseId(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm" required><option value="">Select a Course</option>{courses.map(c => <option key={c.$id} value={c.$id}>{c.Programme}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Semester (Optional)</label><select value={bulkSemester} onChange={e => setBulkSemester(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm" disabled={!bulkCourseId || availableSemesters.length === 0}><option value="">All Semesters</option>{availableSemesters.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}</select></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><div className="flex gap-2"><input type="text" placeholder="Lat" value={location.Latitude} onChange={e => setLocation({...location, Latitude: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm" /><input type="text" placeholder="Lon" value={location.Longitude} onChange={e => setLocation({...location, Longitude: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm" /><button type="button" onClick={handleGetLocation} className="p-2 bg-gray-100 rounded-lg">📍</button></div></div><div className="flex justify-between items-center mt-4"><h4 className="font-semibold">Student Roster</h4><div className="space-x-2"><button onClick={() => handleMarkAll('Present')} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">All Present</button><button onClick={() => handleMarkAll('Absent')} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">All Absent</button></div></div><div className="max-h-64 overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-lg">{Object.keys(groupedStudentsForBulkAdd).length > 0 ? Object.entries(groupedStudentsForBulkAdd).map(([semester, studentList]) => (<div key={semester}><h5 className="font-bold text-sm text-gray-500 px-1 py-2">Semester {semester}</h5><div className="space-y-2">{studentList.map(s => (<div key={s.$id} className="flex justify-between items-center bg-white p-2 rounded"><span className="font-medium text-sm">{s.Name}</span><div className="flex gap-1">{['Present', 'Absent', 'Late'].map(status => (<button key={status} type="button" onClick={() => handleBulkStatusChange(s.$id, status)} className={`px-2 py-1 text-xs rounded-full ${studentStatuses[s.$id] === status ? 'text-white ' + (status === 'Present' ? 'bg-green-500' : status === 'Absent' ? 'bg-red-500' : 'bg-yellow-500') : 'bg-gray-200 text-gray-700'}`}>{status}</button>))}</div></div>))}</div></div>)) : <p className="text-center text-gray-500 py-4">{bulkCourseId ? "All students in this selection have been marked." : "Select a course to see students."}</p>}</div></div></div><div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl"><button type="button" onClick={closeBulkModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="button" onClick={handleBulkSubmit} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">Save Attendance</button></div></motion.div></motion.div>}</AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>{isExportModalOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md"><div className="p-6"><h3 className="text-xl font-bold text-gray-900 mb-4">Export Attendance</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Export Type</label><select value={exportType} onChange={e => setExportType(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm"><option value="dateRange">Date Range</option><option value="individualStudent">Individual Student</option></select></div>{exportType === 'dateRange' && (<div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm" /></div></div>)}{exportType === 'individualStudent' && (<div><label className="block text-sm font-medium text-gray-700 mb-1">Student</label><select value={exportStudentId} onChange={e => setExportStudentId(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm"><option value="">Select Student</option>{students.map(s => <option key={s.$id} value={s.$id}>{s.Name}</option>)}</select></div>)}</div></div><div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl"><button type="button" onClick={closeExportModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm">Cancel</button><button type="button" onClick={handleExport} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Export</button></div></motion.div></motion.div>}</AnimatePresence>
    </>
  );
}

export default AttendanceList;
