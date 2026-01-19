# Curevia Email Service

Complete email and FCM notification service for the Curevia healthcare app.

## 🆕 Recent Updates

### **v1.4.0 - Security & Repository Integration** (January 19, 2026)
- 🔐 **Security Enhancement** - Email service now properly excluded from main repository
- 📚 **Documentation Sync** - Updated integration with main Curevia repository
- 🛡️ **Environment Protection** - Enhanced security for sensitive configuration files
- 🔗 **Repository Separation** - Email service maintained as separate module for security
- 📝 **Setup Instructions** - Updated deployment and configuration guidelines

## Features

- **Email Notifications**: Doctor verification, appointment confirmations, payment receipts
- **FCM Push Notifications**: Real-time notifications for appointments, payments, verification
- **Real-time Firebase Integration**: Auto-triggers based on database changes
- **Dual Notification System**: Both email and push notifications for critical events

## Quick Start

⚠️ **CRITICAL SECURITY**: This service contains sensitive credentials and must be configured properly.

### 🔐 **Security Setup (REQUIRED)**

1. **Copy template files**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Copy Firebase service account template
   cp serviceAccountKey.json.template serviceAccountKey.json
   ```

2. **Configure credentials** (NEVER commit these files):
   ```bash
   # Edit .env with your actual credentials
   # Edit serviceAccountKey.json with your Firebase service account key
   # Download actual serviceAccountKey.json from Firebase Console
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the service**:
   ```bash
   npm start
   ```

5. **Test FCM integration**:
   ```bash
   # Get FCM token from Flutter app debug screen first
   node test-fcm.js
   ```

### ⚠️ **NEVER COMMIT THESE FILES**:
- `.env` (contains real API keys and credentials)
- `serviceAccountKey.json` (contains Firebase private key)
- Any file with actual passwords or API keys

## API Endpoints

### Core Endpoints
- `GET /health` - Service status and stats
- `GET /dashboard` - Real-time visual dashboard

### FCM Notifications
- `POST /test-fcm` - Send test notification
- `POST /validate-fcm-token` - Validate FCM token
- `POST /send-appointment-notification` - Appointment notifications
- `POST /send-payment-notification` - Payment notifications
- `POST /send-doctor-verification-with-fcm` - Doctor verification (Email + FCM)

### Email Only
- `POST /test-email` - Send test email
- `POST /send-doctor-verification` - Doctor verification (Email only)
- `POST /send-promotional-campaign` - Marketing emails
- `POST /send-health-tip` - Health newsletters

## Testing

1. **Start the service**: `npm start`
2. **Get FCM token**: Run Flutter app → Debug screen → "Test FCM Integration"
3. **Update test file**: Edit `test-fcm.js` with your token
4. **Run test**: `node test-fcm.js`

## Configuration

The service uses Firebase Admin SDK and requires:
- `serviceAccountKey.json` - Firebase service account key
- `.env` file with email credentials
- Flutter app with matching Firebase project ID

## Real-time Features

The service automatically listens for Firebase changes and sends notifications for:
- New doctor registrations → Welcome emails
- Admin verification decisions → Notification emails + FCM
- Scheduled campaigns → Automatic execution

Update `.env` file:

```bash
# Gmail Configuration
GMAIL_USER=your-mail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# App URLs
APP_URL=https://curevia.com
UNSUBSCRIBE_URL=https://curevia.com/unsubscribe
PREFERENCES_URL=https://curevia.com/preferences

# Logo Configuration
LOGO_URL=https://your-domain.com/assets/curevia_icon.png

# Update other settings as needed
```

### 3. Firebase Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Download the JSON file as `serviceAccountKey.json`
4. Place it in the `email-service` folder

### 4. Logo Setup

### 4. Logo Setup

✅ **Text Logo Integration Complete!** The email service uses clean text-based branding:

- **Branding**: "CUREVIA" text logo with professional typography
- **Compatibility**: Works in 100% of email clients
- **Reliability**: No images to break or fail to load
- **Benefits**: 
  - ✅ Clean, professional appearance
  - ✅ Universal email client support
  - ✅ Zero technical dependencies
  - ✅ Instant loading
  - ✅ Never breaks or shows errors

### 5. Download Button

✅ **App Download Integration**: All emails include a "Download App" button linking to:
- **URL**: https://curevia-download.vercel.app/
- **Placement**: Bottom of all email templates
- **Style**: Professional blue button with app icon

### 6. Test the Service

```bash
# Test email functionality
npm run test

# Update test email in test-email.js
# Change 'ayush922017@gmail.com' to your actual email
```

### 7. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Logo Test
```bash
GET /logo-test
```

### Test Email
```bash
POST /test-email
{
  "email": "test@example.com"
}
```

### Doctor Verification
```bash
POST /send-doctor-verification
{
  "doctorId": "doctor123",
  "status": "approved", // or "rejected"
  "adminId": "admin123"
}
```

### Promotional Campaign
```bash
POST /send-promotional-campaign
{
  "campaignData": {
    "title": "New Features Available!",
    "subtitle": "Updates from Curevia",
    "content": "<p>Email content here...</p>",
    "ctaText": "Learn More",
    "ctaLink": "https://curevia.com"
  }
}
```

### Health Tip
```bash
POST /send-health-tip
{
  "tip": {
    "title": "Stay Hydrated",
    "content": "<p>Drink 8 glasses of water daily...</p>",
    "actionItems": ["Keep water bottle", "Set reminders"]
  }
}
```

### Email Preferences
```bash
# Get preferences
GET /preferences/:userId

# Update preferences
POST /preferences/:userId
{
  "preferences": {
    "promotional": true,
    "healthTips": false,
    "doctorUpdates": true
  }
}

# Unsubscribe
POST /unsubscribe/:userId
```

### Email Statistics
```bash
GET /stats
```

## Flutter Integration

Add to your Flutter app:

```dart
// lib/services/email_api_service.dart
class EmailApiService {
  static const String baseUrl = 'http://localhost:3000'; // Update for production
  
  static Future<void> sendDoctorVerificationEmail({
    required String doctorId,
    required String status,
    String? adminId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/send-doctor-verification'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'doctorId': doctorId,
        'status': status,
        'adminId': adminId,
      }),
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to send verification email');
    }
  }
}
```

## Deployment Options

### Free Hosting
- **Vercel**: Deploy with `vercel --prod`
- **Railway**: Connect GitHub repo
- **Render**: Free tier available

### VPS Hosting
- **Hetzner**: ~$3.50/month
- **DigitalOcean**: $4/month
- **Linode**: $5/month

## Email Limits

- **Resend Free Tier**: 3,000 emails/month
- **Daily Conservative Limit**: 100 emails/day (set in code)
- **Rate Limiting**: 200ms delay between emails

## Firestore Collections

The service expects these Firestore collections:

```javascript
// doctors collection
{
  name: "Dr. John Smith",
  email: "doctor@example.com",
  specialization: "Cardiology",
  verificationStatus: "pending" // approved, rejected, pending
}

// users collection
{
  firstName: "Jane",
  email: "user@example.com",
  emailVerified: true,
  emailPreferences: {
    promotional: true,
    healthTips: false,
    doctorUpdates: true
  }
}

// email_campaigns collection
{
  title: "Campaign Title",
  content: "<p>Email content</p>",
  status: "draft" // draft, sent, scheduled
}
```

## Security Notes

⚠️ **CRITICAL SECURITY UPDATE (January 19, 2026)**

This email service is now **completely excluded** from the main Curevia repository for security reasons:

### 🔐 **Repository Security**
- **Main Repository**: https://github.com/9A-Ayush/curevia.git (email-service folder excluded)
- **Email Service**: Maintained separately with sensitive configurations
- **Environment Files**: Never commit `.env` or `serviceAccountKey.json` files
- **API Keys**: All sensitive keys stored in environment variables only

### 🛡️ **Security Best Practices**
- **NEVER commit `.env` file** - Contains real Gmail credentials and API keys
- **NEVER commit `serviceAccountKey.json`** - Contains Firebase private key
- **Use template files** - Copy from `.env.example` and `serviceAccountKey.json.template`
- **Rotate credentials regularly** - Change passwords and API keys periodically
- Use environment variables in production
- Implement rate limiting for production
- Validate all input data
- Use HTTPS in production
- Keep service account keys secure and rotate regularly

### 📁 **File Protection**
The following files should **NEVER** be committed to version control:
- `.env` - Contains email credentials and API keys
- `serviceAccountKey.json` - Firebase admin SDK key
- Any files containing actual API keys or passwords

### ✅ **Template Files (Safe to Commit)**
- `.env.example` - Template for environment variables
- `serviceAccountKey.json.template` - Template for Firebase service account
- All other configuration files without sensitive data

## Monitoring

- Check `/health` endpoint for service status
- Monitor `/stats` for email usage
- Set up daily counter reset via cron job

## Support

For issues or questions:
- Check server logs
- Test with `/test-email` endpoint
- Verify Resend API key is valid
- Ensure Firebase credentials are correct

## 🔗 Integration with Main Repository

This email service integrates with the main Curevia app:
- **Main Repository**: https://github.com/9A-Ayush/curevia.git
- **Integration**: Called via HTTP API from Flutter app
- **Security**: Completely separated for sensitive data protection
- **Deployment**: Independent deployment and scaling

---

**Ready to send emails! 🚀**

Monthly limit: 3,000 emails free with Resend
Perfect for doctor verifications and promotional campaigns.

**Security First**: This service is maintained separately from the main repository to protect sensitive email credentials and API keys.
