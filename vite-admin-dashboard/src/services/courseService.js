import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COURSE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COURSE_COLLECTION_ID;

export async function fetchCourses() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COURSE_COLLECTION_ID,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents;
  } catch (error) {
    throw new Error('Failed to fetch courses: ' + error.message);
  }
}

export async function addCourse(courseData) {
  try {
    // Check for existing course with same Programme and Duration
    const existingCourses = await databases.listDocuments(
      DATABASE_ID,
      COURSE_COLLECTION_ID,
      [
        Query.equal('Programme', courseData.Programme),
        Query.equal('Duration', parseInt(courseData.Duration))
      ]
    );
    
    if (existingCourses.total > 0) {
      throw new Error('Course with this Programme and Duration already exists');
    }

    const response = await databases.createDocument(
      DATABASE_ID,
      COURSE_COLLECTION_ID,
      ID.unique(),
      {
        Programme: courseData.Programme,
        Duration: courseData.Duration,
        Status: courseData.Status,
        LinkStatus: courseData.LinkStatus || 'Inactive', // Default to Inactive
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to add course: ' + error.message);
  }
}

export async function updateCourse(courseId, courseData) {
  try {
    // Check for existing course with same Programme and Duration, excluding the course being updated
    const existingCourses = await databases.listDocuments(
      DATABASE_ID,
      COURSE_COLLECTION_ID,
      [
        Query.equal('Programme', courseData.Programme),
        Query.equal('Duration', parseInt(courseData.Duration)),
        Query.notEqual('$id', courseId)
      ]
    );
    
    if (existingCourses.total > 0) {
      throw new Error('Another course with this Programme and Duration already exists');
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      COURSE_COLLECTION_ID,
      courseId,
      {
        Programme: courseData.Programme,
        Duration: courseData.Duration,
        Status: courseData.Status,
        LinkStatus: courseData.LinkStatus, // Include LinkStatus
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to update course: ' + error.message);
  }
}

export async function deleteCourse(courseId) {
  try {
    await databases.deleteDocument(DATABASE_ID, COURSE_COLLECTION_ID, courseId);
    return true;
  } catch (error) {
    throw new Error('Failed to delete course: ' + error.message);
  }
}