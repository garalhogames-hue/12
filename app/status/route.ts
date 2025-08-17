import { NextResponse } from 'next/server';

const STATUS_URL = 'http://sonicpanel.oficialserver.com:8342/';
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

    const html = await response.text();
    
    // Extrai Stream Title (nome do locutor)
    let dj: string | null = null;
    const titleMatch = html.match(/Stream Title:<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (titleMatch && titleMatch[1]) {
      dj = titleMatch[1].trim();
    }
    
    // Fallback para outro padrão
    if (!dj) {
      const titleMatch2 = html.match(/Stream Title[:\s]*([^<\n]+)/i);
      if (titleMatch2 && titleMatch2[1]) {
        dj = titleMatch2[1].trim();
      }
    }
    
    // Extrai Stream Genre (programação)
    let program: string | null = null;
    const genreMatch = html.match(/Stream Genre:<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (genreMatch && genreMatch[1]) {
      program = genreMatch[1].trim();
    }
    
    // Fallback para outro padrão
    if (!program) {
      const genreMatch2 = html.match(/Stream Genre[:\s]*([^<\n]+)/i);
      if (genreMatch2 && genreMatch2[1]) {
        program = genreMatch2[1].trim();
      }
    }

    return NextResponse.json(
      {
        dj: dj || null,
        program: program || null
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
    console.error('Error fetching status data:', error);
    
    // Retorna dados vazios em caso de erro
    return NextResponse.json(
      {
        dj: null,
        program: null
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