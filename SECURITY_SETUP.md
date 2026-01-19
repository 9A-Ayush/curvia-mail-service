# 🔐 Email Service Security Setup

## ⚠️ CRITICAL SECURITY NOTICE

This email service contains **HIGHLY SENSITIVE** credentials including:
- Gmail SMTP credentials
- Firebase private keys
- API keys and tokens

## 🛡️ Files Protected from Git

### ✅ **Already Secured (Not in Repository)**
- `.env` - Contains real Gmail credentials and API keys
- `serviceAccountKey.json` - Contains Firebase private key and service account

### ✅ **Template Files (Safe in Repository)**
- `.env.example` - Template for environment setup
- `serviceAccountKey.json.template` - Template for Firebase service account

## 🚨 **Setup Instructions for New Developers**

### 1. **Copy Template Files**
```bash
# Navigate to email-service directory
cd email-service

# Copy environment template
cp .env.example .env

# Copy Firebase service account template
cp serviceAccountKey.json.template serviceAccountKey.json
```

### 2. **Configure Real Credentials**

#### **Edit `.env` file:**
```bash
# Replace with your actual Gmail credentials
GMAIL_USER=your-actual-gmail@gmail.com
GMAIL_APP_PASSWORD=your-actual-16-char-app-password

# Replace with your Firebase project details
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=your-actual-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="your-actual-private-key"
```

#### **Edit `serviceAccountKey.json`:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Replace the template content with the downloaded JSON

### 3. **Verify Security**
```bash
# Check that sensitive files are not tracked
git status

# These files should NOT appear in git status:
# - .env
# - serviceAccountKey.json
```

## 🔒 **Security Verification Checklist**

Before any Git operations, verify:
- [ ] `.env` file is not staged for commit
- [ ] `serviceAccountKey.json` is not staged for commit
- [ ] Only template files are tracked by Git
- [ ] `.gitignore` properly excludes sensitive files
- [ ] No real credentials are visible in any tracked files

## 🚨 **Emergency Security Response**

If sensitive files were accidentally committed:

1. **Immediately rotate all credentials**:
   - Change Gmail app password
   - Generate new Firebase service account key
   - Update all API keys

2. **Remove from Git history**:
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env serviceAccountKey.json' --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push to overwrite history**:
   ```bash
   git push origin --force --all
   ```

## 📋 **Daily Security Practices**

1. **Never share credentials** via chat, email, or screenshots
2. **Use environment variables** in production deployments
3. **Regularly rotate credentials** (monthly recommended)
4. **Monitor access logs** for unauthorized usage
5. **Keep local files secure** with proper file permissions

## 🔐 **Production Deployment Security**

- Use environment variables, not files
- Enable HTTPS only
- Implement rate limiting
- Use secure hosting with proper access controls
- Monitor for suspicious activity
- Regular security audits

Your email service is now properly secured! 🛡️