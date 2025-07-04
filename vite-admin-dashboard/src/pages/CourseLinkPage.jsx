import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Client, Databases } from 'appwrite';
import { fetchCourses } from '../services/courseService';
import { fetchLocations } from '../services/LocationService';
import QRCode from 'react-qr-code';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COURSE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COURSE_COLLECTION_ID;
const LOCATION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_LOCATION_COLLECTION_ID;

function CourseLinkPage() {
  const { programme, semester } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  const [location, setLocation] = useState({ latitude: null, longitude: null, error: null });

  useEffect(() => {
    let unsubscribeCourse;
    let unsubscribeLocation;

    async function fetchData() {
      try {
        // Fetch course data
        const courses = await fetchCourses();
        const foundCourse = courses.find(
          (c) => c.Programme.toLowerCase() === decodeURIComponent(programme).toLowerCase()
        );
        if (foundCourse) {
          setCourse(foundCourse);
          // Subscribe to real-time updates for the course document
          unsubscribeCourse = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COURSE_COLLECTION_ID}.documents.${foundCourse.$id}`,
            (response) => {
              if (response.events.includes(`databases.${DATABASE_ID}.collections.${COURSE_COLLECTION_ID}.documents.${foundCourse.$id}.update`)) {
                setCourse(response.payload);
              }
            }
          );
        } else {
          setError('Course not found');
        }

        // Fetch location data
        const locations = await fetchLocations();
        if (locations && locations.length > 0) {
          const latestLocation = locations[0]; // Most recent location (sorted by $createdAt desc)
          setLocation({
            latitude: latestLocation.Latitude,
            longitude: latestLocation.Longitude,
            error: null,
          });
        } else {
          setLocation({ latitude: null, longitude: null, error: 'No locations found in database' });
        }

        // Subscribe to real-time updates for the location collection
        unsubscribeLocation = client.subscribe(
          `databases.${DATABASE_ID}.collections.${LOCATION_COLLECTION_ID}.documents`,
          (response) => {
            // Refetch on any change to get the latest
             fetchLocations().then((newLocations) => {
                if (newLocations && newLocations.length > 0) {
                  setLocation({
                    latitude: newLocations[0].Latitude,
                    longitude: newLocations[0].Longitude,
                    error: null,
                  });
                } else {
                  setLocation({ latitude: null, longitude: null, error: 'No locations found in database' });
                }
              });
          }
        );

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    }

    fetchData();

    // Update time every 10 seconds
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    }, 10000);

    // Cleanup subscriptions and interval on component unmount
    return () => {
      if (unsubscribeCourse) unsubscribeCourse();
      if (unsubscribeLocation) unsubscribeLocation();
      clearInterval(timeInterval);
    };
  }, [programme]);

  // Generate QR code value
  const qrValue = course && course.LinkStatus === 'Active'
    ? JSON.stringify({
        courseId: course.$id,
        semester: parseInt(semester),
        dateTime: new Date().toISOString(),
        location: location.latitude && location.longitude 
          ? { latitude: location.latitude, longitude: location.longitude }
          : null,
      })
    : '';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {course.Programme}
        </h2>
        <p className="text-lg font-semibold text-indigo-600 mb-4">
            Semester {semester}
        </p>
        <div className="mb-6">
            <p className="text-sm font-medium text-gray-500">Link Status</p>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${course.LinkStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {course.LinkStatus}
            </span>
        </div>

        {course.LinkStatus === 'Active' ? (
          <div className="flex justify-center p-4 bg-white rounded-lg shadow-inner">
            <QRCode
              value={qrValue}
              size={256}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
          </div>
        ) : (
          <div className="py-20 bg-gray-100 rounded-lg">
            <p className="text-lg font-medium text-gray-600">
              Link is currently inactive.
            </p>
            <p className="text-sm text-gray-400">Please activate the link in the dashboard.</p>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-6 space-y-1">
            <p>Time: {currentTime}</p>
            <p>Location: {location.latitude && location.longitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : (location.error || 'Unavailable')}</p>
        </div>
      </div>
    </div>
  );
}

export default CourseLinkPage;
