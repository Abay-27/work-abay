import React, { useState } from 'react';
import { Bot, Video, Mic, Send, Loader2 } from 'lucide-react';
import { generateChatResponse, generateTTS, generateVideo } from '../services/aiService';

export default function AIFeatures() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tts' | 'video'>('chat');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ttsInput, setTtsInput] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user' as const, text: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsLoading(true);
    try {
      const response = await generateChatResponse(newMessages, chatInput, 'gemini-3-flash-preview');
      setChatMessages([...newMessages, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-20 bg-indigo-50/10 min-h-screen transition-colors duration-700">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex gap-4 mb-6 border-b border-slate-100 pb-4">
        <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 p-2 rounded-lg transition-all active:scale-95 ${activeTab === 'chat' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}><Bot className="w-5 h-5" /> Chat</button>
        <button onClick={() => setActiveTab('tts')} className={`flex items-center gap-2 p-2 rounded-lg transition-all active:scale-95 ${activeTab === 'tts' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}><Mic className="w-5 h-5" /> TTS</button>
        <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 p-2 rounded-lg transition-all active:scale-95 ${activeTab === 'video' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}><Video className="w-5 h-5" /> Video</button>
      </div>

      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="h-96 overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-xl">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-100 ml-auto w-fit' : 'bg-white'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="Ask Gemini..." />
            <button onClick={handleChat} disabled={isLoading} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-600/20"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      )}
      
      {activeTab === 'tts' && (
        <div className="space-y-4">
          <textarea value={ttsInput} onChange={e => setTtsInput(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="Enter text to speak..." rows={4} />
          <button onClick={async () => {
            setIsLoading(true);
            try {
              const audioBase64 = await generateTTS(ttsInput);
              const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
              audio.play();
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
          }} disabled={isLoading} className="w-full p-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-600/20">Generate Speech</button>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="space-y-4">
          <input value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="Describe the video..." />
          <button onClick={async () => {
            setIsLoading(true);
            try {
              const videoUrl = await generateVideo(videoPrompt, '16:9');
              // Handle video display
              console.log(videoUrl);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
          }} disabled={isLoading} className="w-full p-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-600/20">Generate Video</button>
        </div>
      )}
    </div>
    </div>
  );
}
