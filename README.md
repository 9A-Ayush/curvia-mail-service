# Curevia Email Service 📧

A comprehensive email service for the Curevia healthcare platform with **real-time Firebase integration** and automated email workflows.

## 🚀 Features

### Email Capabilities
- **Doctor Verification Emails** - Approval/rejection notifications
- **Promotional Campaigns** - Marketing and announcements  
- **Health Tips Newsletter** - Wellness content distribution
- **Test Emails** - Development and testing support
- **Welcome Emails** - New user onboarding

### Real-Time Automation 🔥
- **Auto-send doctor verification emails** when status changes in Firebase
- **Welcome emails for new users** upon registration
- **Scheduled campaign execution** at specified times
- **Health tip distribution** to subscribed users
- **Live dashboard** with real-time statistics

### Technical Stack
- **Email Provider**: Gmail SMTP (~500 emails/day)
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore with real-time listeners
- **Authentication**: Firebase Admin SDK
- **Styling**: Responsive HTML email templates

## 📊 Real-Time Dashboard

Access the live dashboard at: `http://localhost:3000/dashboard`

Features:
- Live Firebase statistics
- Active listener monitoring
- Email delivery metrics
- System health status
- Auto-refresh every 30 seconds

## Features

- 📧 Doctor verification emails (approval/rejection)
- 🎯 Promotional email campaigns
- 💡 Health tips newsletters
- 🧪 Email testing capabilities
- 📊 Email statistics and tracking
- 🔧 User preference management
- 🚫 Unsubscribe functionality

## Setup

### 1. Install Dependencies

```bash
cd email-service
npm install
```

### 2. Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Go to** [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. **Select Mail** → **Other (Custom name)**
4. **Enter** "Curevia Email Service"
5. **Copy the 16-character password**

### 3. Environment Configuration

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

- Never commit `.env` file
- Use environment variables in production
- Implement rate limiting for production
- Validate all input data
- Use HTTPS in production

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

---

**Ready to send emails! 🚀**

Monthly limit: 3,000 emails free with Resend
Perfect for doctor verifications and promotional campaigns.