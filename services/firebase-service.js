const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    this.isConfigured = false;
    
    try {
      if (!admin.apps.length) {
        // Check if Firebase credentials are properly configured
        if (this.hasValidFirebaseConfig()) {
          if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY !== "-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n") {
            // Use environment variables (production)
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              })
            });
          } else {
            // Try to use service account file (development)
            try {
              const serviceAccount = require('../serviceAccountKey.json');
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
              });
            } catch (error) {
              throw new Error('serviceAccountKey.json not found and environment variables not configured');
            }
          }
          
          this.db = admin.firestore();
          this.isConfigured = true;
          console.log('🔥 Firebase Service initialized with real-time capabilities');
        } else {
          console.warn('⚠️  Firebase credentials not configured. Real-time features disabled.');
          console.warn('   Please configure Firebase credentials in .env or serviceAccountKey.json');
        }
      } else {
        this.db = admin.firestore();
        this.isConfigured = true;
        console.log('🔥 Firebase Service using existing app instance');
      }
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      console.warn('⚠️  Running in email-only mode. Real-time features disabled.');
      this.isConfigured = false;
    }
    
    this.listeners = new Map(); // Store active listeners
    this.emailService = null; // Will be set by email service
  }

  // Check if Firebase configuration is valid
  hasValidFirebaseConfig() {
    const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const hasEnvVars = requiredEnvVars.every(varName => {
      const value = process.env[varName];
      return value && value !== 'your-project-id' && value !== 'firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com' && !value.includes('Your-Private-Key');
    });
    
    return hasEnvVars;
  }

  // Check if Firebase is properly configured
  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Firebase not configured. Please set up Firebase credentials.');
    }
  }

  // Set email service reference for real-time email sending
  setEmailService(emailService) {
    this.emailService = emailService;
  }

  // Start all real-time listeners
  startRealTimeListeners() {
    if (!this.isConfigured) {
      console.warn('⚠️  Cannot start real-time listeners: Firebase not configured');
      return;
    }
    
    console.log('🚀 Starting Firebase real-time listeners...');
    
    this.listenToDoctorVerifications();
    this.listenToNewUsers();
    this.listenToEmailCampaigns();
    this.listenToHealthTipRequests();
    
    console.log('✅ All real-time listeners started');
  }

  // Stop all listeners
  stopAllListeners() {
    console.log('🛑 Stopping all Firebase listeners...');
    this.listeners.forEach((unsubscribe, name) => {
      unsubscribe();
      console.log(`   Stopped: ${name}`);
    });
    this.listeners.clear();
  }

  // Real-time listener for doctor verification status changes
  listenToDoctorVerifications() {
    const unsubscribe = this.db.collection('doctors')
      .where('verificationStatus', 'in', ['pending'])
      .onSnapshot(async (snapshot) => {
        console.log('📋 Doctor verification changes detected');
        
        for (const change of snapshot.docChanges()) {
          if (change.type === 'modified') {
            const doctorData = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            // Check if status changed to approved or rejected
            if (['approved', 'rejected'].includes(doctorData.verificationStatus)) {
              console.log(`🏥 Doctor ${doctorData.name} status: ${doctorData.verificationStatus}`);
              
              if (this.emailService) {
                try {
                  await this.emailService.sendDoctorVerificationEmail(doctorData, doctorData.verificationStatus);
                  console.log(`✅ Verification email sent to Dr. ${doctorData.name}`);
                } catch (error) {
                  console.error(`❌ Failed to send email to Dr. ${doctorData.name}:`, error.message);
                }
              }
            }
          }
        }
      }, (error) => {
        console.error('❌ Doctor verification listener error:', error);
      });
    
    this.listeners.set('doctorVerifications', unsubscribe);
  }

  // Real-time listener for new user registrations
  listenToNewUsers() {
    const unsubscribe = this.db.collection('users')
      .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const userData = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            console.log(`👤 New user registered: ${userData.firstName} ${userData.lastName}`);
            
            // Send welcome email if email is verified
            if (userData.emailVerified && this.emailService) {
              try {
                await this.sendWelcomeEmail(userData);
                console.log(`✅ Welcome email sent to ${userData.email}`);
              } catch (error) {
                console.error(`❌ Failed to send welcome email:`, error.message);
              }
            }
          }
        }
      }, (error) => {
        console.error('❌ New users listener error:', error);
      });
    
    this.listeners.set('newUsers', unsubscribe);
  }

  // Real-time listener for email campaigns
  listenToEmailCampaigns() {
    const unsubscribe = this.db.collection('email_campaigns')
      .where('status', '==', 'scheduled')
      .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const campaignData = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            // Check if campaign should be sent now
            const now = new Date();
            const scheduledTime = campaignData.scheduledAt?.toDate();
            
            if (scheduledTime && scheduledTime <= now) {
              console.log(`📧 Executing scheduled campaign: ${campaignData.title}`);
              
              if (this.emailService) {
                try {
                  await this.executeCampaign(campaignData);
                  console.log(`✅ Campaign executed: ${campaignData.title}`);
                } catch (error) {
                  console.error(`❌ Campaign execution failed:`, error.message);
                }
              }
            }
          }
        }
      }, (error) => {
        console.error('❌ Email campaigns listener error:', error);
      });
    
    this.listeners.set('emailCampaigns', unsubscribe);
  }

  // Real-time listener for health tip requests
  listenToHealthTipRequests() {
    const unsubscribe = this.db.collection('health_tips')
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            const tipData = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            console.log(`💡 New health tip ready: ${tipData.title}`);
            
            if (this.emailService) {
              try {
                const users = await this.getHealthTipUsers();
                await this.emailService.sendHealthTip(users, tipData);
                
                // Mark as sent
                await this.db.collection('health_tips').doc(tipData.id).update({
                  status: 'sent',
                  sentAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✅ Health tip sent to ${users.length} users`);
              } catch (error) {
                console.error(`❌ Health tip sending failed:`, error.message);
              }
            }
          }
        }
      }, (error) => {
        console.error('❌ Health tips listener error:', error);
      });
    
    this.listeners.set('healthTips', unsubscribe);
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userData) {
    const welcomeTemplate = {
      title: `Welcome to Curevia, ${userData.firstName}! 🎉`,
      subtitle: 'Your healthcare journey starts here',
      content: `
        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #28a745; margin-top: 0;">Welcome to the Curevia Family!</h3>
          <p>We're excited to have you join our healthcare platform. Here's what you can do:</p>
          <ul style="line-height: 1.8;">
            <li>🏥 Find and book appointments with verified doctors</li>
            <li>💊 Get personalized health recommendations</li>
            <li>📊 Track your health metrics and progress</li>
            <li>💬 Chat with healthcare professionals</li>
            <li>📱 Access everything from your mobile device</li>
          </ul>
          <p><strong>Ready to get started? Download our app and explore!</strong></p>
        </div>
      `,
      ctaText: 'Explore Curevia',
      ctaLink: process.env.APP_URL || 'https://curevia.com'
    };
    
    await this.emailService.sendPromotionalEmail([userData], welcomeTemplate);
  }

  // Execute email campaign
  async executeCampaign(campaignData) {
    const users = await this.getPromotionalUsers();
    
    if (users.length > 0) {
      await this.emailService.sendPromotionalEmail(users, campaignData);
      
      // Update campaign status
      await this.db.collection('email_campaigns').doc(campaignData.id).update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        recipientCount: users.length
      });
    }
  }

  // Get real-time statistics
  async getRealTimeStats() {
    if (!this.isConfigured) {
      return {
        error: 'Firebase not configured',
        doctors: { total: 0, pending: 0, approved: 0, rejected: 0 },
        users: { total: 0, emailVerified: 0, promotionalOptIn: 0, healthTipsOptIn: 0 },
        campaigns: { total: 0, draft: 0, scheduled: 0, sent: 0 },
        listeners: { active: 0, names: [] }
      };
    }
    
    try {
      const [doctorsSnapshot, usersSnapshot, campaignsSnapshot] = await Promise.all([
        this.db.collection('doctors').get(),
        this.db.collection('users').get(),
        this.db.collection('email_campaigns').get()
      ]);
      
      const stats = {
        doctors: {
          total: doctorsSnapshot.size,
          pending: 0,
          approved: 0,
          rejected: 0
        },
        users: {
          total: usersSnapshot.size,
          emailVerified: 0,
          promotionalOptIn: 0,
          healthTipsOptIn: 0
        },
        campaigns: {
          total: campaignsSnapshot.size,
          draft: 0,
          scheduled: 0,
          sent: 0
        },
        listeners: {
          active: this.listeners.size,
          names: Array.from(this.listeners.keys())
        }
      };
      
      // Count doctor statuses
      doctorsSnapshot.forEach(doc => {
        const status = doc.data().verificationStatus || 'pending';
        stats.doctors[status] = (stats.doctors[status] || 0) + 1;
      });
      
      // Count user preferences
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.emailVerified) stats.users.emailVerified++;
        if (data.emailPreferences?.promotional) stats.users.promotionalOptIn++;
        if (data.emailPreferences?.healthTips) stats.users.healthTipsOptIn++;
      });
      
      // Count campaign statuses
      campaignsSnapshot.forEach(doc => {
        const status = doc.data().status || 'draft';
        stats.campaigns[status] = (stats.campaigns[status] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      throw error;
    }
  }

  // Get doctor data by ID
  async getDoctor(doctorId) {
    this.checkConfiguration();
    
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
    this.checkConfiguration();
    
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
    this.checkConfiguration();
    
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

  // Get user data by ID
  async getUser(userId) {
    this.checkConfiguration();
    
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error fetching user:', error);
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