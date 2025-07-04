import React, { useState, useEffect } from 'react';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import { getAttendance } from '../services/attendanceService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, CheckCircle, Download, AlertCircle, UserX } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6EE7B7'];

const StatCard = ({ title, value, icon, color, percentage }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
            {percentage && <p className="text-xs text-gray-400 mt-1">{percentage}</p>}
        </div>
        <div className={`p-3 rounded-full bg-opacity-20 ${color}`}>
            {icon}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

function Overview({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [studentsResponse, coursesResponse, attendanceResponse] = await Promise.all([
        getStudents(),
        fetchCourses(),
        getAttendance()
      ]);

      const students = studentsResponse.documents || [];
      const courses = coursesResponse || [];
      const attendance = attendanceResponse || [];

      // Basic Stats
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.Status === 'Active').length;
      const totalCourses = courses.length;

      // Today's Attendance
      const today = new Date().toDateString();
      const todaysRecords = attendance.filter(r => new Date(r.Marked_at).toDateString() === today);
      const todaysAttendance = {
          present: todaysRecords.filter(r => r.Status === 'Present').length,
          absent: todaysRecords.filter(r => r.Status === 'Absent').length,
          late: todaysRecords.filter(r => r.Status === 'Late').length,
          total: todaysRecords.length
      };

      // Distributions
      const courseDistribution = courses.map(course => ({
        name: course.Programme,
        value: students.filter(s => s.Course?.$id === course.$id).length,
      })).filter(c => c.value > 0);

      const genderDistribution = Object.entries(students.reduce((acc, s) => {
        acc[s.Gender] = (acc[s.Gender] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }));
      
      const statusDistribution = Object.entries(students.reduce((acc, s) => {
        acc[s.Status] = (acc[s.Status] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }));

      const yearDistribution = Object.entries(students.reduce((acc, s) => {
        if(s.Year) acc[s.Year] = (acc[s.Year] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value })).sort();

      setStats({
        totalStudents,
        activeStudents,
        totalCourses,
        todaysAttendance,
        courseDistribution,
        genderDistribution,
        statusDistribution,
        yearDistribution,
      });
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError("Failed to load dashboard data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const toastId = toast.loading('Generating PDF...');
    const pdf = new jsPDF('p', 'mm', 'a4');
    let y = 15;

    // Title
    pdf.setFontSize(20);
    pdf.text('Dashboard Overview Report', 14, y);
    y += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, y);
    y += 15;

    // Summary Stats
    pdf.setTextColor(0);
    pdf.setFontSize(12);
    pdf.text(`Total Students: ${stats.totalStudents}`, 14, y);
    pdf.text(`Active Courses: ${stats.totalCourses}`, 80, y);
    y += 7;
    pdf.text(`Today's Present: ${stats.todaysAttendance.present}`, 14, y);
    pdf.text(`Today's Absent: ${stats.todaysAttendance.absent}`, 80, y);
    y += 10;

    // Course Distribution Table
    if (stats.courseDistribution.length > 0) {
        pdf.autoTable({
            startY: y,
            head: [['Course', 'Student Count']],
            body: stats.courseDistribution.map(d => [d.name, d.value]),
            headStyles: { fillColor: [79, 70, 229] },
            theme: 'striped',
        });
        y = pdf.autoTable.previous.finalY + 10;
    }

    // Gender Distribution Table
    if (stats.genderDistribution.length > 0) {
        pdf.autoTable({
            startY: y,
            head: [['Gender', 'Student Count']],
            body: stats.genderDistribution.map(d => [d.name, d.value]),
            headStyles: { fillColor: [16, 185, 129] },
            theme: 'striped',
        });
        y = pdf.autoTable.previous.finalY + 10;
    }

    // Year-wise Enrollment Table
    if (stats.yearDistribution.length > 0) {
        pdf.autoTable({
            startY: y,
            head: [['Year', 'Student Count']],
            body: stats.yearDistribution.map(d => [d.name, d.value]),
            headStyles: { fillColor: [245, 158, 11] },
            theme: 'striped',
        });
        y = pdf.autoTable.previous.finalY + 10;
    }

    // Student Status Table
    if (stats.statusDistribution.length > 0) {
        pdf.autoTable({
            startY: y,
            head: [['Status', 'Student Count']],
            body: stats.statusDistribution.map(d => [d.name, d.value]),
            headStyles: { fillColor: [239, 68, 68] },
            theme: 'striped',
        });
    }
    
    toast.success('PDF Generated!', { id: toastId });
    pdf.save(`Dashboard_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div></div>;
  if (error) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg flex items-center justify-center gap-2"><AlertCircle className="w-6 h-6"/>{error}</div>;

  return (
    <>
    <Toaster />
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <button onClick={handleExportPDF} className="flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-md"><Download className="w-5 h-5 mr-2" />Export as PDF</button>
        </div>

        {stats && (
            <>
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard title="Total Students" value={stats.totalStudents} icon={<Users className="w-6 h-6"/>} color="text-blue-500 bg-blue-100" />
                    <StatCard title="Active Courses" value={stats.totalCourses} icon={<BookOpen className="w-6 h-6"/>} color="text-purple-500 bg-purple-100" />
                    <StatCard title="Today's Present" value={stats.todaysAttendance.present} percentage={`${stats.todaysAttendance.total > 0 ? Math.round(stats.todaysAttendance.present / stats.todaysAttendance.total * 100) : 0}%`} icon={<CheckCircle className="w-6 h-6"/>} color="text-green-500 bg-green-100" />
                    <StatCard title="Today's Absent" value={stats.todaysAttendance.absent} percentage={`${stats.todaysAttendance.total > 0 ? Math.round(stats.todaysAttendance.absent / stats.todaysAttendance.total * 100) : 0}%`} icon={<UserX className="w-6 h-6"/>} color="text-red-500 bg-red-100" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Course Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.courseDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Students" fill="#4F46E5" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Student Demographics</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={stats.genderDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {stats.genderDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Year-wise Enrollment</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.yearDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Students" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Student Status</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={stats.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {stats.statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'Active' ? '#10B981' : '#EF4444'} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
    </>
  );
}

export default Overview;