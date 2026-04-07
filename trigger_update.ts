import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function triggerUpdate() {
  const db = admin.firestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  
  try {
    const version = "MANUAL_TRIGGER_" + new Date().getTime();
    await db.collection('system_meta').doc('version').set({ 
      version,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("Update triggered successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error triggering update:", err);
    process.exit(1);
  }
}

triggerUpdate();
