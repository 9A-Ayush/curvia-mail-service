const express = require('express');
const cors = require('cors');
require('dotenv').config();

const EmailService = require('./services/email-service');
const FirebaseService = require('./services/firebase-service');

const app = express();
const emailService = new EmailService();
const firebaseService = new FirebaseService();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for logo)
app.use('/assets', express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = emailService.getStats();
  res.json({ 
    status: 'Curevia Email Service Running',
    service: 'Gmail SMTP',
    limit: '~500 emails/day (Gmail limit)',
    dailyStats: stats,
    logoUrl: process.env.LOGO_URL,
    timestamp: new Date().toISOString()
  });
});

// Logo test endpoint
app.get('/logo-test', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Curevia Logo Test</h2>
        <div style="margin: 20px;">
          <img src="${process.env.LOGO_URL}" alt="Curevia Logo" style="width: 100px; height: 100px; border-radius: 50%; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        </div>
        <p>Logo URL: <code>${process.env.LOGO_URL}</code></p>
        <p>If you can see the logo above, it's working correctly!</p>
      </body>
    </html>
  `);
});

// Test email endpoint
app.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    await emailService.sendTestEmail(email);
    
    res.json({ 
      success: true, 
      message: `Test email sent to ${email}`,
      stats: emailService.getStats()
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// Doctor verification email endpoint
app.post('/send-doctor-verification', async (req, res) => {
  try {
    const { doctorId, status, adminId } = req.body;
    
    if (!doctorId || !status) {
      return res.status(400).json({ 
        error: 'doctorId and status are required' 
      });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'status must be either "approved" or "rejected"' 
      });
    }
    
    // Get doctor data from Firebase
    const doctorData = await firebaseService.getDoctor(doctorId);
    
    // Send verification email
    await emailService.sendDoctorVerificationEmail(doctorData, status);
    
    // Update doctor status in Firebase
    if (adminId) {
      await firebaseService.updateDoctorStatus(doctorId, status, adminId);
    }
    
    // Log email activity
    await firebaseService.logEmailActivity({
      type: 'doctor_verification',
      doctorId: doctorId,
      status: status,
      recipientEmail: doctorData.email,
      adminId: adminId
    });
    
    res.json({ 
      success: true, 
      message: `${status} email sent to Dr. ${doctorData.name}`,
      stats: emailService.getStats()
    });
  } catch (error) {
    console.error('❌ Doctor verification email error:', error);
    res.status(500).json({ 
      error: 'Failed to send doctor verification email',
      details: error.message 
    });
  }
});

// Promotional email campaign endpoint
app.post('/send-promotional-campaign', async (req, res) => {
  try {
    const { campaignId, campaignData } = req.body;
    
    let campaign;
    if (campaignId) {
      // Get campaign from Firebase
      campaign = await firebaseService.getCampaign(campaignId);
    } else if (campaignData) {
      // Use provided campaign data
      campaign = campaignData;
    } else {
      return res.status(400).json({ 
        error: 'Either campaignId or campaignData is required' 
      });
    }
    
    // Get users who opted in for promotional emails
    const users = await firebaseService.getPromotionalUsers();
    
    if (users.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No users opted in for promotional emails',
        results: []
      });
    }
    
    // Send promotional emails
    const results = await emailService.sendPromotionalEmail(users, campaign);
    
    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    // Log campaign activity
    await firebaseService.logEmailActivity({
      type: 'promotional_campaign',
      campaignId: campaignId,
      totalUsers: users.length,
      successful: successful,
      failed: failed,
      skipped: skipped
    });
    
    res.json({ 
      success: true, 
      message: `Campaign sent to ${successful}/${users.length} users`,
      summary: {
        total: users.length,
        sent: successful,
        failed: failed,
        skipped: skipped
      },
      results: results,
      stats: emailService.getStats()
    });
  } catch (error) {
    console.error('❌ Promotional campaign error:', error);
    res.status(500).json({ 
      error: 'Failed to send promotional campaign',
      details: error.message 
    });
  }
});

// Health tips newsletter endpoint
app.post('/send-health-tip', async (req, res) => {
  try {
    const { tip } = req.body;
    
    if (!tip || !tip.title || !tip.content) {
      return res.status(400).json({ 
        error: 'tip object with title and content is required' 
      });
    }
    
    // Get users who opted in for health tips
    const users = await firebaseService.getHealthTipUsers();
    
    if (users.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No users opted in for health tips',
        userCount: 0
      });
    }
    
    // Send health tip
    await emailService.sendHealthTip(users, tip);
    
    // Log activity
    await firebaseService.logEmailActivity({
      type: 'health_tip',
      tipTitle: tip.title,
      userCount: users.length
    });
    
    res.json({ 
      success: true, 
      message: `Health tip sent to ${users.length} users`,
      userCount: users.length,
      stats: emailService.getStats()
    });
  } catch (error) {
    console.error('❌ Health tip error:', error);
    res.status(500).json({ 
      error: 'Failed to send health tip',
      details: error.message 
    });
  }
});

// Email preferences endpoints
app.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await firebaseService.getUserEmailPreferences(userId);
    
    res.json({ 
      success: true, 
      preferences: preferences 
    });
  } catch (error) {
    console.error('❌ Get preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to get email preferences',
      details: error.message 
    });
  }
});

app.post('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    await firebaseService.updateUserEmailPreferences(userId, preferences);
    
    res.json({ 
      success: true, 
      message: 'Email preferences updated successfully' 
    });
  } catch (error) {
    console.error('❌ Update preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to update email preferences',
      details: error.message 
    });
  }
});

// Unsubscribe endpoint
app.post('/unsubscribe/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await firebaseService.unsubscribeUser(userId);
    
    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from all emails' 
    });
  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe',
      details: error.message 
    });
  }
});

// Email stats endpoint
app.get('/stats', (req, res) => {
  const stats = emailService.getStats();
  res.json({
    success: true,
    stats: stats,
    service: 'Resend',
    monthlyLimit: 3000
  });
});

// Reset daily counter endpoint (for cron jobs)
app.post('/reset-daily-counter', (req, res) => {
  emailService.resetDailyCount();
  res.json({ 
    success: true, 
    message: 'Daily counter reset successfully' 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /logo-test',
      'POST /test-email',
      'POST /send-doctor-verification',
      'POST /send-promotional-campaign',
      'POST /send-health-tip',
      'GET /preferences/:userId',
      'POST /preferences/:userId',
      'POST /unsubscribe/:userId',
      'GET /stats'
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Curevia Email Service Started');
  console.log(`📧 Server running on port ${PORT}`);
  console.log(`🔑 Using Gmail SMTP (~500 emails/day free)`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📊 Available endpoints:');
  console.log('   GET  /health - Service status');
  console.log('   GET  /logo-test - Test logo display');
  console.log('   POST /test-email - Send test email');
  console.log('   POST /send-doctor-verification - Doctor approval/rejection');
  console.log('   POST /send-promotional-campaign - Marketing emails');
  console.log('   POST /send-health-tip - Health newsletters');
  console.log('   GET  /stats - Email statistics');
});