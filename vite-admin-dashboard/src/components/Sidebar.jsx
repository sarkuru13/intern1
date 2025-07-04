// Sidebar.jsx
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white min-h-screen p-5">
      <h2 className="text-xl font-bold mb-6">Admin Dashboard</h2>
      <ul>
        <li className="mb-4">
          <Link to="../Courses" className="hover:text-gray-300">Courses</Link>
        </li>
        <li className="mb-4">
          <Link to="/students" className="hover:text-gray-300">Students</Link>
        </li>
        <li className="mb-4">
          <Link to="/attendance" className="hover:text-gray-300">Attendance</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
