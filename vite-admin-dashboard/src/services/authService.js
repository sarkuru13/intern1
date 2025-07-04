// src/services/authService.js
import { account } from "./appwriteConfig";

export async function login(email, password) {
    try {
        try {
            await account.deleteSession('current');
        } catch (error) {
            console.log('⚠️ No session to delete:', error.message);
        }
        await account.createEmailPasswordSession(email, password);
        const currentUser = await account.get();
        console.log('✅ Login successful:', currentUser);

        if(currentUser.prefs.role !== 'admin'){
            await account.deleteSession('current');
            throw new Error('Access denied. You are not authorized to use this app.');
        }
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        throw error;    
    }
}

export async function getCurrentUser() {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        return null;
    }
}

export async function logout() {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.error("Logout failed", error.message);
    }
}
