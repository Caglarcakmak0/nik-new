// AI Service: wraps local Ollama (or future providers) and simple RAG style retrieval
// Design goals:
// - Non-blocking streaming support placeholder
// - Graceful degrade if Ollama not installed
// - Pluggable retriever (currently stub)

const fs = require('fs');
const path = require('path');
let ollamaClient = null;
let openaiClient = null;
const PROVIDER = process.env.AI_PROVIDER || 'ollama'; // 'ollama' | 'openrouter'
try {
  if (PROVIDER === 'ollama') {
    ollamaClient = require('ollama');
  } else if (PROVIDER === 'openrouter') {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    });
  }
} catch (e) {
  console.warn('[aiService] provider init warning:', e.message);
}

// Assistant identity
const AI_NAME = process.env.AI_NAME || 'Nik AI';

// Simple in-memory docs (later: move to vector DB)
let embeddedDocs = [];

function loadStaticDocs() {
  // Placeholder: load markdown/faq files from a docs/ai folder if exists
  const docsDir = path.join(__dirname, '..', 'ai-data');
  if (!fs.existsSync(docsDir)) return;
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  embeddedDocs = files.map(f => ({
    id: f,
    content: fs.readFileSync(path.join(docsDir, f), 'utf8')
  }));
}

loadStaticDocs();

// Naive similarity (token overlap) — replace with vector DB soon
function simpleRetrieve(query, limit = 3) {
  if (!query || !embeddedDocs.length) return [];
  const terms = query.toLowerCase().split(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]+/).filter(Boolean);
  const scored = embeddedDocs.map(d => {
    const score = terms.reduce((acc, t) => acc + (d.content.toLowerCase().includes(t) ? 1 : 0), 0);
    return { ...d, score };
  });
  return scored.sort((a,b)=> b.score - a.score).slice(0, limit).filter(d => d.score > 0);
}

async function generateAnswer({ message, userContext, maxTokens = 512 }) {
  if (!message) throw new Error('message required');
  const retrieved = simpleRetrieve(message, 4);
  const systemPrompt = `Sen ${AI_NAME} adında YKS hazırlık platformunda öğrencilere yardımcı olan bir asistansın. Cevapları kısa, net ve Türkçe ver. Gereksiz tekrar yapma; motive edici ama abartısız bir ton kullan. Sana ismin sorulursa '${AI_NAME}' olarak cevap ver.`;
  const contextBlock = retrieved.map(r => `Kaynak(${r.id}):\n${r.content.substring(0, 1200)}`).join('\n\n');
  const userStatsSnippet = userContext ? `KullanıcıÖzeti: ${JSON.stringify(userContext).substring(0, 400)}` : '';
  const finalPrompt = `${systemPrompt}\n\n${contextBlock}\n${userStatsSnippet}\n\nSoru: ${message}\nCevap:`;

  // Direct name / identity question fast-path
  const mLower = message.toLowerCase();
  if (/(adın|ismin|kimsin|kim\s?sin|who are you|your name)/i.test(mLower)) {
    return {
      response: `Ben ${AI_NAME}, YKS çalışma asistanın. Çalışma performansın, hedeflerin ve YKS ile ilgili sorularda sana yardımcı olurum. Bana çalışma alışkanlıkların veya sınavla ilgili her şeyi sorabilirsin.`,
      sources: [],
      model: PROVIDER
    };
  }

  if (PROVIDER === 'openrouter') {
    if (!openaiClient) {
      return {
        response: 'OpenRouter yapılandırılmamış. ENV AI_PROVIDER=openrouter ve OPENROUTER_API_KEY gerekli.',
        sources: retrieved.map(r => r.id),
        model: 'stub-openrouter'
      };
    }
    try {
      const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
      const maxTokens = parseInt(process.env.OPENROUTER_MAX_TOKENS || '512', 10);
      const completion = await openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${contextBlock}\n${userStatsSnippet}\nSoru: ${message}` }
        ],
        max_tokens: maxTokens
      });
      const content = completion.choices?.[0]?.message?.content || '(boş yanıt)';
      return {
        response: content,
        sources: retrieved.map(r => r.id),
        model
      };
    } catch (e) {
      const msg = e?.message || '';
      // Özel 402 kredi hatası yakalama
      if (/402/.test(msg) || /credits/i.test(msg)) {
        return {
          response: 'Kredi / limit hatası: Yanıt uzunluğu düşürülüyor. Lütfen gerekirse daha kısa sor veya OPENROUTER_MAX_TOKENS değerini küçült ya da daha uygun fiyatlı bir model seç (ör: openai/gpt-4o-mini).',
          sources: retrieved.map(r=> r.id),
          model: 'error-402'
        };
      }
      console.error('[aiService] openrouter error', msg);
      return { response: 'OpenRouter hata: ' + msg, sources: [], model: 'error' };
    }
  }

  if (!ollamaClient) {
    // fallback deterministic stub
    return {
      response: 'AI modülü henüz aktif değil (Ollama kurulmadı). Sorunuz: ' + message,
      sources: retrieved.map(r => r.id),
      model: 'stub'
    };
  }

  try {
    const res = await ollamaClient.generate({
      model: process.env.AI_MODEL || 'llama3.1',
      prompt: finalPrompt,
      options: {
        num_predict: maxTokens
      }
    });
    return {
      response: res.response,
      sources: retrieved.map(r => r.id),
      model: res.model || 'ollama'
    };
  } catch (e) {
    console.error('[aiService] generation error', e.message);
    return {
      response: 'Model cevabı üretilemedi: ' + e.message,
      sources: [],
      model: 'error'
    };
  }
}

module.exports = { generateAnswer };
