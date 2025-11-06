import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import { User, UserChatHistory, KnowledgeFile, TranscriptionEntry, ChatSession } from '../types';

// Set worker source for pdf.js, required for parsing PDFs.
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.5.136/build/pdf.worker.mjs`;


const USERS_KEY = 'app_users';
const CHATS_KEY = 'app_chats';

// --- User Management (localStorage) ---
export const getUsers = (): User[] => {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (e) {
    console.error("Failed to load or parse users:", e);
    return [];
  }
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// --- Chat History Management (localStorage) ---
const getAllChatData = (): UserChatHistory[] => {
    try {
        const allChatsJson = localStorage.getItem(CHATS_KEY);
        return allChatsJson ? JSON.parse(allChatsJson) : [];
    } catch (e) {
        console.error("Failed to load or parse all chat histories:", e);
        return [];
    }
}

const saveAllChatData = (allChats: UserChatHistory[]) => {
    try {
        localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
    } catch(e) {
        console.error("Failed to save all chat histories:", e);
    }
}

export const loadUserChatSessions = (userEmail: string): ChatSession[] => {
  try {
    const allChats = getAllChatData();
    const userChatData = allChats.find(c => c.userEmail === userEmail);
    if (!userChatData) return [];

    // This block handles migration from the old format (flat history array)
    // to the new format (array of session objects).
    if ((userChatData as any).history && Array.isArray((userChatData as any).history)) {
        const oldHistory = (userChatData as any).history as TranscriptionEntry[];
        if (oldHistory.length > 0) {
            const migratedSession: ChatSession = {
                id: `migrated-${Date.now()}`,
                title: 'Previous Conversation',
                timestamp: Date.now(),
                history: oldHistory,
            };
            const newUserChatHistory: UserChatHistory = {
                userEmail: userEmail,
                sessions: [migratedSession],
            };
            const otherChats = allChats.filter(c => c.userEmail !== userEmail);
            saveAllChatData([...otherChats, newUserChatHistory]);
            return newUserChatHistory.sessions;
        }
        return []; // If old history is empty, return empty sessions
    }

    return userChatData.sessions || [];
  } catch (e) {
    console.error("Failed to load or parse chat sessions:", e);
    return [];
  }
};

export const saveUserChatSessions = (userEmail: string, sessions: ChatSession[]) => {
  try {
    const allChats = getAllChatData();
    const userChatIndex = allChats.findIndex(c => c.userEmail === userEmail);

    if (userChatIndex > -1) {
      allChats[userChatIndex].sessions = sessions;
    } else {
      allChats.push({ userEmail, sessions });
    }
    saveAllChatData(allChats);
  } catch(e) {
    console.error("Failed to save chat sessions:", e);
  }
};

export const getAllChatHistories = (): UserChatHistory[] => {
    return getAllChatData().filter(data => data.sessions && data.sessions.length > 0);
};

export const deleteUserChatHistory = (userEmail: string) => {
    const allChats = getAllChatData();
    const updatedChats = allChats.filter(c => c.userEmail !== userEmail);
    saveAllChatData(updatedChats);
};


// --- Knowledge Base Management (IndexedDB) ---
const DB_NAME = 'aiVoiceBotDB';
const DB_VERSION = 1;
const KNOWLEDGE_STORE_NAME = 'knowledgeFiles';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error: ' + request.error?.message);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(KNOWLEDGE_STORE_NAME)) {
        dbInstance.createObjectStore(KNOWLEDGE_STORE_NAME, { keyPath: 'name' });
      }
    };
  });
};


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const getKnowledgeFiles = async (): Promise<KnowledgeFile[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
    const request = store.getAll();

    transaction.oncomplete = () => {
      resolve(request.result);
    };

    transaction.onerror = () => {
      console.error('Transaction error fetching files:', transaction.error);
      reject('Transaction error: ' + transaction.error?.message);
    };
  });
};

export const addKnowledgeFile = async (file: File) => {
  const db = await openDB();
  const existingFiles = await getKnowledgeFiles();
  if (existingFiles.some(f => f.name === file.name)) {
    throw new Error(`File "${file.name}" already exists.`);
  }

  const base64Content = await fileToBase64(file);
  const newFile: KnowledgeFile = {
    name: file.name,
    type: file.type,
    content: base64Content,
  };

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
    store.add(newFile);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      console.error('Transaction error adding file:', transaction.error);
      reject('Transaction error: ' + transaction.error?.message);
    };
  });
};

export const deleteKnowledgeFile = async (fileName: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(KNOWLEDGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KNOWLEDGE_STORE_NAME);
    store.delete(fileName);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      console.error('Transaction error deleting file:', transaction.error);
      reject('Transaction error: ' + transaction.error?.message);
    };
  });
};

export const getKnowledgeBaseText = async (): Promise<string> => {
    const files = await getKnowledgeFiles();
    let combinedText = '';

    for (const file of files) {
        let text = '';
        try {
             const byteCharacters = atob(file.content);
             const byteNumbers = new Array(byteCharacters.length);
             for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
             }
             const byteArray = new Uint8Array(byteNumbers);

            if (file.type === 'application/pdf') {
                const pdf = await pdfjs.getDocument(byteArray).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ');
                }
            } else if (file.type.startsWith('text/')) {
                text = new TextDecoder().decode(byteArray);
            }
            combinedText += `\n\n--- DOCUMENT: ${file.name} ---\n${text}`;
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            combinedText += `\n\n--- DOCUMENT: ${file.name} [ERROR: Could not process file] ---`;
        }
    }
    return combinedText;
}
