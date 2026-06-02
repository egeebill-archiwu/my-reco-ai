// RECO AI - IndexedDB 本地資料庫模組

const DB_NAME = 'reco_ai_database';
const DB_VERSION = 2;

let dbPromise = null;

/**
 * 初始化並取得 IndexedDB 連線
 */
function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 建立會議 Store (以 id 作為 keyPath)
      if (!db.objectStoreNames.contains('meetings')) {
        const meetingStore = db.createObjectStore('meetings', { keyPath: 'id', autoIncrement: true });
        meetingStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // 建立筆記 Store
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
        noteStore.createIndex('meeting_id', 'meeting_id', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB 初始化失敗:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

// ==================== 會議 (Meetings) 儲存庫操作 ====================

/**
 * 儲存或更新會議
 * @param {Object} meeting - 會議資料，如 { id, title, created_at, audioData, audioName, audioMime, transcript, summary, action_items }
 */
async function saveMeeting(meeting) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['meetings'], 'readwrite');
    const store = transaction.objectStore('meetings');
    const request = store.put(meeting); // put 可以用來新增或更新

    request.onsuccess = (event) => {
      resolve(event.target.result); // 回傳資料庫中的 id
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 取得所有會議清單 (排除音訊 Blob 與大體積逐字稿以節省記憶體)
 */
async function getAllMeetings() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['meetings'], 'readonly');
    const store = transaction.objectStore('meetings');
    const request = store.openCursor();
    const meetings = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const data = cursor.value;
        // 排除大型二進位資料和逐字稿
        meetings.push({
          id: data.id,
          title: data.title,
          created_at: data.created_at,
          hasAudio: !!data.audioData
        });
        cursor.continue();
      } else {
        // 按時間倒序排列 (ID 越大越新)
        meetings.sort((a, b) => b.id - a.id);
        resolve(meetings);
      }
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 取得單一會議詳情
 */
async function getMeetingById(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['meetings'], 'readonly');
    const store = transaction.objectStore('meetings');
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve(event.target.result || null);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 刪除會議紀錄及關聯的筆記卡片
 */
async function deleteMeeting(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['meetings', 'notes'], 'readwrite');
    
    // 刪除會議
    const meetingStore = transaction.objectStore('meetings');
    meetingStore.delete(id);

    // 刪除該會議的所有筆記卡片
    const noteStore = transaction.objectStore('notes');
    const index = noteStore.index('meeting_id');
    const request = index.openCursor(IDBKeyRange.only(id));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ==================== 筆記卡片 (Notes) 儲存庫操作 ====================

/**
 * 新增或更新筆記卡片
 */
async function saveNote(note) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.put(note);

    request.onsuccess = (event) => {
      resolve(event.target.result); // 回傳 id
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 取得特定會議的所有筆記卡片
 */
async function getNotesByMeetingId(meetingId) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const index = store.index('meeting_id');
    const request = index.openCursor(IDBKeyRange.only(meetingId));
    const notes = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        notes.push(cursor.value);
        cursor.continue();
      } else {
        // 按 ID 倒序排列 (越新加的越前面)
        notes.sort((a, b) => b.id - a.id);
        resolve(notes);
      }
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 刪除特定筆記卡片
 */
async function deleteNote(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
