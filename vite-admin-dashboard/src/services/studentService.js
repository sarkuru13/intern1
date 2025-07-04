import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;

export async function getStudents() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [Query.orderDesc('$createdAt')]
    );
    return response;
  } catch (error) {
    throw new Error('Failed to fetch students: ' + error.message);
  }
}

export async function getStudent(studentId) {
  try {
    const response = await databases.getDocument(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      studentId
    );
    return response;
  } catch (error) {
    throw new Error('Failed to fetch student: ' + error.message);
  }
}

export async function createStudent(studentData) {
  try {
    // Check for duplicate ABC_ID
    const existingStudents = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [Query.equal('ABC_ID', parseInt(studentData.ABC_ID))]
    );
    if (existingStudents.total > 0) {
      throw new Error('Student with this ABC ID already exists');
    }

    const response = await databases.createDocument(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      ID.unique(),
      {
        Name: studentData.Name,
        Gender: studentData.Gender,
        ABC_ID: parseInt(studentData.ABC_ID),
        Status: studentData.Status,
        Course: studentData.Course || null,
        Semester: studentData.Semester ? parseInt(studentData.Semester) : null,
        Batch: studentData.Batch ? parseInt(studentData.Batch) : null,
        Year: studentData.Year || null,
        Address: studentData.Address || null
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function updateStudent(studentId, studentData) {
  try {
    // Check for duplicate ABC_ID, excluding the current student
    const existingStudents = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('ABC_ID', parseInt(studentData.ABC_ID)),
        Query.notEqual('$id', studentId)
      ]
    );
    if (existingStudents.total > 0) {
      throw new Error('Another student with this ABC ID already exists');
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      studentId,
      {
        Name: studentData.Name,
        Gender: studentData.Gender,
        ABC_ID: parseInt(studentData.ABC_ID),
        Status: studentData.Status,
        Course: studentData.Course || null,
        Semester: studentData.Semester ? parseInt(studentData.Semester) : null,
        Batch: studentData.Batch ? parseInt(studentData.Batch) : null,
        Year: studentData.Year || null,
        Address: studentData.Address || null
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteStudent(studentId) {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      studentId
    );
    return true;
  } catch (error) {
    throw new Error('Failed to delete student: ' + error.message);
  }
}