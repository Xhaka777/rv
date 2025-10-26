// ContactImageDB.js - Create this as a separate utility file
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACT_IMAGES_KEY = 'CONTACT_IMAGES_DB';

class ContactImageDB {
  // Save contact image to database
  static async saveContactImage(contactId: string, imageUri: string): Promise<boolean> {
    try {
      console.log(`[ContactImageDB] Saving image for contact ${contactId}`);
      
      // Get existing database
      const existingData = await this.getAllContactImages();
      
      // Add/update the contact image
      existingData[contactId] = {
        imageUri: imageUri,
        savedAt: new Date().toISOString(),
        contactId: contactId
      };
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(CONTACT_IMAGES_KEY, JSON.stringify(existingData));
      
      console.log(`[ContactImageDB] Successfully saved image for contact ${contactId}`);
      return true;
    } catch (error) {
      console.error(`[ContactImageDB] Error saving image for contact ${contactId}:`, error);
      return false;
    }
  }

  // Get contact image by ID
  static async getContactImage(contactId: string): Promise<string | null> {
    try {
      const allImages = await this.getAllContactImages();
      const contactImage = allImages[contactId];
      
      if (contactImage?.imageUri) {
        console.log(`[ContactImageDB] Found image for contact ${contactId}: ${contactImage.imageUri}`);
        return contactImage.imageUri;
      }
      
      console.log(`[ContactImageDB] No image found for contact ${contactId}`);
      return null;
    } catch (error) {
      console.error(`[ContactImageDB] Error getting image for contact ${contactId}:`, error);
      return null;
    }
  }

  // Get all contact images
  static async getAllContactImages(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(CONTACT_IMAGES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[ContactImageDB] Error getting all contact images:', error);
      return {};
    }
  }

  // Delete contact image
  static async deleteContactImage(contactId: string): Promise<boolean> {
    try {
      console.log(`[ContactImageDB] Deleting image for contact ${contactId}`);
      
      const existingData = await this.getAllContactImages();
      delete existingData[contactId];
      
      await AsyncStorage.setItem(CONTACT_IMAGES_KEY, JSON.stringify(existingData));
      
      console.log(`[ContactImageDB] Successfully deleted image for contact ${contactId}`);
      return true;
    } catch (error) {
      console.error(`[ContactImageDB] Error deleting image for contact ${contactId}:`, error);
      return false;
    }
  }

  // Get multiple contact images by IDs
  static async getMultipleContactImages(contactIds: string[]): Promise<Record<string, string>> {
    try {
      const allImages = await this.getAllContactImages();
      const result: Record<string, string> = {};
      
      contactIds.forEach(contactId => {
        if (allImages[contactId]?.imageUri) {
          result[contactId] = allImages[contactId].imageUri;
        }
      });
      
      console.log(`[ContactImageDB] Retrieved ${Object.keys(result).length} images for ${contactIds.length} contacts`);
      return result;
    } catch (error) {
      console.error('[ContactImageDB] Error getting multiple contact images:', error);
      return {};
    }
  }

  // Clear all contact images (for debugging/reset)
  static async clearAllContactImages(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(CONTACT_IMAGES_KEY);
      console.log('[ContactImageDB] Cleared all contact images');
      return true;
    } catch (error) {
      console.error('[ContactImageDB] Error clearing all contact images:', error);
      return false;
    }
  }

  // Get database statistics
  static async getStats(): Promise<{ totalContacts: number; totalSize: string }> {
    try {
      const allImages = await this.getAllContactImages();
      const totalContacts = Object.keys(allImages).length;
      const dataString = JSON.stringify(allImages);
      const totalSize = `${(dataString.length / 1024).toFixed(2)} KB`;
      
      return { totalContacts, totalSize };
    } catch (error) {
      console.error('[ContactImageDB] Error getting stats:', error);
      return { totalContacts: 0, totalSize: '0 KB' };
    }
  }
}

export default ContactImageDB;