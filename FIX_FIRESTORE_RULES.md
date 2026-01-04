# Fix Firestore Security Rules

## The Problem
Your console shows: **"Missing or insufficient permissions"** - this means your Firestore security rules are blocking writes.

## Solution: Update Firestore Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **oaktutor-16c22** (based on your config)
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab at the top

### Step 2: Update the Rules

**For Development/Testing** (allows all reads/writes temporarily):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**For Production** (more secure, but still allows writes):

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

### Step 3: Publish the Rules
1. Click **"Publish"** button
2. Wait for confirmation that rules are published

### Step 4: Test
1. Refresh your webapp
2. Check the browser console - the permission errors should be gone
3. Check Firestore Database - you should see new documents appearing in `siteLogs` collection

## Important Security Note

⚠️ **The rules above allow open access for testing. For production, you should:**

1. Implement proper authentication
2. Add user-based rules
3. Restrict access to specific collections
4. Use Firebase Authentication

Example production rules (requires authentication):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

But for now, use the testing rules above to get logging working!





