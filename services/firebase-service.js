const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      // Initialize Firebase Admin SDK
      if (process.env.FIREBASE_PRIVATE_KEY) {
        // Use environment variables (production)
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          })
        });
      } else {
        // Use service account file (development)
        const serviceAccount = require('../serviceAccountKey.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    }
    
    this.db = admin.firestore();
  }

  // Get doctor data by ID
  async getDoctor(doctorId) {
    try {
      const doctorDoc = await this.db.collection('doctors').doc(doctorId).get();
      
      if (!doctorDoc.exists) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }
      
      return {
        id: doctorDoc.id,
        ...doctorDoc.data()
      };
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  }

  // Get users who opted in for promotional emails
  async getPromotionalUsers() {
    try {
      const usersSnapshot = await this.db.collection('users')
        .where('emailPreferences.promotional', '==', true)
        .where('emailVerified', '==', true)
        .get();
      
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching promotional users:', error);
      throw error;
    }
  }

  // Get users who opted in for health tips
  async getHealthTipUsers() {
    try {
      const usersSnapshot = await this.db.collection('users')
        .where('emailPreferences.healthTips', '==', true)
        .where('emailVerified', '==', true)
        .get();
      
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching health tip users:', error);
      throw error;
    }
  }

  // Update doctor verification status
  async updateDoctorStatus(doctorId, status, adminId) {
    try {
      await this.db.collection('doctors').doc(doctorId).update({
        verificationStatus: status,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBy: adminId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Doctor ${doctorId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating doctor status:', error);
      throw error;
    }
  }

  // Log email activity
  async logEmailActivity(emailData) {
    try {
      await this.db.collection('email_logs').add({
        ...emailData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging email activity:', error);
    }
  }

  // Get email preferences for a user
  async getUserEmailPreferences(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      const userData = userDoc.data();
      return userData.emailPreferences || {
        promotional: false,
        healthTips: false,
        doctorUpdates: false,
        appointmentReminders: true
      };
    } catch (error) {
      console.error('Error fetching user email preferences:', error);
      throw error;
    }
  }

  // Update user email preferences
  async updateUserEmailPreferences(userId, preferences) {
    try {
      await this.db.collection('users').doc(userId).update({
        emailPreferences: preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Email preferences updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      throw error;
    }
  }

  // Unsubscribe user from all emails
  async unsubscribeUser(userId) {
    try {
      await this.db.collection('users').doc(userId).update({
        'emailPreferences.promotional': false,
        'emailPreferences.healthTips': false,
        'emailPreferences.doctorUpdates': false,
        unsubscribedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ User ${userId} unsubscribed from all emails`);
    } catch (error) {
      console.error('Error unsubscribing user:', error);
      throw error;
    }
  }

  // Get campaign data
  async getCampaign(campaignId) {
    try {
      const campaignDoc = await this.db.collection('email_campaigns').doc(campaignId).get();
      
      if (!campaignDoc.exists) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      
      return {
        id: campaignDoc.id,
        ...campaignDoc.data()
      };
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  // Create email campaign
  async createCampaign(campaignData) {
    try {
      const campaignRef = await this.db.collection('email_campaigns').add({
        ...campaignData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'draft'
      });
      
      console.log(`✅ Campaign created with ID: ${campaignRef.id}`);
      return campaignRef.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  // Listen to doctor verification status changes
  listenToDoctorStatusChanges(callback) {
    return this.db.collection('doctors')
      .where('verificationStatus', 'in', ['approved', 'rejected'])
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const doctorData = {
              id: change.doc.id,
              ...change.doc.data()
            };
            callback(doctorData);
          }
        });
      });
  }
}

module.exports = FirebaseService;