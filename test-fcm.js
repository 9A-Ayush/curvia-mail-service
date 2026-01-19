#!/usr/bin/env node

/**
 * FCM Test Script - DEVELOPMENT ONLY
 * Replace YOUR_FCM_TOKEN with a fresh token from Flutter app debug screen
 */

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.log('❌ This test script should not run in production!');
  process.exit(1);
}

const axios = require('axios');

// 🔧 PASTE YOUR FRESH FCM TOKEN HERE (get from Flutter app debug screen)
const YOUR_FCM_TOKEN = 'eNis3r3LTxmzCihSwR6gnF:APA91bEKvqqEnIPvcLUpweygQMoYFvzx-2MYS1-1AMj2QsyM3wv-5osuiWFXorm5xnFCF387ae9yYToEzBntvHN5CbHRTqWYjo37k1J0xvm1-42v-anI0qI';

const BASE_URL = 'http://localhost:3000';

async function testFCM() {
  console.log('🚀 FCM Test');
  console.log('===========');
  
  if (YOUR_FCM_TOKEN === 'PASTE_YOUR_FRESH_FCM_TOKEN_HERE') {
    console.log('❌ Please paste your FCM token first');
    console.log('📋 How to get token:');
    console.log('1. Run Flutter app: flutter run');
    console.log('2. Go to Debug screen → Test FCM Integration');
    console.log('3. Copy the FCM token and paste it above');
    return;
  }
  
  try {
    // Check service
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend running');
    
    // Validate token
    const validation = await axios.post(`${BASE_URL}/validate-fcm-token`, {
      fcmToken: YOUR_FCM_TOKEN
    });
    
    if (!validation.data.valid) {
      console.log('❌ Token invalid:', validation.data.error);
      console.log('💡 Get a fresh token from Flutter app debug screen');
      return;
    }
    
    console.log('✅ Token valid');
    
    // Send test notification
    await axios.post(`${BASE_URL}/test-fcm`, {
      fcmToken: YOUR_FCM_TOKEN,
      title: '🎉 FCM Test Success!',
      body: 'Your FCM integration is working perfectly!',
      data: { test: 'true' }
    });
    
    console.log('✅ Test notification sent');
    console.log('📱 Check your device for the notification');
    console.log('🎉 FCM integration is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFCM();