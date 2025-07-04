import React, { useState, useEffect } from 'react';
import { fetchCourses, addCourse, updateCourse, deleteCourse } from '../services/courseService';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { PlusCircle, Upload, Download, Edit, Trash2, XCircle, BookOpen } from 'lucide-react';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null); // 'add', 'edit', 'import'

  // Form & Data States
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({});
  const [importData, setImportData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const courseResponse = await fetchCourses();
        setCourses(courseResponse || []);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const openModal = (type, course = null) => {
    setModalContent(type);
    setCurrentCourse(course);
    if (type === 'add') {
      setFormData({ Programme: '', Duration: '', Status: 'Active' });
    } else if (type === 'edit' && course) {
      setFormData(course);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setImportData([]);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const isEditing = modalContent === 'edit';
    const toastId = toast.loading(isEditing ? 'Updating course...' : 'Adding course...');

    try {
      const dataToSubmit = {
        ...formData,
        Duration: parseInt(formData.Duration),
      };

      if (isEditing) {
        const updated = await updateCourse(currentCourse.$id, dataToSubmit);
        setCourses(prev => prev.map(c => c.$id === updated.$id ? updated : c));
        toast.success('Course updated!', { id: toastId });
      } else {
        const newCourse = await addCourse(dataToSubmit);
        setCourses(prev => [newCourse, ...prev]);
        toast.success('Course added!', { id: toastId });
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || 'An error occurred.', { id: toastId });
    }
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      const toastId = toast.loading('Deleting course...');
      try {
        await deleteCourse(courseId);
        setCourses(prev => prev.filter(c => c.$id !== courseId));
        toast.success('Course deleted.', { id: toastId });
      } catch (err) {
        toast.error(err.message, { id: toastId });
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const validatedData = jsonData.map(row => {
            const errors = [];
            const programme = row.Programme?.trim();
            const duration = row.Duration ? parseInt(row.Duration, 10) : NaN;

            if (!programme) {
                errors.push("Programme name is missing.");
            }
            if (isNaN(duration)) {
                errors.push("Duration is invalid or missing.");
            }

            if (programme && !isNaN(duration)) {
                const isDuplicate = courses.some(
                    c => c.Programme.toLowerCase() === programme.toLowerCase() && c.Duration === duration
                );
                if (isDuplicate) {
                    errors.push("This course already exists in the system.");
                }
            }
            
            return { ...row, Programme: programme, Duration: duration, isValid: errors.length === 0, errors };
        });
        setImportData(validatedData);
        openModal('import');
      } catch (err) {
        toast.error("Failed to read the Excel file.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null; // Reset file input
  };

  const handleImportConfirm = async () => {
    const validData = importData.filter(row => row.isValid);
    if (validData.length === 0) {
        toast.error("No valid courses to import.");
        return;
    }
    const toastId = toast.loading(`Importing ${validData.length} courses...`);
    try {
        const creationPromises = validData.map(row => addCourse({
            Programme: row.Programme,
            Duration: row.Duration,
            Status: row.Status || 'Active',
        }));
        const newCourses = await Promise.all(creationPromises);
        setCourses(prev => [...prev, ...newCourses]);
        toast.success(`Successfully imported ${newCourses.length} courses!`, { id: toastId });
        closeModal();
    } catch (err) {
        toast.error(err.message, { id: toastId });
    }
  };
  
  const handleExport = () => {
    const formattedData = courses.map(course => ({
        'Programme': course.Programme,
        'Duration': course.Duration, // Keep it as a number for easier re-import
        'Status': course.Status,
        'Link Status': course.LinkStatus || 'Inactive',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Courses");
    worksheet['!cols'] = [{wch:30},{wch:15},{wch:15},{wch:15}];
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `Courses_Export.xlsx`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => openModal('add')} className="flex items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"><PlusCircle className="w-5 h-5 mr-2" />Add Course</button>
              <label className="flex items-center bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md cursor-pointer"><Upload className="w-5 h-5 mr-2" />Import<input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" /></label>
              <button onClick={handleExport} className="flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"><Download className="w-5 h-5 mr-2" />Export</button>
            </div>
          </div>

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
                    <p className="text-sm text-gray-500 mt-1">{course.Duration} Months</p>
                    <div className="flex items-center gap-2 mt-4">
                      <span className={`w-3 h-3 rounded-full ${course.Status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <p className="text-sm font-medium text-gray-600">Status: {course.Status}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => openModal('edit', course)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(course.$id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {courses.length === 0 && (
                <div className="col-span-full text-center py-10 bg-white rounded-2xl shadow-lg">
                    <BookOpen className="w-16 h-16 mx-auto text-gray-300" />
                    <p className="mt-4 text-gray-500">No courses found.</p>
                    <p className="text-sm text-gray-400">Add a new course to get started.</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-bold text-gray-900">
                  {modalContent === 'add' && 'Add New Course'}
                  {modalContent === 'edit' && 'Edit Course'}
                  {modalContent === 'import' && 'Import Courses'}
                </h3>
                <button onClick={closeModal} className="p-1 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6 text-gray-500" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {/* Add/Edit Form */}
                {(modalContent === 'add' || modalContent === 'edit') && (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Programme Name</label><input type="text" name="Programme" value={formData.Programme || ''} onChange={e => setFormData({...formData, Programme: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Duration (Months)</label><input type="number" name="Duration" value={formData.Duration || ''} onChange={e => setFormData({...formData, Duration: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium">Status</label><select name="Status" value={formData.Status || ''} onChange={e => setFormData({...formData, Status: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required><option>Active</option><option>Inactive</option></select></div>
                    </div>
                    <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl mt-6">
                        <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">{modalContent === 'edit' ? 'Save Changes' : 'Add Course'}</button>
                    </div>
                  </form>
                )}

                {/* Import View */}
                {modalContent === 'import' && (
                    <div>
                        {importData.length > 0 ? (
                            <div className="mt-4 max-h-80 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Programme</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Duration</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Status</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {importData.map((row, i) => (
                                            <tr key={i} className={!row.isValid ? 'bg-red-50' : ''}>
                                                <td className="px-2 py-2 text-sm">{row.Programme}{!row.isValid && <p className="text-xs text-red-600">{row.errors.join(', ')}</p>}</td>
                                                <td className="px-2 py-2 text-sm">{row.Duration}</td>
                                                <td className="px-2 py-2 text-sm">{row.isValid ? '✔️' : '❌'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-center text-gray-500">Please select an Excel file to import.</p>}
                        <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl mt-6">
                            <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                            <button type="button" onClick={handleImportConfirm} disabled={importData.length === 0 || !importData.some(r => r.isValid)} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">Confirm Import</button>
                        </div>
                    </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Courses;