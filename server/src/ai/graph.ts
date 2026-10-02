import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from './llm';
import { getUserInfo, getRecentTransactions } from './tools';
import { searchKnowledge } from './knowledge';
import { IMessage, IUser, ITransaction, KnowledgeArticle } from '../types/index';

// ── State definition ──

const SupportState = Annotation.Root({
  phone: Annotation<string>({
    reducer: (_, b) => b ?? '',
    default: () => '',
  }),
  message: Annotation<string>({
    reducer: (_, b) => b ?? '',
    default: () => '',
  }),
  conversationHistory: Annotation<IMessage[]>({
    reducer: (_, b) => b ?? [],
    default: () => [],
  }),
  intent: Annotation<string>({
    reducer: (_, b) => b ?? 'general',
    default: () => 'general',
  }),
  userInfo: Annotation<IUser | null>({
    reducer: (_, b) => b ?? null,
    default: () => null,
  }),
  transactions: Annotation<ITransaction[]>({
    reducer: (_, b) => b ?? [],
    default: () => [],
  }),
  knowledge: Annotation<KnowledgeArticle[]>({
    reducer: (_, b) => b ?? [],
    default: () => [],
  }),
  suggestedReply: Annotation<string>({
    reducer: (_, b) => b ?? '',
    default: () => '',
  }),
  actions: Annotation<string[]>({
    reducer: (_, b) => b ?? [],
    default: () => [],
  }),
});

type SupportStateType = typeof SupportState.State;

// ── Node: Classify intent ──

async function classifyNode(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const llm = createLLM();

  const classifyPrompt = `You are an intent classifier for a mobile financial service (MFS) customer support system.

Classify the customer's message into exactly ONE of these categories:
- payment_failure: Issues with failed, declined, or stuck payments
- wrong_recipient: Money sent to wrong number/person
- balance_inquiry: Questions about account balance, missing money
- account_issue: Login problems, profile updates, blocked accounts
- cashout: ATM or agent cashout problems
- general: General questions, fees, limits, how-to

Respond with ONLY the category name, nothing else.

Customer message: "${state.message}"`;

  try {
    const response = await llm.invoke([new HumanMessage(classifyPrompt)]);
    const content = typeof response.content === 'string' ? response.content : '';
    const intent = content.trim().toLowerCase().replace(/[^a-z_]/g, '');

    const validIntents = ['payment_failure', 'wrong_recipient', 'balance_inquiry', 'account_issue', 'cashout', 'general'];
    const finalIntent = validIntents.includes(intent) ? intent : 'general';

    return { intent: finalIntent };
  } catch (error) {
    console.error('[AI] Classification error:', error);
    return { intent: 'general' };
  }
}

// ── Node: Retrieve context ──

async function retrieveNode(state: SupportStateType): Promise<Partial<SupportStateType>> {
  try {
    const [userInfo, transactions] = await Promise.all([
      getUserInfo(state.phone),
      getRecentTransactions(state.phone, 5),
    ]);

    const knowledge = searchKnowledge(state.intent, state.message);

    return { userInfo, transactions, knowledge };
  } catch (error) {
    console.error('[AI] Retrieval error:', error);
    return {
      userInfo: null,
      transactions: [],
      knowledge: searchKnowledge('general'),
    };
  }
}

// ── Node: Generate response ──

async function respondNode(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const llm = createLLM();

  const userContext = state.userInfo
    ? `Customer: ${state.userInfo.name || 'Unknown'} | Phone: ${state.userInfo.phone} | Balance: ৳${state.userInfo.balance.toLocaleString()}`
    : 'Customer information unavailable';

  const txContext =
    state.transactions.length > 0
      ? state.transactions
          .map(
            (tx) =>
              `  ${tx.tx_id} | ${new Date(tx.time).toLocaleString()} | ${tx.sender} → ${tx.receiver} | ৳${tx.amount} | ${tx.status}`
          )
          .join('\n')
      : '  No recent transactions';

  const kbContext = state.knowledge.map((kb) => kb.content).join('\n\n---\n\n');

  const historyContext = state.conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'customer' ? 'Customer' : 'Support'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are a professional customer support agent for PayFlow, a mobile financial service (MFS).

CONTEXT:
${userContext}

RECENT TRANSACTIONS:
${txContext}

RELEVANT KNOWLEDGE BASE:
${kbContext}

CONVERSATION HISTORY:
${historyContext || 'This is the start of the conversation.'}

GUIDELINES:
- Be helpful, concise, and professional
- Reference specific transaction IDs and amounts when relevant
- If you can resolve the issue with available information, do so
- If the issue needs escalation, explain what will happen next
- Use the customer's name if available
- Keep responses under 150 words
- Do NOT hallucinate transaction details — only reference data provided above
- Mention specific balances, amounts, and dates from the context
- If you need more information from the customer, ask specific questions`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.message),
    ]);

    const content = typeof response.content === 'string' ? response.content : '';
    const actions = state.knowledge.flatMap((kb) => kb.actions);
    const uniqueActions = [...new Set(actions)];

    return {
      suggestedReply: content,
      actions: uniqueActions,
    };
  } catch (error) {
    console.error('[AI] Response generation error:', error);
    return {
      suggestedReply:
        'I apologize, but I\'m experiencing a technical issue. Let me connect you with a support agent who can help you right away.',
      actions: ['escalate'],
    };
  }
}

// ── Build the graph ──

const workflow = new StateGraph(SupportState)
  .addNode('classify', classifyNode)
  .addNode('retrieve', retrieveNode)
  .addNode('respond', respondNode)
  .addEdge(START, 'classify')
  .addEdge('classify', 'retrieve')
  .addEdge('retrieve', 'respond')
  .addEdge('respond', END);

export const supportGraph = workflow.compile();

/**
 * Run the support agent graph for a customer message.
 */
export async function runSupportAgent(
  phone: string,
  message: string,
  conversationHistory: IMessage[] = []
) {
  const result = await supportGraph.invoke({
    phone,
    message,
    conversationHistory,
  });

  return {
    intent: result.intent,
    suggestedReply: result.suggestedReply,
    actions: result.actions,
    context: {
      userInfo: result.userInfo,
      recentTransactions: result.transactions,
      knowledgeArticles: result.knowledge,
    },
  };
}
