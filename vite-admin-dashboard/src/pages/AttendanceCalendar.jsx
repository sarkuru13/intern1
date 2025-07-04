import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default react-calendar styles
import toast, { Toaster } from 'react-hot-toast';

// Define holidays for 2025 (can be replaced with API or database)
const holidays = [
  new Date(2025, 0, 1), // January 1, 2025 (New Year's Day)
  new Date(2025, 0, 26), // January 26, 2025 (Republic Day, example for India)
  new Date(2025, 7, 15), // August 15, 2025 (Independence Day, example)
  new Date(2025, 11, 25), // December 25, 2025 (Christmas)
].map(date => date.toDateString()); // Normalize to string for comparison

function AttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState(null);

  // Function to determine if a date is a weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday (0) or Saturday (6)
  };

  // Function to determine if a date is a holiday
  const isHoliday = (date) => {
    return holidays.includes(date.toDateString());
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (isWeekend(date)) {
      toast.error('Cannot select weekends.');
      return;
    }
    if (isHoliday(date)) {
      toast.error('Cannot select holidays.');
      return;
    }
    setSelectedDate(date);
    toast.success(`Selected date: ${date.toLocaleDateString()}`);
    // Add attendance integration here (e.g., open form, fetch records)
  };

  // Customize tile styling
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (isHoliday(date)) {
        return 'bg-yellow-200 text-black'; // Yellow for holidays
      }
      if (isWeekend(date)) {
        return 'bg-gray-200 text-gray-600'; // Grey for weekends
      }
      return 'hover:bg-indigo-100 cursor-pointer'; // Clickable dates
    }
    return '';
  };

  // Disable tiles for weekends and holidays
  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      return isWeekend(date) || isHoliday(date);
    }
    return false;
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 flex items-center justify-center">
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Attendance Calendar</h2>
        <div className="mb-4">
          <Calendar
            onClickDay={handleDateClick}
            tileClassName={tileClassName}
            tileDisabled={tileDisabled}
            value={selectedDate}
            className="border-none rounded-lg"
          />
        </div>
        {selectedDate && (
          <div className="text-center">
            <p className="text-lg">
              Selected: <span className="font-semibold">{selectedDate.toLocaleDateString()}</span>
            </p>
            {/* Placeholder for future attendance integration */}
            <p className="text-sm text-gray-600">
              Click a non-weekend, non-holiday date to mark attendance.
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center">
            <span className="w-4 h-4 bg-yellow-200 inline-block mr-2"></span>
            <span>Holiday</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 bg-gray-200 inline-block mr-2"></span>
            <span>Weekend</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceCalendar;