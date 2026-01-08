const express = require('express');
const cors = require('cors');
require('dotenv').config();

const EmailService = require('./services/email-service');
const FirebaseService = require('./services/firebase-service');

const app = express();
const emailService = new EmailService();
const firebaseService = new FirebaseService();

// Connect email service to firebase for real-time operations
firebaseService.setEmailService(emailService);

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

// Start real-time listeners when server starts
firebaseService.startRealTimeListeners();

// Health check endpoint with real-time stats
app.get('/health', async (req, res) => {
  try {
    const stats = emailService.getStats();
    const firebaseStats = await firebaseService.getRealTimeStats();
    
    res.json({ 
      status: 'Curevia Email Service Running',
      service: 'Gmail SMTP',
      limit: '~500 emails/day (Gmail limit)',
      dailyStats: stats,
      firebase: firebaseStats,
      realTime: {
        listenersActive: firebaseStats.listeners.active,
        activeListeners: firebaseStats.listeners.names
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error getting health stats',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Real-time stats endpoint
app.get('/stats/realtime', async (req, res) => {
  try {
    const firebaseStats = await firebaseService.getRealTimeStats();
    const emailStats = emailService.getStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      email: emailStats,
      firebase: firebaseStats,
      realTime: {
        status: 'active',
        listeners: firebaseStats.listeners.names,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time stats',
      details: error.message
    });
  }
});

// Manual trigger for real-time listeners restart
app.post('/realtime/restart', (req, res) => {
  try {
    firebaseService.stopAllListeners();
    setTimeout(() => {
      firebaseService.startRealTimeListeners();
    }, 1000);
    
    res.json({
      success: true,
      message: 'Real-time listeners restarted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restart listeners',
      details: error.message
    });
  }
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

// Real-time dashboard endpoint
app.get('/dashboard', async (req, res) => {
  try {
    const firebaseStats = await firebaseService.getRealTimeStats();
    const emailStats = emailService.getStats();
    
    const dashboardHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Curevia Email Service - Real-Time Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .stat-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
            .stat-value { font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 5px; }
            .stat-label { color: #666; font-size: 14px; }
            .status-active { color: #28a745; }
            .status-inactive { color: #dc3545; }
            .refresh-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px 5px; }
            .refresh-btn:hover { background: #0056b3; }
            .listeners-list { list-style: none; padding: 0; }
            .listeners-list li { background: #e8f5e8; padding: 8px 12px; margin: 5px 0; border-radius: 5px; }
        </style>
        <script>
            function refreshStats() {
                location.reload();
            }
            
            function restartListeners() {
                fetch('/realtime/restart', { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        alert(data.message || 'Listeners restarted');
                        setTimeout(refreshStats, 2000);
                    })
                    .catch(error => alert('Error: ' + error.message));
            }
            
            // Auto-refresh every 30 seconds
            setInterval(refreshStats, 30000);
        </script>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔥 Curevia Email Service</h1>
                <p>Real-Time Dashboard</p>
                <p><strong>Status:</strong> <span class="status-active">ACTIVE</span> | <strong>Uptime:</strong> ${Math.floor(process.uptime())} seconds</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <button class="refresh-btn" onclick="refreshStats()">🔄 Refresh Stats</button>
                <button class="refresh-btn" onclick="restartListeners()">🚀 Restart Listeners</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-title">📧 Email Statistics</div>
                    <div class="stat-value">${emailStats.emailsSentToday}</div>
                    <div class="stat-label">Emails sent today (${emailStats.dailyLimit} limit)</div>
                    <div style="margin-top: 10px;">
                        <div class="stat-value">${emailStats.remaining}</div>
                        <div class="stat-label">Remaining today</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-title">🏥 Doctors</div>
                    <div class="stat-value">${firebaseStats.doctors.total}</div>
                    <div class="stat-label">Total doctors</div>
                    <div style="margin-top: 10px;">
                        <div><strong>Pending:</strong> ${firebaseStats.doctors.pending}</div>
                        <div><strong>Approved:</strong> ${firebaseStats.doctors.approved}</div>
                        <div><strong>Rejected:</strong> ${firebaseStats.doctors.rejected}</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-title">👤 Users</div>
                    <div class="stat-value">${firebaseStats.users.total}</div>
                    <div class="stat-label">Total users</div>
                    <div style="margin-top: 10px;">
                        <div><strong>Email Verified:</strong> ${firebaseStats.users.emailVerified}</div>
                        <div><strong>Promotional Opt-in:</strong> ${firebaseStats.users.promotionalOptIn}</div>
                        <div><strong>Health Tips Opt-in:</strong> ${firebaseStats.users.healthTipsOptIn}</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-title">📨 Campaigns</div>
                    <div class="stat-value">${firebaseStats.campaigns.total}</div>
                    <div class="stat-label">Total campaigns</div>
                    <div style="margin-top: 10px;">
                        <div><strong>Draft:</strong> ${firebaseStats.campaigns.draft}</div>
                        <div><strong>Scheduled:</strong> ${firebaseStats.campaigns.scheduled}</div>
                        <div><strong>Sent:</strong> ${firebaseStats.campaigns.sent}</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-title">🔥 Real-Time Listeners</div>
                    <div class="stat-value">${firebaseStats.listeners.active}</div>
                    <div class="stat-label">Active listeners</div>
                    <div style="margin-top: 10px;">
                        <ul class="listeners-list">
                            ${firebaseStats.listeners.names.map(name => `<li>✅ ${name}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">📊 System Information</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}<br>
                        <strong>Node Version:</strong> ${process.version}<br>
                        <strong>Platform:</strong> ${process.platform}
                    </div>
                    <div>
                        <strong>Memory Usage:</strong> ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB<br>
                        <strong>Last Updated:</strong> ${new Date().toLocaleString()}<br>
                        <strong>Auto-refresh:</strong> 30 seconds
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
    
    res.send(dashboardHtml);
  } catch (error) {
    res.status(500).send(`
      <html><body style="font-family: Arial; padding: 50px; text-align: center;">
        <h2>❌ Dashboard Error</h2>
        <p>${error.message}</p>
        <button onclick="location.reload()">🔄 Retry</button>
      </body></html>
    `);
  }
});
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
      'GET /health - Service status with real-time stats',
      'GET /dashboard - Real-time visual dashboard',
      'GET /stats/realtime - Real-time Firebase statistics',
      'POST /realtime/restart - Restart real-time listeners',
      'GET /logo-test - Test logo display',
      'POST /test-email - Send test email',
      'POST /send-doctor-verification - Doctor approval/rejection',
      'POST /send-promotional-campaign - Marketing emails',
      'POST /send-health-tip - Health newsletters',
      'GET /preferences/:userId - Get user email preferences',
      'POST /preferences/:userId - Update user email preferences',
      'POST /unsubscribe/:userId - Unsubscribe user from emails',
      'GET /stats - Email statistics',
      'POST /reset-daily-counter - Reset daily email counter'
    ]
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('🚀 Curevia Email Service Started');
  console.log(`📧 Server running on port ${PORT}`);
  console.log(`🔑 Using Gmail SMTP (~500 emails/day free)`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase real-time listeners: ACTIVE`);
  console.log('📊 Available endpoints:');
  console.log('   GET  /health - Service status with real-time stats');
  console.log('   GET  /stats/realtime - Real-time Firebase statistics');
  console.log('   POST /realtime/restart - Restart real-time listeners');
  console.log('   GET  /logo-test - Test logo display');
  console.log('   POST /test-email - Send test email');
  console.log('   POST /send-doctor-verification - Doctor approval/rejection');
  console.log('   POST /send-promotional-campaign - Marketing emails');
  console.log('   POST /send-health-tip - Health newsletters');
  console.log('   GET  /stats - Email statistics');
  console.log('');
  console.log('🔥 Real-time Features:');
  console.log('   • Auto-send doctor verification emails');
  console.log('   • Welcome emails for new users');
  console.log('   • Scheduled campaign execution');
  console.log('   • Health tip distribution');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  firebaseService.stopAllListeners();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  firebaseService.stopAllListeners();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});