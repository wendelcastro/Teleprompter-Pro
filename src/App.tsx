/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Type, 
  Video, 
  VideoOff, 
  Circle, 
  Download, 
  Maximize, 
  Minimize,
  Palette,
  Layout,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AspectRatio = '16:9' | '9:16' | '1:1' | 'full';

export default function App() {
  // --- Teleprompter State ---
  const [text, setText] = useState(`Bem-vindo ao Teleprompter Pro!
  
Este é um exemplo de texto. Você pode editá-lo clicando no botão de configurações ou diretamente aqui se preferir.

Funcionalidades incluídas:
1. Diferentes formatos de tela (YouTube, Reels, Instagram).
2. Controle de velocidade e tamanho de fonte.
3. Espelhamento horizontal e vertical.
4. Gravação de vídeo integrada.
5. Linha de orientação para leitura.

Comece agora a gravar seus vídeos com muito mais profissionalismo!`);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5); // 1-10
  const [fontSize, setFontSize] = useState(32);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#000000');
  const [bgOpacity, setBgOpacity] = useState(0.8);
  const [showIndicator, setShowIndicator] = useState(true);
  
  // --- UI State ---
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'camera'>('settings');

  // --- Camera & Recording State ---
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPosRef = useRef(0);
  const requestRef = useRef<number>(null);

  // --- Animation Logic ---
  const scroll = useCallback((time: number) => {
    if (isPlaying && scrollContainerRef.current) {
      // Speed factor: adjust as needed. Lower speed = smoother but needs fine tuning.
      // Speed 1: ~1px per frame? No, way too fast. 
      // Let's use a base increment.
      const increment = (speed * 0.1);
      scrollPosRef.current += increment;
      scrollContainerRef.current.scrollTop = scrollPosRef.current;
      
      // Stop if reached bottom
      if (scrollPosRef.current >= scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight + 100) {
        setIsPlaying(false);
      }
    }
    requestRef.current = requestAnimationFrame(scroll);
  }, [isPlaying, speed]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(scroll);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [scroll]);

  const resetScroll = () => {
    setIsPlaying(false);
    scrollPosRef.current = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // --- Recording Logic ---
  const startRecording = () => {
    if (!cameraStream) return;
    setRecordedChunks([]);
    
    // Attempt to find a supported mime type
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
    
    try {
      const recorder = new MediaRecorder(cameraStream, { mimeType });
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };
      
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error", err);
      alert("Erro ao iniciar gravação. Seu navegador pode não suportar esta funcionalidade.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadVideo = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teleprompter-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Aspect Ratio Helper
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video w-full max-w-4xl';
      case '9:16': return 'aspect-[9/16] h-[90vh] max-h-[800px] w-auto';
      case '1:1': return 'aspect-square w-full max-w-[600px] h-auto';
      default: return 'w-full h-full';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#000000] text-white font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            className="fixed lg:relative z-50 w-[320px] h-full bg-[#1d1d1f] border-r border-[#424245] flex flex-col shadow-2xl"
          >
            <div className="p-6 flex justify-between items-center border-b border-[#424245]">
              <h1 className="text-xl font-semibold tracking-tight">Teleprompter Pro</h1>
              <button 
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-[#424245] rounded-full transition-colors lg:hidden"
                id="close-sidebar"
              >
                <PanelLeftClose size={20} />
              </button>
            </div>

            <div className="flex border-b border-[#424245]">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
              >
                Configurações
              </button>
              <button 
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'camera' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
              >
                Câmera
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-700">
              {activeTab === 'settings' ? (
                <>
                  <section className="space-y-4">
                    <label className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-wider">
                      <Layout size={16} /> Formato de Tela
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['16:9', '9:16', '1:1', 'full'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-2 px-3 rounded-md text-xs border transition-all ${aspectRatio === ratio ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-transparent border-[#424245] text-gray-300 hover:border-gray-500'}`}
                        >
                          {ratio === 'full' ? 'Livre' : ratio}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <label className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-wider">
                      <Gauge size={16} /> Leitura
                    </label>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Velocidade</span>
                          <span>{speed}</span>
                        </div>
                        <input 
                          type="range" min="1" max="20" step="0.5"
                          value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                          className="w-full h-1 bg-[#424245] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Tamanho da Fonte</span>
                          <span>{fontSize}px</span>
                        </div>
                        <input 
                          type="range" min="16" max="120"
                          value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full h-1 bg-[#424245] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <label className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-wider">
                      <Palette size={16} /> Customização
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Texto</span>
                        <div className="relative h-10 w-full rounded-lg border border-[#424245] overflow-hidden">
                          <input 
                            type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                            className="absolute inset-[-4px] w-[120%] h-[120%] cursor-pointer bg-transparent border-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Fundo</span>
                        <div className="relative h-10 w-full rounded-lg border border-[#424245] overflow-hidden">
                          <input 
                            type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                            className="absolute inset-[-4px] w-[120%] h-[120%] cursor-pointer bg-transparent border-none"
                          />
                        </div>
                      </div>
                    </div>
                    {cameraStream && (
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Opacidade do Fundo</span>
                          <span>{(bgOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))}
                          className="w-full h-1 bg-[#424245] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    )}
                  </section>

                  <section className="space-y-4">
                    <label className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-wider">
                      <Maximize size={16} /> Espelhamento
                    </label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setMirrorH(!mirrorH)}
                        className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md border text-xs transition-colors ${mirrorH ? 'bg-blue-600 border-blue-500' : 'bg-transparent border-[#424245]'}`}
                      >
                        <FlipHorizontal size={14} /> Horizontal
                      </button>
                      <button 
                        onClick={() => setMirrorV(!mirrorV)}
                        className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-md border text-xs transition-colors ${mirrorV ? 'bg-blue-600 border-blue-500' : 'bg-transparent border-[#424245]'}`}
                      >
                        <FlipVertical size={14} /> Vertical
                      </button>
                    </div>
                  </section>

                  <section className="pt-4">
                    <textarea 
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Cole seu roteiro aqui..."
                      className="w-full h-40 bg-[#000000] border border-[#424245] rounded-xl p-3 text-sm focus:border-blue-500 outline-none resize-none"
                    />
                  </section>
                </>
              ) : (
                <section className="space-y-6">
                  <div className="space-y-3">
                    {!cameraStream ? (
                      <button 
                        onClick={startCamera}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all shadow-lg active:scale-95"
                      >
                        <Video size={20} /> Ativar Câmera
                      </button>
                    ) : (
                      <button 
                        onClick={stopCamera}
                        className="w-full py-4 bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600/30 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all"
                      >
                        <VideoOff size={20} /> Desligar Câmera
                      </button>
                    )}
                  </div>

                  {cameraStream && (
                    <div className="space-y-4 pt-4 border-t border-[#424245]">
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Gravação</h3>
                      {!isRecording ? (
                        <button 
                          onClick={startRecording}
                          disabled={isRecording}
                          className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all shadow-lg active:scale-95"
                        >
                          <Circle size={18} fill="currentColor" /> Gravar Vídeo
                        </button>
                      ) : (
                        <button 
                          onClick={stopRecording}
                          className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all active:scale-95"
                        >
                          <div className="w-4 h-4 bg-black rounded-sm animate-pulse" /> Parar e Salvar
                        </button>
                      )}

                      {recordedChunks.length > 0 && !isRecording && (
                        <button 
                          onClick={downloadVideo}
                          className="w-full py-4 bg-[#424245] hover:bg-[#505053] rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all"
                        >
                          <Download size={18} /> Baixar Última Gravação
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-[#424245]/30 rounded-xl border border-[#424245]">
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      Dica: O vídeo gravado é o arquivo "limpo" da sua câmera (sem o texto), perfeito para postar diretamente!
                    </p>
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 bg-[#1d1d1f] border-t border-[#424245] space-y-4">
              <div className="flex flex-col items-center gap-1">
                <a 
                  href="https://www.wendelcastro.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-400 transition-colors font-medium"
                >
                  www.wendelcastro.com.br
                </a>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">@wendelcastro</span>
              </div>
              <button 
                onClick={() => setShowSidebar(false)}
                className="w-full py-3 bg-[#424245] hover:bg-[#505053] rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all"
              >
                <PanelLeftClose size={18} /> Ocultar Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Display Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Toggle Sidebar Button */}
        <AnimatePresence>
          {!showSidebar && (
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setShowSidebar(true)}
              className="absolute top-6 left-6 z-40 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full border border-white/10 text-white transition-all shadow-xl active:scale-90"
              id="open-sidebar"
            >
              <PanelLeftOpen size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-6 right-6 z-40 flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-md rounded-full shadow-lg">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Gravando</span>
          </div>
        )}

        {/* Teleprompter Container */}
        <div className={`relative overflow-hidden shadow-2xl transition-all duration-500 ease-in-out ${getAspectClass()}`}>
          {/* Camera Layer */}
          {cameraStream && (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {/* Text Layer Backdrop */}
          <div 
            className="absolute inset-0 transition-all duration-300 pointer-events-none"
            style={{ 
              backgroundColor: bgColor,
              opacity: cameraStream ? bgOpacity : 1 
            }}
          />

          {/* Reading Indicator Line */}
          {showIndicator && (
             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-green-500/60 z-20 pointer-events-none blur-[1px]">
               <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-green-500 text-[10px] text-black font-bold rounded uppercase">
                 Olhe aqui
               </div>
             </div>
          )}

          {/* Text Container */}
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-scroll scrollbar-none flex flex-col z-10 px-6 sm:px-12 md:px-20 text-center select-none"
            style={{ 
              transform: `scale(${mirrorH ? -1 : 1}, ${mirrorV ? -1 : 1})`,
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {/* Initial Buffer */}
            <div className="min-h-[50vh]" />
            
            <div 
              className="whitespace-pre-wrap font-bold leading-tight"
              style={{ 
                color: textColor,
                fontSize: `${fontSize}px`,
                lineHeight: 1.4
              }}
            >
              {text}
            </div>

            {/* End Buffer */}
            <div className="min-h-[70vh]" />
          </div>
        </div>

        {/* Bottom Floating Controls */}
        <div className="absolute bottom-10 z-40 flex items-center gap-4 p-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
          <button 
            onClick={resetScroll}
            className="p-4 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all active:scale-90"
            title="Recomeçar"
          >
            <RotateCcw size={24} />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/40 transition-all active:scale-95"
            title={isPlaying ? 'Pausar' : 'Iniciar'}
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <div className="flex flex-col items-center px-4 border-l border-white/10">
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-0.5">Speed</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setSpeed(Math.max(1, speed - 0.5))} className="hover:text-blue-400"><ChevronDown size={18} /></button>
              <span className="text-lg font-mono font-bold w-6 text-center">{speed.toFixed(1)}</span>
              <button onClick={() => setSpeed(Math.min(20, speed + 0.5))} className="hover:text-blue-400"><ChevronUp size={18} /></button>
            </div>
          </div>
        </div>

        {/* Corner Indicator Toggle */}
        <button 
          onClick={() => setShowIndicator(!showIndicator)}
          className={`absolute bottom-6 right-6 z-40 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${showIndicator ? 'bg-green-600 border-green-500 text-white' : 'bg-white/10 border-white/10 text-white/50'}`}
        >
          Linha Guia: {showIndicator ? 'On' : 'Off'}
        </button>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #424245; border-radius: 10px; }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #0071e3;
          cursor: pointer;
          border: 2px solid #1d1d1f;
        }

        @keyframes pulse-red {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
