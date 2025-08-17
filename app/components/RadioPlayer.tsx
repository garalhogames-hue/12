'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RadioStatus {
  dj: string | null;
  program: string | null;
}

interface RadioNow {
  listeners: number;
  song: string | null;
}

const STREAM_URL = 'https://sonicpanel.oficialserver.com:8342/;';
const UPDATE_INTERVAL = 10000; // 10 segundos

export default function RadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<RadioStatus>({ dj: null, program: null });
  const [now, setNow] = useState<RadioNow>({ listeners: 0, song: null });
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  }, []);

  // Função para buscar informações atuais
  const fetchNow = useCallback(async () => {
    try {
      const response = await fetch('/api/now');
      if (response.ok) {
        const data = await response.json();
        setNow(data);
      }
    } catch (err) {
      console.error('Erro ao buscar now:', err);
    }
  }, []);

  // Função para atualizar todas as informações
  const updateInfo = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchNow()]);
  }, [fetchStatus, fetchNow]);

  // Função para tocar
  const play = useCallback(() => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    // Força reconexão com cache buster
    audioRef.current.src = `${STREAM_URL}?t=${Date.now()}`;
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao tocar:', err);
        setError('Erro ao conectar com a rádio');
        setIsLoading(false);
        setIsPlaying(false);
      });
  }, []);

  // Função para pausar
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current.load();
    setIsPlaying(false);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Setup inicial e atualização periódica
  useEffect(() => {
    // Busca inicial
    updateInfo();

    // Setup do intervalo
    intervalRef.current = setInterval(updateInfo, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [updateInfo]);

  // Setup do áudio
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    // Event listeners
    audio.addEventListener('loadstart', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));
    audio.addEventListener('error', () => {
      setError('Erro na conexão');
      setIsLoading(false);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Rádio Online</h1>
        <p className="text-purple-200">Transmissão ao vivo 24/7</p>
      </div>

      {/* Player Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
        {/* Botão Play/Pause */}
        <div className="flex justify-center mb-8">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl group-hover:blur-2xl transition-all opacity-70"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-6 hover:scale-105 transition-transform">
              {isLoading ? (
                <svg className="w-16 h-16 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isPlaying ? (
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Status */}
        {isPlaying && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">AO VIVO</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Grid de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Locutor */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-purple-300 text-sm font-medium mb-1">LOCUTOR</h3>
            <p className="text-white text-lg font-semibold truncate">
              {status.dj || 'Carregando...'}
            </p>
          </div>

          {/* Programação */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-purple-300 text-sm font-medium mb-1">PROGRAMAÇÃO</h3>
            <p className="text-white text-lg font-semibold truncate">
              {status.program || 'Carregando...'}
            </p>
          </div>

          {/* Ouvintes */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-purple-300 text-sm font-medium mb-1">OUVINTES</h3>
            <p className="text-white text-lg font-semibold">
              {now.listeners > 0 ? now.listeners.toLocaleString('pt-BR') : '0'}
            </p>
          </div>
        </div>

        {/* Música Atual */}
        {now.song && (
          <div className="mt-4 bg-white/5 rounded-xl p-4">
            <h3 className="text-purple-300 text-sm font-medium mb-1">TOCANDO AGORA</h3>
            <p className="text-white text-lg font-semibold truncate">
              {now.song}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-purple-200/60 text-sm">
          Atualização automática a cada 10 segundos
        </p>
      </div>
    </div>
  );
}