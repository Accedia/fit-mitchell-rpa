// Import the functions you need from the SDKs you need
import { FirebaseOptions, initializeApp } from 'firebase/app';
import * as RealtimeDatabase from 'firebase/database';
import log from 'electron-log';

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyAOJjvrGtyfFrh6oe-VTg9XB-mTcYU1gzE',
  authDomain: 'force-import-technology.firebaseapp.com',
  projectId: 'force-import-technology',
  storageBucket: 'force-import-technology.appspot.com',
  messagingSenderId: '1051607921483',
  appId: '1:1051607921483:web:674cfaef2806826ea66ece',
  databaseURL: 'https://force-import-technology-default-rtdb.europe-west1.firebasedatabase.app',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = RealtimeDatabase.getDatabase();

export interface ImporterFirebaseStatus {
  status: SessionStatus;
}

export enum SessionStatus {
  INITIATED = 100,
  APP_STARTED = 102,
  SEARCHING_CCC = 103,
  POPULATING = 104,
  VALIDATING = 105,

  UPDATE_NEEDED = 200,
  UPDATING = 201,
  UPDATE_COMPLETED = 202,

  COMPLETED = 0,
  STOPPED = 1,
}

const getSessionRef = (sessionId: string): RealtimeDatabase.DatabaseReference => {
  return RealtimeDatabase.ref(db, `/sessions/${sessionId}`);
};

class FirebaseCurrentSessionService {
  private currentSessionId: string | null;

  set(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  unset() {
    this.currentSessionId = null;
  }

  remove(): Promise<void> {
    return FirebaseService.remove(this.currentSessionId);
  }

  setStatus(status: SessionStatus): Promise<void> {
    if (!this.currentSessionId) {
      log.warn('No currentSessionId found. Notification not sent!');
      return void 0;
    }
    return FirebaseService.setSessionStatus(this.currentSessionId, status);
  }
}

export class FirebaseService {
  private static _useCurrentSession: FirebaseCurrentSessionService = new FirebaseCurrentSessionService();
  private static unsubscribeFunc: RealtimeDatabase.Unsubscribe | null = null;

  static get useCurrentSession(): FirebaseCurrentSessionService {
    return FirebaseService._useCurrentSession;
  }

  static subscribe(sessionId: string, onChange: (data: ImporterFirebaseStatus) => void): void {
    FirebaseService.unsubscribe();

    const unsubscribe = RealtimeDatabase.onValue(getSessionRef(sessionId), (snapshot) => {
      const data = snapshot.val() as ImporterFirebaseStatus;
      onChange(data);
    });

    this.unsubscribeFunc = unsubscribe;
  }

  static unsubscribe(): void {
    if (this.unsubscribeFunc) {
      this.unsubscribeFunc();
    }
  }

  /**
   * Set the status of a session in the Firebase Realtime database
   * @param sessionId The id of the session (automationId)
   * @param status The new status
   */
  static async setSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    if (!sessionId) {
      throw new Error('No sessionId provided to firebase setter');
    }

    try {
      log.info(`Changing session ${sessionId} status to ${status}`);
      await RealtimeDatabase.update(getSessionRef(sessionId), {
        status,
      });
    } catch (e) {
      log.error(`Error: ${e}`);
    }
  }

  static async remove(sessionId: string): Promise<void> {
    try {
      log.info(`Removing firebase entry for ${sessionId}`);
      await RealtimeDatabase.remove(getSessionRef(sessionId));
    } catch (e) {
      log.error(`Error: ${e}`);
    }
  }
}
