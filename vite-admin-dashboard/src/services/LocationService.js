import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const LOCATION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_LOCATION_COLLECTION_ID;

export async function fetchLocations() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      LOCATION_COLLECTION_ID,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents;
  } catch (error) {
    throw new Error('Failed to fetch locations: ' + error.message);
  }
}

export async function addLocation(locationData) {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      LOCATION_COLLECTION_ID,
      ID.unique(),
      {
        Latitude: locationData.Latitude,
        Longitude: locationData.Longitude,
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to add location: ' + error.message);
  }
}

export async function updateLocation(locationId, locationData) {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      LOCATION_COLLECTION_ID,
      locationId,
      {
        Latitude: locationData.Latitude,
        Longitude: locationData.Longitude,
      }
    );
    return response;
  } catch (error) {
    throw new Error('Failed to update location: ' + error.message);
  }
}

export async function deleteLocation(locationId) {
  try {
    await databases.deleteDocument(DATABASE_ID, LOCATION_COLLECTION_ID, locationId);
    return true;
  } catch (error) {
    throw new Error('Failed to delete location: ' + error.message);
  }
}