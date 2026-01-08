# Firebase Configuration Setup

Your email service is currently running in **email-only mode** because Firebase credentials are not configured. To enable real-time features, follow these steps:

## Option 1: Using Environment Variables (Recommended for Production)

1. **Get Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Update your `.env` file:**
   ```env
   # Replace these with your actual Firebase credentials
   FIREBASE_PROJECT_ID=your-actual-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   ```

## Option 2: Using Service Account File (Development)

1. **Download Service Account Key:**
   - Follow step 1 from Option 1
   - Save the downloaded JSON file as `serviceAccountKey.json` in the `email-service` folder

2. **File Structure:**
   ```
   email-service/
   ├── services/
   ├── serviceAccountKey.json  ← Place your file here
   ├── server.js
   └── .env
   ```

## Firestore Database Setup

Your Firebase project needs these collections for real-time features:

### 1. `doctors` collection
```javascript
{
  name: "Dr. John Smith",
  email: "doctor@example.com",
  verificationStatus: "pending", // "pending", "approved", "rejected"
  specialization: "Cardiology",
  createdAt: timestamp,
  verifiedAt: timestamp,
  verifiedBy: "admin-id"
}
```

### 2. `users` collection
```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "user@example.com",
  emailVerified: true,
  emailPreferences: {
    promotional: true,
    healthTips: true,
    doctorUpdates: true,
    appointmentReminders: true
  },
  createdAt: timestamp
}
```

### 3. `email_campaigns` collection
```javascript
{
  title: "Health Tips Newsletter",
  content: "<p>Your health tip content...</p>",
  status: "scheduled", // "draft", "scheduled", "sent"
  scheduledAt: timestamp,
  createdAt: timestamp,
  sentAt: timestamp,
  recipientCount: 150
}
```

### 4. `health_tips` collection
```javascript
{
  title: "Daily Health Tip",
  content: "<p>Tip content...</p>",
  status: "pending", // "pending", "sent"
  createdAt: timestamp,
  sentAt: timestamp
}
```

## Testing Firebase Connection

After configuring credentials, test the connection:

```bash
npm run test-realtime
```

## Real-Time Features Available

Once configured, your service will automatically:

✅ **Doctor Verification Emails** - Auto-send when status changes  
✅ **Welcome Emails** - Send to new verified users  
✅ **Scheduled Campaigns** - Execute campaigns at scheduled time  
✅ **Health Tips** - Distribute to subscribed users  
✅ **Real-Time Dashboard** - Live statistics at `/dashboard`  

## Current Status

- **Email Service**: ✅ Working (Gmail SMTP)
- **Firebase**: ⚠️ Not configured
- **Real-Time Features**: ❌ Disabled

## Need Help?

If you encounter issues:

1. Check the server logs for specific error messages
2. Verify your Firebase project has Firestore enabled
3. Ensure service account has proper permissions
4. Test with `/health` endpoint to see current status

---

**Note**: The service will continue to work for manual email sending even without Firebase. Real-time automation requires Firebase configuration.