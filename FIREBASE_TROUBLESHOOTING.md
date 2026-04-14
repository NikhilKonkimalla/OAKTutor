# Firebase Logging Troubleshooting Guide

## Changes Made

I've made the following improvements to help diagnose and fix Firebase logging issues:

1. **Added site visit logging** - The app now automatically logs when a user visits the webapp
2. **Improved error handling** - Better error messages to identify issues
3. **Enhanced debugging** - More console logs to track Firebase initialization

## How to Diagnose the Issue

### Step 1: Check Browser Console

1. Open your webapp in the browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Look for these messages:

**Expected messages (if working):**
- `"Firebase initialized successfully"` (in development mode)
- `"Writing this payload to firebase: ..."`
- `"Successfully wrote to siteLogs"`

**Error messages to look for:**
- `"Failed to initialize Firebase:"` - Firebase config issue
- `"PERMISSION DENIED: Check your Firestore security rules!"` - Security rules blocking writes
- `"Firebase database not initialized"` - Initialization failed
- `"Firebase initialized but methods not available"` - Constructor issue

### Step 2: Check Firebase Configuration

Verify your Firebase config in `src/config/firebaseConfig.js` matches your Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **General**
4. Scroll to **"Your apps"** → Select your web app
5. Compare the config values with `src/config/firebaseConfig.js`

**Common issues:**
- Wrong `projectId` - data goes to wrong project
- Wrong `apiKey` - authentication fails
- Missing `authDomain` - connection fails

### Step 3: Check Firestore Security Rules

This is the **most common issue**! Your Firestore rules might be blocking writes.

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Check your current rules

**For development/testing, use:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

**⚠️ Warning:** The above rules allow open access. Only use for development!

3. Click **"Publish"** to save the rules

### Step 4: Verify Firebase is Enabled

Check `src/config/config.js`:

```javascript
const ENABLE_FIREBASE = true;  // Must be true
const DO_LOG_DATA = true;      // Must be true
```

### Step 5: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Filter by "firestore" or "googleapis"
3. Look for requests to Firebase
4. Check the response:
   - **200 OK** = Success
   - **403 Forbidden** = Permission denied (check security rules)
   - **400 Bad Request** = Invalid request (check config)

### Step 6: Verify Data in Firestore

1. Go to Firebase Console → **Firestore Database**
2. Look for these collections:
   - `siteLogs` (or `development_siteLogs` in dev mode)
   - `problemSubmissions`
   - `problemStartLogs`

3. If you see `development_*` collections, you're in development mode (this is normal)

## Common Issues and Solutions

### Issue: "Permission denied" errors

**Solution:** Update Firestore security rules (see Step 3 above)

### Issue: No data appearing in Firestore

**Possible causes:**
1. Firestore security rules blocking writes
2. Wrong Firebase project ID in config
3. Firebase not initialized (check console for errors)
4. `ENABLE_FIREBASE` or `DO_LOG_DATA` set to false

**Solution:** Follow Steps 1-6 above

### Issue: Firebase initializes but no logs appear

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Firestore security rules
4. Verify `this.firebase.submitSiteLog` is being called

### Issue: "Firebase database not initialized"

**Possible causes:**
1. `ENABLE_FIREBASE = false` in config
2. Firebase constructor returned early
3. Error during initialization

**Solution:** Check browser console for the specific error

## Testing the Fix

After making changes:

1. **Clear browser cache** and reload the page
2. **Check browser console** for initialization messages
3. **Interact with the app** (navigate, select a lesson, etc.)
4. **Check Firestore** in Firebase Console for new documents

## What Gets Logged Now

With the changes I made, the app will now log:

1. **Site visits** - When a user first loads the webapp
   - Collection: `siteLogs` (or `development_siteLogs`)
   - Log type: `"site-visit"`
   - Includes: URL, user agent, screen size, viewport size

2. **Problem interactions** - When users interact with problems
   - Collection: `problemSubmissions`

3. **Problem starts** - When users start a problem
   - Collection: `problemStartLogs`

4. **Focus changes** - When users switch tabs (if enabled)
   - Collection: `focusStatus`

5. **Site errors** - When errors occur
   - Collection: `siteLogs`
   - Log type: `"site-error"`

## Still Not Working?

If you're still having issues:

1. **Share the browser console output** - Copy all Firebase-related messages
2. **Check Firestore rules** - Make sure they allow writes
3. **Verify project ID** - Ensure it matches your Firebase project
4. **Test with a simple write** - Try writing directly from browser console:

```javascript
// In browser console, after page loads
if (window.firebaseTest) {
  window.firebaseTest.firebase.submitSiteLog("test", "Manual test", {test: true});
}
```

## Next Steps

Once logging is working:
1. Review the data in Firestore
2. Set up proper security rules for production
3. Consider setting up Firebase Analytics for additional insights
4. Monitor the `siteLogs` collection to track user visits





