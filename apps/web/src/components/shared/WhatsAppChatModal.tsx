import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, X, Phone, User, Check, CheckCheck,
  Clock, Paperclip, FileText, Image as ImageIcon, Sparkles, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsAppInbox, useSendStaffDirectChatMessage } from '@/api/printHub.api';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  tokenNumber?: string;
  branchId?: string;
  orderId?: string;
  totalAmount?: number;
}

export default function WhatsAppChatModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  tokenNumber,
  branchId,
  orderId,
  totalAmount = 10,
}: WhatsAppChatModalProps) {
  const [inputText, setInputText] = useState('');
  const [sentToast, setSentToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: inboxMessages = [] } = useWhatsAppInbox(branchId);
  const sendMutation = useSendStaffDirectChatMessage();

  // Normalize phone for comparison
  const cleanPhoneDigits = (customerPhone || '').replace(/[^0-9]/g, '');

  // Filter conversation history for this customer's phone (excluding automated processing messages)
  const conversationMessages = React.useMemo(() => {
    if (!cleanPhoneDigits) return [];
    const filtered = (inboxMessages || []).filter((m: any) => {
      if (!m.phone) return false;
      // Filter out automated bot/processing notifications
      if (m.messageBody && (
        m.messageBody.toLowerCase().includes('processing your document') ||
        m.messageBody.toLowerCase().includes('processing order') ||
        m.messageBody.toLowerCase().includes('processing...') ||
        m.messageBody.toLowerCase().includes('we are processing') ||
        m.messageBody.toLowerCase().includes('document received, processing')
      )) {
        return false;
      }
      const mDigits = m.phone.replace(/[^0-9]/g, '');
      return (
        mDigits === cleanPhoneDigits ||
        mDigits.endsWith(cleanPhoneDigits.slice(-10)) ||
        cleanPhoneDigits.endsWith(mDigits.slice(-10))
      );
    });
    return [...filtered].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [inboxMessages, cleanPhoneDigits]);

  // Auto-scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen, conversationMessages.length]);

  if (!isOpen) return null;

  const quickTemplates = [
    `✅ Hello ${customerName || 'Customer'}, your print job ${tokenNumber || ''} is completed & ready for pickup! 🖨️`,
    `💰 Total amount for your print is ₹${totalAmount}. Thank you for visiting SVV Print Hub!`,
    `📄 Please confirm: Do you require Color print or Black & White print for your document?`,
    `🪪 Your PVC Smart Card has been printed with high-gloss finish and is ready.`,
    `🙏 Thank you for choosing SVV Print Hub! Have a great day.`,
  ];

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || sendMutation.isPending) return;

    try {
      await sendMutation.mutateAsync({
        branchId,
        phone: customerPhone,
        messageBody: textToSend,
        orderId,
      });

      setInputText('');
      setSentToast(true);
      setTimeout(() => setSentToast(false), 2500);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to send WhatsApp message', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cleanWaNumber = cleanPhoneDigits.length === 10 ? `91${cleanPhoneDigits}` : cleanPhoneDigits;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#CBD5E1] shadow-2xl w-full max-w-xl flex flex-col h-[85vh] max-h-[680px] overflow-hidden">
        
        {/* ── 1. HEADER (WhatsApp Brand Navy #075E54 / #081B3A) ── */}
        <div className="bg-[#075E54] text-white p-3.5 px-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
                  {customerName || 'Customer'}
                </h3>
                {tokenNumber && (
                  <span className="font-mono text-[10px] font-bold bg-[#128C7E] text-white px-2 py-0.5 rounded-md border border-[#25D366]/40">
                    {tokenNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A7F3D0] font-mono flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {customerPhone}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse ml-1" />
                <span className="text-[10px]">Active</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`https://wa.me/${cleanWaNumber}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[#128C7E] hover:bg-[#0c6b5f] text-white text-xs flex items-center gap-1 cursor-pointer"
              title="Open WhatsApp Web Tab (Optional)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#128C7E] hover:bg-[#0c6b5f] text-white cursor-pointer"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. CHAT MESSAGES STREAM ── */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2] relative"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {conversationMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-xs border border-gray-300 text-gray-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-700">Start Live Conversation</p>
              <p className="text-[11px] text-gray-500 max-w-xs">
                Type your message or click a quick template below to notify {customerName} on WhatsApp.
              </p>
            </div>
          ) : (
            conversationMessages.map((msg: any, idx: number) => {
              const isOutgoing = !msg.isIncoming;
              const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
              const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 shadow-xs text-xs relative ${
                      isOutgoing
                        ? 'bg-[#D9FDD3] text-[#111827] rounded-tr-xs border border-[#BBF7D0]'
                        : 'bg-[#FFFFFF] text-[#111827] rounded-tl-xs border border-[#E2E8F0]'
                    }`}
                  >
                    {/* Sender Label */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold ${isOutgoing ? 'text-[#0D9488]' : 'text-[#0D6EFD]'}`}>
                        {isOutgoing ? (msg.senderName || 'SVV Staff') : (msg.senderName || customerName)}
                      </span>
                    </div>

                    {/* Media attachment badge if any */}
                    {msg.mediaUrl && (
                      <div className="mb-2 p-2 rounded-xl bg-white/90 border border-gray-200 flex items-center gap-2">
                        {msg.mediaType === 'PDF' ? (
                          <FileText className="w-5 h-5 text-red-500 shrink-0" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-mono truncate max-w-[180px]">
                          {msg.mediaUrl.split('/').pop()}
                        </span>
                        <a
                          href={`http://localhost:4000${msg.mediaUrl.startsWith('/') ? msg.mediaUrl : `/${msg.mediaUrl}`}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[10px] font-bold text-[#0D6EFD] hover:underline"
                        >
                          View
                        </a>
                      </div>
                    )}

                    {/* Message Body Text */}
                    <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                      {msg.messageBody}
                    </p>

                    {/* Timestamp & Sent tick */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#6B7280] font-mono">
                      <span>{timeStr}</span>
                      {isOutgoing && <CheckCheck className="w-3 h-3 text-[#53BDEB]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── 3. QUICK TEMPLATE CHIPS ── */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1 shrink-0 px-1">
            <Sparkles className="w-3 h-3 text-[#FD7E14]" /> Quick:
          </span>
          {quickTemplates.map((tmpl, tIdx) => (
            <button
              key={tIdx}
              type="button"
              onClick={() => setInputText(tmpl)}
              className="px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#E7F1FF] text-[#081B3A] hover:text-[#0D6EFD] border border-[#CBD5E1] text-[10px] font-medium whitespace-nowrap transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              {tmpl.slice(0, 32)}...
            </button>
          ))}
        </div>

        {/* ── 4. INPUT & SEND ACTION BAR ── */}
        <div className="p-3 bg-[#FFFFFF] border-t border-[#E2E8F0] flex items-center gap-2 shrink-0">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type message to ${customerName || 'customer'}... (Enter to send)`}
            className="flex-1 p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#081B3A] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-[#FFFFFF] resize-none select-text"
          />

          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
            className="h-11 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
          >
            {sendMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </Button>
        </div>

        {/* Sent Success Feedback Banner */}
        {sentToast && (
          <div className="bg-[#198754] text-white text-[11px] font-bold py-1.5 px-4 text-center animate-in slide-in-from-bottom flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Message sent to {customerName} on WhatsApp!
          </div>
        )}
      </div>
    </div>
  );
}
