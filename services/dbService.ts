import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import { User, ChatHistory, KnowledgeFile, TranscriptionEntry } from '../types';

// Set worker source for pdf.js, required for parsing PDFs.
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.5.136/build/pdf.worker.mjs`;


const USERS_KEY = 'app_users';
const CHATS_KEY = 'app_chats';
const KNOWLEDGE_KEY = 'app_knowledge';

// --- User Management ---
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

// --- Chat History Management ---
export const loadChatHistory = (userEmail: string): TranscriptionEntry[] => {
  try {
    const allChatsJson = localStorage.getItem(CHATS_KEY);
    if (!allChatsJson) return [];
    const allChats: ChatHistory[] = JSON.parse(allChatsJson);
    const userChat = allChats.find(c => c.userEmail === userEmail);
    return userChat ? userChat.history : [];
  } catch (e) {
    console.error("Failed to load or parse chat history:", e);
    return [];
  }
};

export const saveChatHistory = (userEmail: string, history: TranscriptionEntry[]) => {
  try {
    const allChatsJson = localStorage.getItem(CHATS_KEY);
    let allChats: ChatHistory[] = allChatsJson ? JSON.parse(allChatsJson) : [];
    const userChatIndex = allChats.findIndex(c => c.userEmail === userEmail);

    if (userChatIndex > -1) {
      allChats[userChatIndex].history = history;
    } else {
      allChats.push({ userEmail, history });
    }
    localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
  } catch(e) {
    console.error("Failed to save chat history:", e);
  }
};

// --- Knowledge Base Management ---
export const getKnowledgeFiles = (): KnowledgeFile[] => {
  try {
    const filesJson = localStorage.getItem(KNOWLEDGE_KEY);
    return filesJson ? JSON.parse(filesJson) : [];
  } catch (e) {
    console.error("Failed to load or parse knowledge files:", e);
    return [];
  }
};

export const saveKnowledgeFiles = (files: KnowledgeFile[]) => {
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(files));
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const addKnowledgeFile = async (file: File) => {
  const files = getKnowledgeFiles();
  if (files.some(f => f.name === file.name)) {
    throw new Error(`File "${file.name}" already exists.`);
  }
  
  const base64Content = await fileToBase64(file);
  const newFile: KnowledgeFile = {
    name: file.name,
    type: file.type,
    content: base64Content,
  };

  saveKnowledgeFiles([...files, newFile]);
};

export const deleteKnowledgeFile = (fileName: string) => {
  const files = getKnowledgeFiles();
  const updatedFiles = files.filter(f => f.name !== fileName);
  saveKnowledgeFiles(updatedFiles);
};

export const getKnowledgeBaseText = async (): Promise<string> => {
    const files = getKnowledgeFiles();
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