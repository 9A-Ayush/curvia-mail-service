const admin = require('firebase-admin');
const path = require('path');

class FCMService {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      // Check if Firebase Admin is already initialized by another service
      if (admin.apps.length > 0) {
        this.initialized = true;
        console.log('✅ FCM Service using existing Firebase Admin SDK instance');
        return;
      }
      
      // Initialize Firebase Admin SDK if not already done
      const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'curevia-f31a8'
      });
      
      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully for FCM');
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
      this.initialized = false;
    }
  }

  async sendNotification(fcmToken, notification) {
    if (!this.initialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      // Validate token format first
      if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 50) {
        throw new Error('Invalid FCM token format');
      }

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl || undefined,
        },
        data: notification.data || {},
        android: {
          notification: {
            channelId: notification.channelId || 'default',
            sound: notification.sound || 'default',
            priority: 'high',
            defaultSound: true,
          },
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: notification.sound || 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      };

      console.log(`🔄 Sending FCM notification to token: ${fcmToken.substring(0, 20)}...`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Body: ${notification.body}`);

      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ FCM notification failed:', error);
      
      // Provide more specific error messages
      if (error.code === 'messaging/invalid-argument') {
        throw new Error('Invalid FCM token - token may be expired or from wrong project');
      } else if (error.code === 'messaging/registration-token-not-registered') {
        throw new Error('FCM token not registered - app may be uninstalled');
      } else if (error.code === 'messaging/invalid-package-name') {
        throw new Error('Invalid package name - check Firebase project configuration');
      } else {
        throw error;
      }
    }
  }

  async sendBulkNotifications(tokens, notification) {
    if (!this.initialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl || undefined,
        },
        data: notification.data || {},
        tokens: tokens,
        android: {
          notification: {
            channelId: notification.channelId || 'default',
            sound: notification.sound || 'default',
            priority: 'high',
            defaultSound: true,
          },
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: notification.sound || 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Bulk FCM notifications sent: ${response.successCount}/${tokens.length}`);
      
      if (response.failureCount > 0) {
        console.warn(`⚠️ ${response.failureCount} notifications failed`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`❌ Token ${tokens[idx]} failed:`, resp.error);
          }
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error('❌ Bulk FCM notifications failed:', error);
      throw error;
    }
  }

  async validateToken(fcmToken) {
    if (!this.initialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      // First, try a simple format validation
      if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 50) {
        console.warn(`⚠️ FCM token appears to be invalid format: ${fcmToken?.substring(0, 20)}...`);
        return { valid: false, error: 'Invalid token format' };
      }

      // Use the correct dry-run approach with Firebase Admin SDK
      const message = {
        token: fcmToken,
        notification: {
          title: 'Validation Test',
          body: 'Token validation test',
        },
        data: {
          test: 'validation'
        }
      };

      // Use the dryRun parameter in the send method, not in the message object
      const response = await admin.messaging().send(message, true); // true = dryRun
      console.log(`✅ FCM token validation successful: ${response}`);
      return { valid: true, messageId: response };
    } catch (error) {
      console.warn(`⚠️ FCM token validation failed: ${fcmToken?.substring(0, 20)}...`);
      console.warn(`   Error: ${error.message}`);
      
      // Check if it's a specific Firebase error
      if (error.code === 'messaging/invalid-argument') {
        return { valid: false, error: 'Invalid FCM registration token' };
      } else if (error.code === 'messaging/registration-token-not-registered') {
        return { valid: false, error: 'Token not registered' };
      } else {
        return { valid: false, error: error.message };
      }
    }
  }
}

module.exports = FCMService;
