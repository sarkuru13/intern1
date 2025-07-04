import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { PlusCircle, Upload, Download, Search, User, Edit, Trash2, XCircle } from 'lucide-react';

function Students() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null); // 'add', 'edit', 'details', 'import', 'export'

  // Form & Data States
  const [currentStudent, setCurrentStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [importData, setImportData] = useState([]);
  
  // Filter States
  const [courseFilter, setCourseFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Export States
  const [exportCourse, setExportCourse] = useState('');
  const [exportSemester, setExportSemester] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [studentResponse, courseResponse] = await Promise.all([
          getStudents(),
          fetchCourses(),
        ]);
        setStudents(studentResponse.documents || []);
        setCourses(courseResponse || []);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredAndGroupedStudents = useMemo(() => {
    const filtered = students.filter(student => {
        const matchesCourse = courseFilter ? student.Course?.$id === courseFilter : true;
        const matchesSemester = semesterFilter ? student.Semester === parseInt(semesterFilter) : true;
        const matchesSearch = searchTerm ? student.Name.toLowerCase().includes(searchTerm.toLowerCase()) || student.ABC_ID.toString().includes(searchTerm) : true;
        return matchesCourse && matchesSemester && matchesSearch;
    });

    return filtered.reduce((acc, student) => {
        const courseName = student.Course?.Programme || 'Unassigned';
        const semester = student.Semester || 'N/A';
        if (!acc[courseName]) {
            acc[courseName] = {};
        }
        if (!acc[courseName][semester]) {
            acc[courseName][semester] = [];
        }
        acc[courseName][semester].push(student);
        return acc;
    }, {});
  }, [students, courseFilter, semesterFilter, searchTerm]);

  const availableSemesters = useMemo(() => {
    const filterId = courseFilter || exportCourse;
    if (!filterId) return [];
    const studentsInCourse = students.filter(s => s.Course?.$id === filterId);
    const semesters = new Set(studentsInCourse.map(s => s.Semester).filter(Boolean));
    return Array.from(semesters).sort((a, b) => a - b);
  }, [courseFilter, exportCourse, students]);

  const openModal = (type, student = null) => {
    setModalContent(type);
    setCurrentStudent(student);
    if (type === 'add') {
        setFormData({ Name: '', Gender: '', ABC_ID: '', Status: 'Active', Course: '', Semester: '', Batch: '', Year: '', Address: '' });
    } else if (type === 'edit' && student) {
        setFormData({ ...student, Course: student.Course?.$id });
    } else if (type === 'export') {
        setExportCourse('');
        setExportSemester('');
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
    const toastId = toast.loading(isEditing ? 'Updating student...' : 'Adding student...');
    
    try {
        const dataToSubmit = {
            ...formData,
            ABC_ID: parseInt(formData.ABC_ID),
            Semester: formData.Semester ? parseInt(formData.Semester) : null,
            Batch: formData.Batch ? parseInt(formData.Batch) : null,
        };

        if (isEditing) {
            const updated = await updateStudent(currentStudent.$id, dataToSubmit);
            setStudents(prev => prev.map(s => s.$id === updated.$id ? updated : s));
            toast.success('Student updated!', { id: toastId });
        } else {
            const newStudent = await createStudent(dataToSubmit);
            setStudents(prev => [newStudent, ...prev]);
            toast.success('Student added!', { id: toastId });
        }
        closeModal();
    } catch (err) {
        toast.error(err.message || 'An error occurred.', { id: toastId });
    }
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
        const toastId = toast.loading('Deleting student...');
        try {
            await deleteStudent(studentId);
            setStudents(prev => prev.filter(s => s.$id !== studentId));
            toast.success('Student deleted.', { id: toastId });
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
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const validatedData = jsonData.map(row => {
          const course = courses.find(c => c.Programme === row.Course);
          const errors = [];
          if (!row.Name) errors.push("Name is missing.");
          if (!row['ABC ID'] || isNaN(parseInt(row['ABC ID']))) errors.push("Invalid ABC ID.");
          if (students.some(s => s.ABC_ID === parseInt(row['ABC ID']))) errors.push("Duplicate ABC ID.");
          if (!course) errors.push("Course not found.");
          
          return { ...row, isValid: errors.length === 0, errors, CourseId: course?.$id };
      });
      setImportData(validatedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportConfirm = async () => {
    const validData = importData.filter(row => row.isValid);
    if (validData.length === 0) {
        toast.error("No valid students to import.");
        return;
    }
    const toastId = toast.loading(`Importing ${validData.length} students...`);
    try {
        const creationPromises = validData.map(row => createStudent({
            Name: row.Name,
            Gender: row.Gender,
            ABC_ID: parseInt(row['ABC ID']),
            Status: row.Status || 'Active',
            Course: row.CourseId,
            Semester: row.Semester ? parseInt(row.Semester) : null,
            Batch: row.Batch ? parseInt(row.Batch) : null,
            Year: row.Year,
            Address: row.Address,
        }));
        const newStudents = await Promise.all(creationPromises);
        setStudents(prev => [...newStudents, ...prev]);
        toast.success(`Successfully imported ${newStudents.length} students!`, { id: toastId });
        closeModal();
    } catch (err) {
        toast.error(err.message, { id: toastId });
    }
  };

  const handleExport = () => {
    let dataToExport = students;
    let courseName = 'All_Courses';
    let semesterName = '';

    if (exportCourse) {
        dataToExport = dataToExport.filter(s => s.Course?.$id === exportCourse);
        courseName = courses.find(c => c.$id === exportCourse)?.Programme.replace(' ', '_') || 'Course';
    }
    if (exportSemester) {
        dataToExport = dataToExport.filter(s => s.Semester === parseInt(exportSemester));
        semesterName = `_Sem${exportSemester}`;
    }

    if (dataToExport.length === 0) {
        toast.error("No students found for the selected criteria.");
        return;
    }

    const formattedData = dataToExport.map(student => ({
        'Name': student.Name,
        'ABC ID': student.ABC_ID,
        'Gender': student.Gender,
        'Status': student.Status,
        'Course': student.Course?.Programme || 'N/A',
        'Semester': student.Semester || 'N/A',
        'Batch': student.Batch || 'N/A',
        'Year': student.Year || 'N/A',
        'Address': student.Address || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    worksheet['!cols'] = [{wch:25},{wch:15},{wch:10},{wch:10},{wch:30},{wch:10},{wch:10},{wch:10},{wch:40}];
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `Students_${courseName}${semesterName}.xlsx`);
    closeModal();
  }

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => openModal('add')} className="flex items-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"><PlusCircle className="w-5 h-5 mr-2" />Add Student</button>
              <button onClick={() => openModal('import')} className="flex items-center bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md"><Upload className="w-5 h-5 mr-2" />Import</button>
              <button onClick={() => openModal('export')} className="flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"><Download className="w-5 h-5 mr-2" />Export</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-xl shadow">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by name or ABC ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <select value={courseFilter} onChange={e => {setCourseFilter(e.target.value); setSemesterFilter('')}} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.$id} value={c.$id}>{c.Programme}</option>)}
            </select>
            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" disabled={!courseFilter || availableSemesters.length === 0}>
              <option value="">All Semesters</option>
              {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {Object.keys(filteredAndGroupedStudents).length > 0 ? (
                Object.entries(filteredAndGroupedStudents).map(([courseName, semesters]) => (
                  <motion.div key={courseName} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{courseName}</h2>
                    {Object.entries(semesters).sort(([semA], [semB]) => semA - semB).map(([semester, studentList]) => (
                      <div key={semester} className="mt-4">
                        <h3 className="text-md font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full inline-block mb-3">Semester {semester}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {studentList.map(student => (
                            <div key={student.$id} className="bg-gray-50 p-4 rounded-xl hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-gray-800">{student.Name}</p>
                                  <p className="text-sm text-gray-500">ABC ID: {student.ABC_ID}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${student.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{student.Status}</span>
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => openModal('details', student)} className="text-sm text-gray-600 hover:text-indigo-600">Details</button>
                                <button onClick={() => openModal('edit', student)} className="text-sm text-gray-600 hover:text-indigo-600">Edit</button>
                                <button onClick={() => handleDelete(student.$id)} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-white rounded-2xl shadow-lg">
                  <User className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="mt-4 text-gray-500">No students found.</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters.</p>
                </motion.div>
              )}
            </AnimatePresence>
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
                  {modalContent === 'add' && 'Add New Student'}
                  {modalContent === 'edit' && 'Edit Student'}
                  {modalContent === 'details' && 'Student Details'}
                  {modalContent === 'import' && 'Import Students'}
                  {modalContent === 'export' && 'Export Students'}
                </h3>
                <button onClick={closeModal} className="p-1 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6 text-gray-500" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {/* Add/Edit Form */}
                {(modalContent === 'add' || modalContent === 'edit') && (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Name</label><input type="text" name="Name" value={formData.Name || ''} onChange={e => setFormData({...formData, Name: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium">ABC ID</label><input type="number" name="ABC_ID" value={formData.ABC_ID || ''} onChange={e => setFormData({...formData, ABC_ID: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium">Gender</label><select name="Gender" value={formData.Gender || ''} onChange={e => setFormData({...formData, Gender: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                        <div><label className="block text-sm font-medium">Status</label><select name="Status" value={formData.Status || ''} onChange={e => setFormData({...formData, Status: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required><option>Active</option><option>Inactive</option></select></div>
                        <div><label className="block text-sm font-medium">Course</label><select name="Course" value={formData.Course || ''} onChange={e => setFormData({...formData, Course: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" required><option value="">Select</option>{courses.map(c => <option key={c.$id} value={c.$id}>{c.Programme}</option>)}</select></div>
                        <div><label className="block text-sm font-medium">Semester</label><input type="number" name="Semester" value={formData.Semester || ''} onChange={e => setFormData({...formData, Semester: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium">Batch</label><input type="number" name="Batch" value={formData.Batch || ''} onChange={e => setFormData({...formData, Batch: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium">Year</label><input type="text" name="Year" value={formData.Year || ''} onChange={e => setFormData({...formData, Year: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" /></div>
                    </div>
                    <div><label className="block text-sm font-medium">Address</label><textarea name="Address" value={formData.Address || ''} onChange={e => setFormData({...formData, Address: e.target.value})} className="w-full mt-1 border-gray-300 rounded-lg" rows="3"></textarea></div>
                    <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl mt-6">
                        <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">{modalContent === 'edit' ? 'Save Changes' : 'Add Student'}</button>
                    </div>
                  </form>
                )}

                {/* Details View */}
                {modalContent === 'details' && currentStudent && (
                    <div className="space-y-4">
                        {Object.entries({ Name: currentStudent.Name, 'ABC ID': currentStudent.ABC_ID, Gender: currentStudent.Gender, Status: currentStudent.Status, Course: currentStudent.Course?.Programme, Semester: currentStudent.Semester, Batch: currentStudent.Batch, Year: currentStudent.Year, Address: currentStudent.Address }).map(([key, value]) => (
                            <div key={key}><p className="text-sm font-medium text-gray-500">{key}</p><p className="text-gray-900">{value || 'N/A'}</p></div>
                        ))}
                    </div>
                )}

                {/* Import View */}
                {modalContent === 'import' && (
                    <div>
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {importData.length > 0 && (
                            <div className="mt-4 max-h-80 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Name</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">ABC ID</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Status</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {importData.map((row, i) => (
                                            <tr key={i} className={!row.isValid ? 'bg-red-50' : ''}>
                                                <td className="px-2 py-2 text-sm">{row.Name}{!row.isValid && <p className="text-xs text-red-600">{row.errors.join(', ')}</p>}</td>
                                                <td className="px-2 py-2 text-sm">{row['ABC ID']}</td>
                                                <td className="px-2 py-2 text-sm">{row.isValid ? '✔️' : '❌'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl mt-6">
                            <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                            <button type="button" onClick={handleImportConfirm} disabled={importData.length === 0 || !importData.some(r => r.isValid)} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">Confirm Import</button>
                        </div>
                    </div>
                )}

                {/* Export View */}
                {modalContent === 'export' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Course</label>
                            <select value={exportCourse} onChange={e => setExportCourse(e.target.value)} className="w-full mt-1 border-gray-300 rounded-lg">
                                <option value="">All Courses</option>
                                {courses.map(c => <option key={c.$id} value={c.$id}>{c.Programme}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Semester</label>
                            <select value={exportSemester} onChange={e => setExportSemester(e.target.value)} className="w-full mt-1 border-gray-300 rounded-lg" disabled={!exportCourse || availableSemesters.length === 0}>
                                <option value="">All Semesters</option>
                                {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl mt-6">
                            <button type="button" onClick={closeModal} className="bg-white py-2 px-4 border border-gray-300 rounded-lg">Cancel</button>
                            <button type="button" onClick={handleExport} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Export to Excel</button>
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

export default Students;
