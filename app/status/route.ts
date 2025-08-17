import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Usar proxy CORS público para contornar bloqueios
    const proxyUrls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent("http://sonicpanel.oficialserver.com:8342/")}`,
      `https://corsproxy.io/?${encodeURIComponent("http://sonicpanel.oficialserver.com:8342/")}`,
      `https://cors-anywhere.herokuapp.com/http://sonicpanel.oficialserver.com:8342/`,
    ]

    let html = ""
    let proxyUsed = ""

    // Tenta cada proxy
    for (const proxyUrl of proxyUrls) {
      try {
        const response = await fetch(proxyUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest",
          },
          timeout: 8000,
        })

        if (response.ok) {
          const data = await response.json()
          html = data.contents || data.data || ""
          proxyUsed = proxyUrl
          break
        }
      } catch (err) {
        console.log(`Proxy ${proxyUrl} falhou:`, err)
        continue
      }
    }

    // Se nenhum proxy funcionou, tenta direto
    if (!html) {
      try {
        const directResponse = await fetch("http://sonicpanel.oficialserver.com:8342/", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        html = await directResponse.text()
        proxyUsed = "direct"
      } catch (err) {
        // Se tudo falhar, retorna dados mock
        return NextResponse.json({
          serverStatus: "offline",
          streamStatus: { bitrate: "128 kbps", currentListeners: 0, maxListeners: 1000 },
          peakListeners: 0,
          averageListenTime: "0:00",
          radioTitle: "Radio Habblive",
          currentSong: "Stream temporariamente indisponível",
          genre: "Variados",
          streamUrl: "http://sonicpanel.oficialserver.com:8342",
          lastUpdated: new Date().toISOString(),
          debugInfo: { error: "Todos os métodos de conexão falharam", proxyTried: proxyUrls },
        })
      }
    }

    // Extrair dados (mesmas funções de antes, mas simplificadas)
    const data = {
      serverStatus: html.includes("Server is currently up") ? "online" : "offline",
      streamStatus: {
        bitrate: extractSimple(html, /(\d+)\s*kbps/, "128 kbps"),
        currentListeners: Number.parseInt(extractSimple(html, /(\d+) of \d+ listeners/, "0")),
        maxListeners: Number.parseInt(extractSimple(html, /\d+ of (\d+) listeners/, "1000")),
      },
      peakListeners: Number.parseInt(extractSimple(html, /Peak.*?(\d+)/, "0")),
      averageListenTime: extractSimple(html, /Average Listen Time.*?<b>([^<]+)</, "0:00").replace(/&nbsp;/g, " "),
      radioTitle: extractSimple(html, /Stream Title.*?<b>([^<]+)</, "Radio Habblive"),
      currentSong: extractSimple(html, /Current Song.*?<b>([^<]+)</, "Sem informação"),
      genre: extractSimple(html, /Stream Genre.*?<b>([^<]*)</, "Variados") || "Variados",
      streamUrl: "http://sonicpanel.oficialserver.com:8342",
      lastUpdated: new Date().toISOString(),
      debugInfo: {
        proxyUsed,
        htmlLength: html.length,
        extractedFromHtml: html.substring(0, 200) + "...",
      },
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro geral:", error)
    return NextResponse.json({
      serverStatus: "offline",
      streamStatus: { bitrate: "0 kbps", currentListeners: 0, maxListeners: 0 },
      peakListeners: 0,
      averageListenTime: "0:00",
      radioTitle: "Radio Habblive",
      currentSong: "Erro de conexão",
      genre: "Variados",
      streamUrl: "http://sonicpanel.oficialserver.com:8342",
      lastUpdated: new Date().toISOString(),
      debugInfo: { error: error.message },
    })
  }
}

function extractSimple(html: string, regex: RegExp, fallback: string): string {
  const match = html.match(regex)
  return match ? match[1].trim() : fallback
}
