import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob, Chat } from '@google/genai';
import type { TranscriptionEntry, User, ChatSession } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';
import { getKnowledgeBaseText, saveUserChatSessions, loadUserChatSessions } from '../services/dbService';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { SendIcon } from './icons/SendIcon';
import { Logo } from './icons/Logo';
import { Avatar } from './Avatar';
import ChatHistorySidebar from './ChatHistorySidebar';

type Status = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'ERROR' | 'PROCESSING';

interface CustomerSupportBotProps {
  user: User;
}

const createPcmBlob = (inputData: Float32Array): GenaiBlob => {
    const buffer = new ArrayBuffer(inputData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const pcmData = new Uint8Array(buffer);
    return {
        data: encode(pcmData),
        mimeType: 'audio/pcm;rate=16000',
    };
};

const CustomerSupportBot: React.FC<CustomerSupportBotProps> = ({ user }) => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentUserTranscription, setCurrentUserTranscription] = useState('');
  const [currentBotTranscription, setCurrentBotTranscription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // Derived state: active session and its history
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const transcriptionHistory = activeSession ? activeSession.history : [];

  const sessionPromiseRef = useRef<Promise<{
    close: () => void;
    sendRealtimeInput: (input: { media: GenaiBlob; }) => void;
  }> | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const userTranscriptionRef = useRef('');
  const botTranscriptionRef = useRef('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const speakingTimeoutRef = useRef<number | null>(null);

  // Load sessions on initial mount
  useEffect(() => {
    const loadedSessions = loadUserChatSessions(user.email);
    setSessions(loadedSessions);
    if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[0].id);
    } else {
      handleNewChat();
    }
  }, [user.email]);
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcriptionHistory, currentUserTranscription, currentBotTranscription]);

  // Persist sessions whenever they change
  useEffect(() => {
    saveUserChatSessions(user.email, sessions);
  }, [sessions, user.email]);

  const cleanup = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextAudioStartTimeRef.current = 0;
  }, []);
  
  const getSystemInstruction = async (): Promise<string> => {
      const knowledgeBase = await getKnowledgeBaseText();
      const baseSystemInstruction = 'You are an intelligent, friendly, and helpful customer support agent named Nithika for "Naren Customer Service Centre". Keep your responses concise, helpful, and polite.';
      const ragSystemInstruction = `IMPORTANT: Your primary goal is to answer questions using ONLY the information provided below in the "KNOWLEDGE BASE" section. If the answer is not in the knowledge base, politely say "I do not have information on that topic based on the documents provided." Do not use your general knowledge.

--- KNOWLEDGE BASE ---
${knowledgeBase || 'No documents provided.'}
--- END KNOWLEDGE BASE ---
`;
      return knowledgeBase ? ragSystemInstruction + '\n' + baseSystemInstruction : baseSystemInstruction;
  };
  
  const addEntriesToHistory = useCallback((entries: TranscriptionEntry[]) => {
    setSessions(prevSessions => prevSessions.map(s => {
        if (s.id === activeSessionId) {
            return { ...s, history: [...s.history, ...entries] };
        }
        return s;
    }));
  }, [activeSessionId]);

  const playAudio = useCallback(async (base64Audio: string) => {
      if (!outputAudioContextRef.current) {
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = outputAudioContextRef.current;
      setIsBotSpeaking(true);
      if(speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);

      try {
        const decodedAudio = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedAudio, audioContext, 24000, 1);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
    
        const now = audioContext.currentTime;
        const startTime = Math.max(now, nextAudioStartTimeRef.current);
        source.start(startTime);
        nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
        
        audioSourcesRef.current.add(source);
        source.onended = () => {
          audioSourcesRef.current.delete(source);
          if (audioSourcesRef.current.size === 0) {
             speakingTimeoutRef.current = window.setTimeout(() => setIsBotSpeaking(false), 500);
          }
        };
      } catch(e) {
        console.error("Error playing audio", e);
        setIsBotSpeaking(false);
      }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (sessionPromiseRef.current) {
      setStatus('DISCONNECTING');
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error('Error closing session:', e);
      } finally {
        sessionPromiseRef.current = null;
        cleanup();
        setStatus('IDLE');
      }
    }
  }, [cleanup]);
  
  const generateTitleForSession = useCallback(async (userMessage: string) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a concise, 5-word-max title for a conversation that starts with this: "${userMessage}"`,
        });
        const title = response.text.replace(/["']/g, ""); // Clean up quotes
        setSessions(prev => prev.map(s => 
            s.id === activeSessionId ? { ...s, title: title || "Chat" } : s
        ));
      } catch (error) {
          console.error("Failed to generate title:", error);
           setSessions(prev => prev.map(s => 
                s.id === activeSessionId ? { ...s, title: "Chat" } : s
            ));
      }
  }, [activeSessionId]);

  const handleConnect = useCallback(async () => {
    if (sessionPromiseRef.current) return;
    setStatus('CONNECTING'); setErrorMessage('');
    setCurrentUserTranscription(''); setCurrentBotTranscription('');
    userTranscriptionRef.current = ''; botTranscriptionRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const systemInstruction = await getSystemInstruction();

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('CONNECTED');
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if(message.serverContent?.inputTranscription) {
                userTranscriptionRef.current += message.serverContent.inputTranscription.text;
                setCurrentUserTranscription(userTranscriptionRef.current);
            }
            if(message.serverContent?.outputTranscription) {
                botTranscriptionRef.current += message.serverContent.outputTranscription.text;
                setCurrentBotTranscription(botTranscriptionRef.current);
            }
             if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextAudioStartTimeRef.current = 0;
            }
            if(message.serverContent?.turnComplete) {
                const finalUserText = userTranscriptionRef.current.trim();
                const finalBotText = botTranscriptionRef.current.trim();
                
                if (transcriptionHistory.length === 0 && finalUserText) {
                    generateTitleForSession(finalUserText);
                }
                
                const newEntries: TranscriptionEntry[] = [];
                if(finalUserText) newEntries.push({ speaker: 'user' as const, text: finalUserText });
                if(finalBotText) newEntries.push({ speaker: 'bot' as const, text: finalBotText });
                
                if (newEntries.length > 0) {
                    addEntriesToHistory(newEntries);
                }

                userTranscriptionRef.current = '';
                botTranscriptionRef.current = '';
                setCurrentUserTranscription('');
                setCurrentBotTranscription('');
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) await playAudio(audioData);
          },
          onclose: () => { cleanup(); setStatus('IDLE'); },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            let detailedError = 'An unknown connection error occurred.';
            if (e.message?.toLowerCase().includes('api key')) detailedError = 'Connection failed. Please check your API key.';
            else if (e.message?.toLowerCase().includes('network')) detailedError = 'A network error occurred.';
            setErrorMessage(detailedError);
            cleanup(); setStatus('ERROR'); sessionPromiseRef.current = null;
          },
        },
        config: {
          responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
      });
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to get microphone permissions.');
      setStatus('ERROR');
    }
  }, [cleanup, playAudio, addEntriesToHistory, generateTitleForSession, transcriptionHistory]);

  const handleTextSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!textInput.trim() || status !== 'IDLE') return;

      const userMessage = textInput.trim();
      setTextInput('');
      setStatus('PROCESSING'); setErrorMessage('');
      
      // Check if this is the first message to generate a title
      if (transcriptionHistory.length === 0) {
        generateTitleForSession(userMessage);
      }
      
      const userEntry = { speaker: 'user' as const, text: userMessage };
      addEntriesToHistory([userEntry]);
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        if(!chatRef.current) {
            const systemInstruction = await getSystemInstruction();
            chatRef.current = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
        }
        
        const result = await chatRef.current.sendMessage({ message: userMessage });
        const botResponseText = result.text;
        addEntriesToHistory([{ speaker: 'bot', text: botResponseText }]);

        const ttsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: botResponseText }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' }}}},
        });
        const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) await playAudio(audioData);
      } catch (err) {
          console.error("Error submitting text input:", err);
          const friendlyError = "Sorry, I couldn't process that. Please try again.";
          setErrorMessage(friendlyError);
          addEntriesToHistory([{ speaker: 'bot', text: friendlyError }]);
      } finally { setStatus('IDLE'); }
  };
  
    const handleNewChat = () => {
        const newSession: ChatSession = {
            id: `session-${Date.now()}`,
            title: 'New Chat',
            timestamp: Date.now(),
            history: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        chatRef.current = null; // Reset chat context for new session
    };
    
    const handleDeleteSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
            const remainingSessions = sessions.filter(s => s.id !== sessionId);
            if (remainingSessions.length > 0) {
                setActiveSessionId(remainingSessions[0].id);
            } else {
                handleNewChat();
            }
        }
    };
  
    const getStatusText = () => {
        switch (status) {
            case 'CONNECTING': return 'Connecting...';
            case 'CONNECTED': return 'Listening... Speak now. Press again to hang up.';
            case 'DISCONNECTING': return 'Disconnecting...';
            case 'PROCESSING': return 'Nithika is thinking...';
            case 'ERROR': return 'Connection failed. See message below.';
            default: return 'Press the microphone to start the conversation.';
        }
    };

    const isVoiceDisabled = status !== 'IDLE' && status !== 'CONNECTED';

    return (
        <div className="flex h-screen max-h-screen font-sans w-full max-w-7xl mx-auto">
            <ChatHistorySidebar 
                sessions={sessions}
                activeSessionId={activeSessionId}
                onNewChat={handleNewChat}
                onSelectSession={setActiveSessionId}
                onDeleteSession={handleDeleteSession}
            />
            <div className="flex flex-col flex-1 h-full p-4 md:p-6 lg:p-8">
                <header className="flex-shrink-0 flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Logo className="w-10 h-10 md:w-12 md:h-12 mr-3" />
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Naren Customer Service Centre</h1>
                            <p className="text-gray-600 text-sm md:text-base">Your AI Assistant: Nithika</p>
                        </div>
                    </div>
                    <Avatar isSpeaking={isBotSpeaking} />
                </header>

                <main ref={chatContainerRef} className="flex-1 w-full min-h-0 my-2 p-4 bg-white/60 backdrop-blur-sm rounded-lg shadow-inner overflow-y-auto" aria-live="polite">
                    {transcriptionHistory.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-xl px-4 py-2 rounded-2xl ${entry.speaker === 'user' ? 'bg-purple-600 text-white' : 'bg-white shadow-sm text-gray-800'}`}>
                                <p className={`font-semibold text-sm capitalize ${entry.speaker === 'user' ? 'text-purple-200' : 'text-purple-700'}`}>{entry.speaker === 'user' ? 'You' : 'Nithika'}</p>
                                <p>{entry.text}</p>
                            </div>
                        </div>
                    ))}
                    {currentUserTranscription && (
                         <div className="flex justify-end mb-3">
                            <div className="max-w-xs md:max-w-md lg:max-w-xl px-4 py-2 rounded-2xl bg-purple-400 text-white/90 italic">
                               <p className="font-semibold text-sm">You (speaking...)</p>
                               <p>{currentUserTranscription}</p>
                            </div>
                        </div>
                    )}
                    {currentBotTranscription && (
                        <div className="flex justify-start mb-3">
                            <div className="max-w-xs md:max-w-md lg:max-w-xl px-4 py-2 rounded-2xl bg-gray-100 text-gray-600 italic">
                                <p className="font-semibold text-sm">Nithika (responding...)</p>
                                <p>{currentBotTranscription}</p>
                            </div>
                        </div>
                    )}
                    {transcriptionHistory.length === 0 && !currentUserTranscription && !currentBotTranscription && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Your conversation will appear here.</p>
                        </div>
                    )}
                </main>

                <footer className="flex-shrink-0 flex flex-col items-center w-full pt-2">
                     <p className="h-6 text-center text-gray-600 mb-2">{getStatusText()}</p>
                    {errorMessage && <p className="h-6 text-red-600 font-semibold text-center mb-2">{errorMessage}</p>}
                    
                    <div className="flex items-center justify-center mb-4">
                        <button
                            onClick={status === 'CONNECTED' ? handleDisconnect : handleConnect}
                            disabled={isVoiceDisabled}
                            className={`relative w-20 h-20 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg focus:outline-none focus:ring-4 ${
                                status === 'CONNECTED' ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-300' 
                                : 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-300'
                            } ${isVoiceDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label={status === 'CONNECTED' ? 'Stop conversation' : 'Start voice conversation'}
                        >
                            <MicrophoneIcon className="w-9 h-9" />
                             {status === 'CONNECTED' && (
                                <span className="absolute w-full h-full rounded-full bg-red-500 animate-ping opacity-75"></span>
                            )}
                        </button>
                    </div>
                    
                    <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={status !== 'IDLE' ? 'End the voice call to type' : 'Or type your message here...'}
                            disabled={status !== 'IDLE'}
                            className="flex-1 px-4 py-3 text-lg border-gray-300 rounded-full focus:ring-purple-500 focus:border-purple-500 shadow-sm disabled:bg-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={!textInput.trim() || status !== 'IDLE'}
                            className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center transition-opacity hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            aria-label="Send text message"
                        >
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default CustomerSupportBot;