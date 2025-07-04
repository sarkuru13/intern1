import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const HOLIDAY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_HOLIDAY_COLLECTION_ID;

export async function fetchHolidays() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      HOLIDAY_COLLECTION_ID,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents;
  } catch (error) {
    throw new Error('Failed to fetch holidays: ' + error.message);
  }
}

export async function addHoliday(holidayData) {
  try {
    // Check for existing holiday with same Title and Date_from
    const existingHolidays = await databases.listDocuments(
      DATABASE_ID,
      HOLIDAY_COLLECTION_ID,
      [
        Query.equal('Title', holidayData.Title),
        Query.equal('Date_from', holidayData.Date_from)
      ]
    );
    
    if (existingHolidays.total > 0) {
      throw new Error('Holiday with this Title and Date From already exists');
    }

    const response = await databases.createDocument(
      DATABASE_ID,
      HOLIDAY_COLLECTION_ID,
      ID.unique(),
      {
        Title: holidayData.Title,
        Date_from: holidayData.Date_from,
        Date_to: holidayData.Date_to,
        Description: holidayData.Description || '',
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to add holiday: ' + error.message);
  }
}

export async function updateHoliday(holidayId, holidayData) {
  try {
    // Check for existing holiday with same Title and Date_from, excluding the holiday being updated
    const existingHolidays = await databases.listDocuments(
      DATABASE_ID,
      HOLIDAY_COLLECTION_ID,
      [
        Query.equal('Title', holidayData.Title),
        Query.equal('Date_from', holidayData.Date_from),
        Query.notEqual('$id', holidayId)
      ]
    );
    
    if (existingHolidays.total > 0) {
      throw new Error('Another holiday with this Title and Date From already exists');
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      HOLIDAY_COLLECTION_ID,
      holidayId,
      {
        Title: holidayData.Title,
        Date_from: holidayData.Date_from,
        Date_to: holidayData.Date_to,
        Description: holidayData.Description || '',
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to update holiday: ' + error.message);
  }
}

export async function deleteHoliday(holidayId) {
  try {
    await databases.deleteDocument(DATABASE_ID, HOLIDAY_COLLECTION_ID, holidayId);
    return true;
  } catch (error) {
    throw new Error('Failed to delete holiday: ' + error.message);
  }
}