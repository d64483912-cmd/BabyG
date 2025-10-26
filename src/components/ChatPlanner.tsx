import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2,
  MessageSquare,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatPlannerProps {
  onCreateObjective?: (title: string, description: string) => void;
  onClose?: () => void;
}

export default function ChatPlanner({ onCreateObjective, onClose }: ChatPlannerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI planning assistant. I can help you brainstorm objectives, break down complex goals, and create smart task plans. What would you like to achieve today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Use the generate-tasks edge function with chat context
      const conversationContext = messages
        .slice(-5) // Last 5 messages for context
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: {
          objective: userMessage.content,
          description: `Conversation context:\n${conversationContext}\n\nUser request: ${userMessage.content}`,
          isChatMode: true
        }
      });

      if (error) throw error;

      // Create assistant response
      let assistantContent = '';
      
      if (data.chatResponse) {
        assistantContent = data.chatResponse;
      } else if (data.tasks && data.tasks.length > 0) {
        assistantContent = `I've analyzed your request! Here's what I suggest:\n\n`;
        assistantContent += `**Objective:** ${userMessage.content}\n\n`;
        assistantContent += `**Recommended Tasks:**\n`;
        data.tasks.slice(0, 5).forEach((task: { title: string }, index: number) => {
          assistantContent += `${index + 1}. ${task.title}\n`;
        });
        assistantContent += `\nWould you like me to create this objective for you? Just say "Yes, create it" or refine the plan further.`;
      } else {
        assistantContent = "I understand your request. Could you provide more details about what you'd like to achieve?";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if user wants to create the objective
      const confirmKeywords = ['yes', 'create', 'do it', 'go ahead', 'start', 'begin'];
      const userWantsToCreate = confirmKeywords.some(keyword => 
        userMessage.content.toLowerCase().includes(keyword)
      );

      if (userWantsToCreate && data.tasks && onCreateObjective) {
        // Extract the objective from conversation
        const recentUserMessages = messages
          .filter(m => m.role === 'user')
          .slice(-3);
        
        const objectiveTitle = recentUserMessages.find(m => 
          !confirmKeywords.some(k => m.content.toLowerCase().includes(k))
        )?.content || userMessage.content;

        toast.success('Creating objective from chat...', {
          description: objectiveTitle,
          duration: 2000
        });

        setTimeout(() => {
          onCreateObjective(objectiveTitle, assistantContent);
        }, 500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request. Could you try rephrasing it?",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const examplePrompts = [
    "Build a portfolio website",
    "Learn React in 30 days",
    "Plan a product launch",
    "Organize a team workshop"
  ];

  return (
    <div className="glass rounded-2xl border border-white/20 overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Planning Chat</h3>
            <p className="text-xs text-white/70">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${message.role === 'user' 
                  ? 'bg-gradient-to-br from-accent to-primary' 
                  : 'bg-gradient-to-br from-primary to-accent'}
              `}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`
                flex-1 max-w-[80%] rounded-2xl p-4
                ${message.role === 'user'
                  ? 'bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/30'
                  : 'glass border border-white/10'}
              `}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass border border-white/10 rounded-2xl p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts (show when no user messages) */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">Try these examples:</p>
          <div className="grid grid-cols-2 gap-2">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 transition-all"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your planning questions or objectives..."
            disabled={isTyping}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 rounded-xl transition-all flex items-center justify-center"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
