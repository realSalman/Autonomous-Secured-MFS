import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Create LLM instance based on LLM_PROVIDER env var.
 * Defaults to Groq for fast inference.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLLM(): any {
  const provider = process.env.LLM_PROVIDER || 'groq';

  switch (provider) {
    case 'groq':
      return new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.3,
        maxTokens: 1024,
      });

    case 'gemini':
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        temperature: 0.3,
        maxOutputTokens: 1024,
      });

    case 'openrouter':
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENROUTER_API_KEY,
        modelName: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
        temperature: 0.3,
        maxTokens: 1024,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });

    default:
      console.warn(`[LLM] Unknown provider "${provider}", falling back to groq`);
      return new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        maxTokens: 1024,
      });
  }
}
