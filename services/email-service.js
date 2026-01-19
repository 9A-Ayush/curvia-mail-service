const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    this.emailsSentToday = 0;
    this.dailyLimit = 100; // Conservative limit for free tier
    
    // Load logo URL for reliable email display
    this.logoUrl = this.loadLogoUrl();
  }

  // Load logo URL
  loadLogoUrl() {
    try {
      // Use optimized Cloudinary logo with transformations for better email compatibility
      const cloudinaryLogoUrl = 'https://res.cloudinary.com/dx8tgaqeh/image/upload/w_80,h_80,q_auto,f_auto/v1767907723/curevia_icon_bzm4sa.png';
      
      console.log('✅ Using optimized Cloudinary hosted Curevia logo');
      return cloudinaryLogoUrl;
      
    } catch (error) {
      console.error('❌ Error loading Cloudinary logo:', error.message);
      return process.env.LOGO_URL || 'https://via.placeholder.com/80x80/28a745/ffffff?text=C';
    }
  }

  // Create text-based logo branding (most reliable for email clients)
  getTextLogo() {
    return `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: white; font-family: Arial, sans-serif;">CUREVIA</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; color: white;">Healthcare Platform</p>
      </div>`;
  }

  // Create simple footer branding
  getFooterBranding() {
    return `<strong style="color: #28a745; font-size: 14px; font-family: Arial, sans-serif;">CUREVIA HEALTH</strong>`;
  }
  async sendDoctorVerificationEmail(doctorData, status) {
    if (this.emailsSentToday >= this.dailyLimit) {
      throw new Error('Daily email limit reached');
    }

    const emailOptions = {
      from: `Curevia Team <${process.env.FROM_EMAIL}>`,
      to: doctorData.email,
      subject: status === 'approved' 
        ? '🎉 Welcome to Curevia - Application Approved!' 
        : '📋 Curevia Application Update',
      html: this.getDoctorEmailTemplate(doctorData, status)
    };

    try {
      const result = await this.transporter.sendMail(emailOptions);
      this.emailsSentToday++;
      console.log(`✅ Doctor ${status} email sent to ${doctorData.email} (${this.emailsSentToday}/${this.dailyLimit})`);
      return result;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  // Promotional emails
  async sendPromotionalEmail(users, campaign) {
    const results = [];
    
    for (const user of users) {
      if (this.emailsSentToday >= this.dailyLimit) {
        results.push({ email: user.email, status: 'skipped', reason: 'Daily limit reached' });
        continue;
      }

      const emailOptions = {
        from: `Curevia Health <${process.env.PROMOTIONS_EMAIL}>`,
        to: user.email,
        subject: (campaign.subject || campaign.title || 'Update from Curevia').replace('{{firstName}}', user.firstName || 'there'),
        html: this.getPromotionalTemplate(user, campaign),
        headers: {
          'List-Unsubscribe': `<${process.env.UNSUBSCRIBE_URL}?token=${user.id}>`
        }
      };

      try {
        await this.transporter.sendMail(emailOptions);
        this.emailsSentToday++;
        results.push({ email: user.email, status: 'sent' });
        console.log(`📧 Promotional email sent to ${user.email}`);
        
        // Small delay to avoid rate limiting
        await this.delay(200);
      } catch (error) {
        results.push({ email: user.email, status: 'failed', error: error.message });
        console.error(`❌ Failed to send to ${user.email}:`, error.message);
      }
    }
    
    return results;
  }

  // Health tips newsletter
  async sendHealthTip(users, tip) {
    if (this.emailsSentToday >= this.dailyLimit) {
      throw new Error('Daily email limit reached');
    }

    // Send in batches of 50 for better deliverability
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const emailOptions = {
        from: `Curevia Health Tips <${process.env.HEALTH_TIPS_EMAIL}>`,
        subject: `💡 Health Tip: ${tip.title}`,
        html: this.getHealthTipTemplate(tip),
        bcc: batch.map(user => user.email).join(',')
      };

      try {
        await this.transporter.sendMail(emailOptions);
        this.emailsSentToday++;
        console.log(`📚 Health tip sent to ${batch.length} users`);
        
        // Wait between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(2000);
        }
      } catch (error) {
        console.error('❌ Health tip batch failed:', error);
      }
    }
  }

  // Test email
  async sendTestEmail(toEmail) {
    const emailOptions = {
      from: `Curevia Test <${process.env.FROM_EMAIL}>`,
      to: toEmail,
      subject: '🧪 Curevia Email Service Test',
      html: this.getTestEmailTemplate()
    };

    try {
      const result = await this.transporter.sendMail(emailOptions);
      console.log(`✅ Test email sent to ${toEmail}`);
      return result;
    } catch (error) {
      console.error('❌ Test email failed:', error);
      throw error;
    }
  }

  // Email Templates
  getDoctorEmailTemplate(doctorData, status) {
    if (status === 'approved') {
      return `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa;">
          <!-- Header with Text Logo -->
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 30px; text-align: center;">
            ${this.getTextLogo()}
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Curevia!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your application has been approved</p>
          </div>
          
          <div style="background: white; padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0;">Hello Dr. ${doctorData.name}!</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Congratulations! We're excited to welcome you to the Curevia healthcare platform. 
              Your medical credentials have been verified and your application has been approved.
            </p>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0; font-size: 18px;">🚀 Next Steps:</h3>
              <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Complete your profile setup</li>
                <li>Set your consultation availability</li>
                <li>Upload your profile photo</li>
                <li>Start accepting patient appointments</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${process.env.APP_URL}/doctor/dashboard" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(40,167,69,0.3); font-size: 16px; margin-right: 10px;">
                🏥 Access Your Dashboard
              </a>
              <a href="https://curevia-download.vercel.app/" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,123,255,0.3); font-size: 16px;">
                📱 Download App
              </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">📞 Need Help?</h4>
              <p style="color: #666; margin: 0; line-height: 1.6;">
                Our support team is here to help you get started. Contact us at 
                <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #1976d2; text-decoration: none;">${process.env.SUPPORT_EMAIL}</a>
              </p>
            </div>
            
            <p style="color: #666; margin-bottom: 0; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              Best regards,<br>
              <strong style="color: #28a745;">The Curevia Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <div style="margin-bottom: 10px;">
              ${this.getFooterBranding()}
            </div>
            </div>
            <p style="margin: 0;">Your trusted healthcare companion</p>
          </div>
        </div>
      `;
    } else {
      return `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa;">
          <!-- Header with Text Logo -->
          <div style="background: #dc3545; padding: 40px 30px; text-align: center;">
            ${this.getTextLogo()}
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Application Update</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Additional information required</p>
          </div>
          
          <div style="background: white; padding: 40px 30px;">
            <h2 style="color: #333; margin-top: 0;">Hello Dr. ${doctorData.name},</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for your interest in joining Curevia. After careful review of your application, 
              we need additional information or documentation before we can proceed with approval.
            </p>
            
            <div style="background: #fff3cd; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin-top: 0;">⚠️ What's Next?</h4>
              <p style="color: #856404; margin: 0; line-height: 1.6;">
                Please review your submitted documents and contact our support team 
                for specific requirements. We're here to help you complete the process.
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="mailto:${process.env.SUPPORT_EMAIL}" 
                 style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; margin-right: 10px;">
                📧 Contact Support
              </a>
              <a href="https://curevia-download.vercel.app/" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,123,255,0.3); font-size: 16px;">
                📱 Download App
              </a>
            </div>
            
            <p style="color: #666; margin-bottom: 0; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              We appreciate your patience and look forward to welcoming you to our platform.<br><br>
              Best regards,<br>
              <strong style="color: #dc3545;">The Curevia Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <div style="margin-bottom: 10px;">
              ${this.getFooterBranding()}
            </div>
            </div>
            <p style="margin: 0;">Your trusted healthcare companion</p>
          </div>
        </div>
      `;
    }
  }

  getPromotionalTemplate(user, campaign) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa;">
        <!-- Header with Text Logo -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          ${this.getTextLogo()}
          <h1 style="color: white; margin: 0; font-size: 28px;">Hi ${user.firstName || 'there'}! 👋</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${campaign.subtitle || 'Special update from Curevia'}</p>
        </div>
        
        <div style="background: white; padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">${campaign.title}</h2>
          
          <div style="color: #666; line-height: 1.6; font-size: 16px;">
            ${campaign.content}
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${campaign.ctaLink}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(40,167,69,0.3); margin-right: 10px;">
              ${campaign.ctaText}
            </a>
            <a href="https://curevia-download.vercel.app/" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,123,255,0.3); font-size: 16px;">
              📱 Download App
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            <a href="${process.env.UNSUBSCRIBE_URL}?token=${user.id}" style="color: #999; text-decoration: none;">Unsubscribe</a> | 
            <a href="${process.env.PREFERENCES_URL}?token=${user.id}" style="color: #999; text-decoration: none;">Email Preferences</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <div style="margin-bottom: 10px;">
            ${this.getFooterBranding()}
          </div>
          </div>
          <p style="margin: 0;">© 2026 Curevia Health. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  getHealthTipTemplate(tip) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa;">
        <!-- Header with Text Logo -->
        <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 40px 30px; text-align: center;">
          ${this.getTextLogo()}
          <h1 style="color: white; margin: 0; font-size: 28px;">💡 Health Tip</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your weekly dose of wellness</p>
        </div>
        
        <div style="background: white; padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">${tip.title}</h2>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #17a2b8;">
            <div style="color: #666; line-height: 1.6; font-size: 16px;">
              ${tip.content}
            </div>
          </div>
          
          ${tip.actionItems ? `
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #28a745; margin-top: 0;">✅ Action Items:</h4>
            <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
              ${tip.actionItems.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.APP_URL}" 
               style="background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; margin-right: 10px;">
              📱 Open Curevia App
            </a>
            <a href="https://curevia-download.vercel.app/" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,123,255,0.3); font-size: 16px;">
              📱 Download App
            </a>
          </div>
          
          <p style="color: #666; margin-bottom: 0; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
            Stay healthy with Curevia! 🌟
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <div style="margin-bottom: 10px;">
            ${this.getFooterBranding()}
          </div>
          </div>
          <p style="margin: 0;">Your trusted healthcare companion</p>
        </div>
      </div>
    `;
  }

  getTestEmailTemplate() {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa;">
        <!-- Header with Text Logo -->
        <div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); padding: 40px 30px; text-align: center;">
          ${this.getTextLogo()}
          <h1 style="color: white; margin: 0; font-size: 28px;">🧪 Email Service Test</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Curevia Email Service is working!</p>
        </div>
        
        <div style="background: white; padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">✅ Test Successful!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Your Curevia email service is configured correctly and ready to send emails.
          </p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
            <h4 style="color: #155724; margin-top: 0;">📊 Service Details:</h4>
            <ul style="color: #155724; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Email Provider: Gmail SMTP</li>
              <li>Daily Limit: ~500 emails</li>
              <li>Status: Active</li>
              <li>Test Time: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px;">
              <h4 style="color: #1976d2; margin-top: 0;">🚀 Ready to Send:</h4>
              <p style="color: #666; margin: 0;">
                ✅ Doctor verification emails<br>
                ✅ Promotional campaigns<br>
                ✅ Health tips newsletters<br>
                ✅ Custom notifications
              </p>
            </div>
          </div>
          
          <p style="color: #666; margin-bottom: 0; text-align: center;">
            <strong>Your email service is ready! 🚀</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <div style="margin-bottom: 10px;">
            ${this.getFooterBranding()}
          </div>
          </div>
          <p style="margin: 0;">Email Service Test - ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;
  }

  // Send appointment notification email
  async sendAppointmentNotification(patientData, doctorData, appointmentInfo) {
    const subject = `${appointmentInfo.subject} - Curevia`;
    
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          ${this.getTextLogo()}
        </div>
        
        <div style="background: white; padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">📅 ${appointmentInfo.type === 'booked' ? 'Appointment Confirmed' : appointmentInfo.type === 'reminder' ? 'Appointment Reminder' : 'Appointment Update'}</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Dear ${patientData.firstName || patientData.name},
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            ${appointmentInfo.content}
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #333; margin-top: 0;">👨‍⚕️ Appointment Details:</h4>
            <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Doctor:</strong> Dr. ${doctorData.name}</li>
              <li><strong>Specialization:</strong> ${doctorData.specialization || 'General Medicine'}</li>
              ${appointmentInfo.appointmentData?.date ? `<li><strong>Date:</strong> ${appointmentInfo.appointmentData.date}</li>` : ''}
              ${appointmentInfo.appointmentData?.time ? `<li><strong>Time:</strong> ${appointmentInfo.appointmentData.time}</li>` : ''}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://curevia.app/appointments" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              View Appointment
            </a>
          </div>
          
          <p style="color: #666; margin-bottom: 0; text-align: center; font-size: 14px;">
            Need help? Contact our support team at support@curevia.com
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <div style="margin-bottom: 10px;">
            ${this.getFooterBranding()}
          </div>
          <p style="margin: 0;">© ${new Date().getFullYear()} Curevia. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.sendEmail(patientData.email, subject, htmlContent);
  }

  // Send payment notification email
  async sendPaymentNotification(patientData, paymentInfo) {
    const subject = `${paymentInfo.subject} - Curevia`;
    
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          ${this.getTextLogo()}
        </div>
        
        <div style="background: white; padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">💳 ${paymentInfo.type === 'success' ? 'Payment Successful' : paymentInfo.type === 'failed' ? 'Payment Failed' : 'Refund Processed'}</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Dear ${patientData.firstName || patientData.name},
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            ${paymentInfo.content}
          </p>
          
          <div style="background: ${paymentInfo.type === 'success' ? '#d4edda' : paymentInfo.type === 'failed' ? '#f8d7da' : '#d1ecf1'}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${paymentInfo.type === 'success' ? '#28a745' : paymentInfo.type === 'failed' ? '#dc3545' : '#17a2b8'};">
            <h4 style="color: ${paymentInfo.type === 'success' ? '#155724' : paymentInfo.type === 'failed' ? '#721c24' : '#0c5460'}; margin-top: 0;">💰 Payment Details:</h4>
            <ul style="color: ${paymentInfo.type === 'success' ? '#155724' : paymentInfo.type === 'failed' ? '#721c24' : '#0c5460'}; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Amount:</strong> ₹${paymentInfo.amount}</li>
              ${paymentInfo.doctorData ? `<li><strong>Doctor:</strong> Dr. ${paymentInfo.doctorData.name}</li>` : ''}
              ${paymentInfo.paymentData?.method ? `<li><strong>Payment Method:</strong> ${paymentInfo.paymentData.method}</li>` : ''}
              ${paymentInfo.paymentData?.transactionId ? `<li><strong>Transaction ID:</strong> ${paymentInfo.paymentData.transactionId}</li>` : ''}
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          ${paymentInfo.type === 'success' ? `
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://curevia.app/appointments" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              View Appointment
            </a>
          </div>
          ` : paymentInfo.type === 'failed' ? `
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://curevia.app/payments/retry" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Retry Payment
            </a>
          </div>
          ` : ''}
          
          <p style="color: #666; margin-bottom: 0; text-align: center; font-size: 14px;">
            Need help? Contact our support team at support@curevia.com
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <div style="margin-bottom: 10px;">
            ${this.getFooterBranding()}
          </div>
          <p style="margin: 0;">© ${new Date().getFullYear()} Curevia. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.sendEmail(patientData.email, subject, htmlContent);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset daily counter (call this daily via cron job)
  resetDailyCount() {
    this.emailsSentToday = 0;
    console.log('📊 Daily email counter reset');
  }

  // Get current stats
  getStats() {
    return {
      emailsSentToday: this.emailsSentToday,
      dailyLimit: this.dailyLimit,
      remaining: this.dailyLimit - this.emailsSentToday
    };
  }
}

module.exports = EmailService;
