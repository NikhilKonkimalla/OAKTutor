# Firebase Setup Guide for OAKTutor
This guide will help you link your OAKTutor project to Firebase for data logging and storage.

## Current Setup Status

Your project already has:
- ✅ Firebase SDK installed (v9.9.1)
- ✅ Firebase wrapper class (`src/components/Firebase.js`)
- ✅ Firebase configuration file (`src/config/firebaseConfig.js`)
- ✅ Environment variable support for configuration

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "oaktutor" or "oaktutor-dev")
4. Follow the setup wizard:
   - Google Analytics is optional (you can enable/disable it)
   - Choose your Analytics account if enabled
5. Click **"Create project"** and wait for it to initialize

## Step 2: Enable Firestore Database

1. In your Firebase project, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development) or **"Start in production mode"** (for production)
   - **Test mode**: Allows read/write access for 30 days (suitable for development)
   - **Production mode**: Requires security rules (recommended for production)
4. Select a Cloud Firestore location (choose the closest to your users)
5. Click **"Enable"**

### Firestore Security Rules (Recommended for Production)

For production, update your Firestore security rules. Go to **Firestore Database** → **Rules** and use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (for development)
    // TODO: Update these rules for production
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ Important**: The above rules allow open access. For production, implement proper authentication and authorization rules.

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon) → **General** tab
2. Scroll down to **"Your apps"** section
3. If you haven't added a web app yet:
   - Click **"Add app"** → Select **Web** (</> icon)
   - Register your app with a nickname (e.g., "OAKTutor Web")
   - Click **"Register app"**
4. Copy the **Firebase configuration object** (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX" // Optional, only if Analytics is enabled
};
```

## Step 4: Configure Firebase in Your Project

You have **two options** for configuring Firebase:

### Option A: Direct Configuration (Quick Setup)

Update `src/config/firebaseConfig.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

export default firebaseConfig;
```

**Note**: This method stores credentials in your code. For production, use Option B.

### Option B: Environment Variables (Recommended for Production)

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your Firebase config as a base64-encoded JSON string:

```bash
# .env
REACT_APP_FIREBASE_CONFIG=eyJhcGtleSI6IllPVVJfQVBJX0tFWSIsImF1dGhEb21haW4iOiJZT1VSX1BST0pFQ1QuZmlyZWJhc2VhcHAuY29tIiwicHJvamVjdElkIjoiWU9VUl9QUk9KRUNUX0lEIiwic3RvcmFnZUJ1Y2tldCI6IllPVVJfUFJPSkVDVC5hcHBzcG90LmNvbSIsIm1lc3NhZ2luZ1NlbmRlcklkIjoiWU9VUl9TRU5ERVJfSUQiLCJhcHBJZCI6IjE6WU9VUl9TRU5ERVJfSUQ6d2ViOmFiY2RlZiIsIm1lYXN1cmVtZW50SWQiOiJHLVhYWFhYWFhYWFgifQ==
```

**To generate the base64 string**, you can use this in your browser console or Node.js:

```javascript
// In browser console or Node.js
const config = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Encode to base64
const encoded = btoa(JSON.stringify(config));
console.log(encoded);
```

3. The `loadFirebaseEnvConfig` function in `src/util/loadFirebaseEnvConfig.js` will automatically load and merge this config with the default config in `firebaseConfig.js`.

**Benefits of Option B**:
- Keeps credentials out of version control
- Allows different configs for development/staging/production
- More secure for production deployments

## Step 5: Verify Firebase is Enabled

Check that Firebase is enabled in `src/config/config.js`:

```javascript
const ENABLE_FIREBASE = true;  // Should be true
const DO_LOG_DATA = true;      // Should be true to log data
```

## Step 6: Test Your Firebase Connection

1. Start your development server:
   ```bash
   npm start
   ```

2. Open your browser's developer console (F12)
3. Navigate through the app and interact with problems
4. Check the console for Firebase-related logs:
   - You should see debug messages like "Writing this payload to firebase: ..."
   - No Firebase errors should appear

5. Verify data is being written:
   - Go to Firebase Console → **Firestore Database**
   - You should see collections being created:
     - `problemSubmissions`
     - `problemStartLogs`
     - `feedbacks` (if users submit feedback)
     - `siteLogs`
     - `focusStatus` (if focus tracking is enabled)
     - `development_*` collections (if in development mode)

## Troubleshooting

### Firebase not initializing
- Check that `ENABLE_FIREBASE = true` in `src/config/config.js`
- Verify your Firebase config is correct
- Check browser console for errors

### "Permission denied" errors
- Check your Firestore security rules
- Ensure you're using test mode or have proper rules set up
- Verify your Firebase project is active

### Data not appearing in Firestore
- Check that `DO_LOG_DATA = true` in `src/config/config.js`
- Verify Firebase initialization in browser console
- Check network tab for failed requests

### Environment variable not loading
- Ensure `.env` file is in the project root (not in `src/`)
- Restart your development server after changing `.env`
- Check that the variable name is exactly `REACT_APP_FIREBASE_CONFIG`
- Verify the base64 encoding is correct

## Additional Configuration

### Enable/Disable Specific Logging Features

In `src/config/config.js`:

```javascript
const DO_LOG_DATA = true;        // Enable/disable all data logging
const DO_LOG_MOUSE_DATA = false; // Enable/disable mouse movement logging
const DO_FOCUS_TRACKING = true;  // Enable/disable focus tracking
```

### Development vs Production Collections

The Firebase wrapper automatically prefixes development collections with `development_` to separate dev and production data. This is controlled by build type detection in `src/util/getBuildType.js`.

## Next Steps

- Set up proper Firestore security rules for production
- Configure Firebase Authentication if you need user authentication
- Set up Firebase Storage if you need file uploads
- Review the data being logged in Firestore and adjust as needed

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)


