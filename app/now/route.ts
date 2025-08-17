import { NextResponse } from 'next/server';

const STATUS_URL = 'http://sonicpanel.oficialserver.com:8342/7.html';
const FETCH_TIMEOUT = 5000; // 5 segundos

async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET() {
  try {
    const response = await fetchWithTimeout(STATUS_URL, FETCH_TIMEOUT);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    // Parse do CSV: currentlisteners,peaklisteners,maxlisteners,reportedlisteners,bitrate,serverstatus,songtitle
    const parts = text.trim().split(',');
    
    if (parts.length < 7) {
      throw new Error('Invalid CSV format');
    }

    const listeners = parseInt(parts[0], 10) || 0;
    const songTitle = parts.slice(6).join(',').trim(); // Pega tudo após o 6º campo para o título

    return NextResponse.json(
      {
        listeners,
        song: songTitle || null
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching now data:', error);
    
    // Retorna dados vazios em caso de erro
    return NextResponse.json(
      {
        listeners: 0,
        song: null
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}