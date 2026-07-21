import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type SignalDataTypeMap,
  type SignalKeyStore,
} from "@whiskeysockets/baileys";
import { db } from "../config/firebase";

// Firestore batched-write limit is 500 ops; stay comfortably under it.
const BATCH_CHUNK_SIZE = 450;

function credsDocRef(uid: string) {
  return db.collection("merchants").doc(uid).collection("whatsapp_auth").doc("creds");
}

function keysCollectionRef(uid: string) {
  return db.collection("merchants").doc(uid).collection("whatsapp_auth_keys");
}

// Firestore doc ids can't contain "/"; signal key ids never do in practice, but
// mirror the file-based adapter's sanitization for safety.
function keyDocId(type: string, id: string): string {
  return `${type}-${id}`.replace(/\//g, "_");
}

async function deleteCollectionInChunks(collectionRef: FirebaseFirestore.CollectionReference): Promise<void> {
  const snap = await collectionRef.get();
  if (snap.empty) return;

  let batch = db.batch();
  let ops = 0;
  const commits: Promise<unknown>[] = [];

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    ops++;
    if (ops >= BATCH_CHUNK_SIZE) {
      commits.push(batch.commit());
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) commits.push(batch.commit());
  await Promise.all(commits);
}

// Standalone clear — usable without first reading/holding a live auth state
// (e.g. logging out a merchant whose socket already died).
export async function clearFirestoreAuthState(uid: string): Promise<void> {
  await credsDocRef(uid).delete().catch(() => {});
  await deleteCollectionInChunks(keysCollectionRef(uid));
}

// Cheap check — reads only the creds doc, used at boot to decide which
// merchants had a previously-paired session worth resuming.
export async function isFirestoreAuthRegistered(uid: string): Promise<boolean> {
  const snap = await credsDocRef(uid).get();
  const json = snap.exists ? snap.data()?.json : null;
  if (!json) return false;
  try {
    const creds = JSON.parse(json, BufferJSON.reviver);
    return !!creds?.registered;
  } catch {
    return false;
  }
}

export interface FirestoreAuthState {
  state: { creds: AuthenticationCreds; keys: SignalKeyStore };
  saveCreds: () => Promise<void>;
  clearState: () => Promise<void>;
}

export async function useFirestoreAuthState(uid: string): Promise<FirestoreAuthState> {
  const credsRef = credsDocRef(uid);
  const keysRef = keysCollectionRef(uid);

  const readCreds = async (): Promise<AuthenticationCreds> => {
    const snap = await credsRef.get();
    const json = snap.exists ? snap.data()?.json : null;
    if (!json) return initAuthCreds();
    try {
      return JSON.parse(json, BufferJSON.reviver);
    } catch {
      return initAuthCreds();
    }
  };

  const creds = await readCreds();

  const saveCreds = async (): Promise<void> => {
    await credsRef.set({
      json: JSON.stringify(creds, BufferJSON.replacer),
      updatedAt: Date.now(),
    });
  };

  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const data: { [id: string]: SignalDataTypeMap[T] } = {};
      if (ids.length === 0) return data;

      const refs = ids.map((id) => keysRef.doc(keyDocId(type, id)));
      const snaps = await db.getAll(...refs);

      snaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const raw = snap.data()?.json;
        if (!raw) return;

        let value = JSON.parse(raw, BufferJSON.reviver);
        // Required rehydration step — matches useMultiFileAuthState's own handling.
        // Skipping this silently corrupts app-state sync after a restart.
        if (type === "app-state-sync-key" && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        data[ids[i]!] = value;
      });

      return data;
    },
    set: async (data) => {
      let batch = db.batch();
      let ops = 0;
      const commits: Promise<unknown>[] = [];

      for (const category in data) {
        const entries = (data as any)[category];
        for (const id in entries) {
          const value = entries[id];
          const ref = keysRef.doc(keyDocId(category, id));

          if (value) {
            batch.set(ref, { json: JSON.stringify(value, BufferJSON.replacer) });
          } else {
            batch.delete(ref);
          }

          ops++;
          if (ops >= BATCH_CHUNK_SIZE) {
            commits.push(batch.commit());
            batch = db.batch();
            ops = 0;
          }
        }
      }

      if (ops > 0) commits.push(batch.commit());
      await Promise.all(commits);
    },
  };

  const clearState = async (): Promise<void> => {
    await clearFirestoreAuthState(uid);
  };

  return {
    state: { creds, keys },
    saveCreds,
    clearState,
  };
}
