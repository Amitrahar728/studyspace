"use client";

import React, { useState, useEffect, useRef, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSocket } from "../../context/AppContext";
import {
  getOrGenerateKeyPair,
  encryptPayload,
  decryptPayload,
} from "../../utils/crypto";
import {
  ShieldCheck,
  Send,
  User,
  Lock,
  MessageSquare,
  Search,
  CheckCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface ChatUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedPayload: string;
  createdAt: string;
  decryptedText?: string;
  sender?: ChatUser;
}

interface ConversationItem {
  user: ChatUser;
  lastMessage?: {
    id: string;
    encryptedPayload: string;
    createdAt: string;
    senderId: string;
  };
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directUserId = searchParams.get("userId");

  const { user, token } = useAuth();
  const { socket } = useSocket();

  const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatUser | null>(null);
  const [partnerPublicKey, setPartnerPublicKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [keySyncing, setKeySyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

  // 1. Initialize E2E key pair and register public key with backend
  useEffect(() => {
    if (!user || !token) return;

    const setupCryptoKeys = async () => {
      try {
        setKeySyncing(true);
        const pubKey = await getOrGenerateKeyPair(user.id);
        setMyPublicKey(pubKey);

        // Upload key to backend API
        await fetch(`${apiBase}/chat/keys`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ publicKey: pubKey }),
        });
      } catch (err) {
        console.error("Crypto setup error:", err);
      } finally {
        setKeySyncing(false);
      }
    };

    setupCryptoKeys();
  }, [user, token, apiBase]);

  // 2. Fetch conversations list
  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ConversationItem[] = await res.json();
        setConversations(data);

        // If directUserId passed in query parameter, fetch or create partner
        if (directUserId) {
          const existing = data.find((c) => c.user.id === directUserId);
          if (existing) {
            setSelectedPartner(existing.user);
          } else {
            // Fetch direct user details
            fetchUserById(directUserId);
          }
        }
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserById = async (targetId: string) => {
    try {
      const res = await fetch(`${apiBase}/chat/user/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const targetUser: ChatUser = await res.json();
        setSelectedPartner(targetUser);
        setConversations((prev) => {
          if (prev.some((c) => c.user.id === targetId)) return prev;
          return [{ user: targetUser }, ...prev];
        });
      } else {
        const fallbackUser: ChatUser = { id: targetId, name: "Workspace Host" };
        setSelectedPartner(fallbackUser);
        setConversations((prev) => {
          if (prev.some((c) => c.user.id === targetId)) return prev;
          return [{ user: fallbackUser }, ...prev];
        });
      }
    } catch (err) {
      console.error("Fetch target user error:", err);
      const fallbackUser: ChatUser = { id: targetId, name: "Workspace Host" };
      setSelectedPartner(fallbackUser);
      setConversations((prev) => {
        if (prev.some((c) => c.user.id === targetId)) return prev;
        return [{ user: fallbackUser }, ...prev];
      });
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token, directUserId]);

  // 3. When selectedPartner changes, fetch their public key and historical messages
  useEffect(() => {
    if (!selectedPartner || !token || !user) return;

    const loadPartnerDataAndMessages = async () => {
      try {
        // Fetch partner public key
        const keyRes = await fetch(`${apiBase}/chat/keys/${selectedPartner.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (keyRes.ok) {
          const keyData = await keyRes.json();
          setPartnerPublicKey(keyData.publicKey);
        } else {
          setPartnerPublicKey(null);
        }

        // Fetch messages
        const msgRes = await fetch(`${apiBase}/chat/messages/${selectedPartner.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (msgRes.ok) {
          const rawMsgs: ChatMessage[] = await msgRes.json();

          // Decrypt historical messages
          const decryptedMsgs = await Promise.all(
            rawMsgs.map(async (m) => ({
              ...m,
              decryptedText: await decryptPayload(m.encryptedPayload, user.id),
            }))
          );

          setMessages(decryptedMsgs);
        }
      } catch (err) {
        console.error("Load messages error:", err);
      }
    };

    loadPartnerDataAndMessages();
  }, [selectedPartner, token, user, apiBase]);

  // 4. Socket room subscription for real-time messages
  useEffect(() => {
    if (!socket || !selectedPartner || !user) return;

    const roomName = `chat:${[user.id, selectedPartner.id].sort().join("_")}`;
    socket.emit("join-chat", roomName);

    const handleNewMessage = async (newMsg: ChatMessage) => {
      if (
        (newMsg.senderId === selectedPartner.id && newMsg.recipientId === user.id) ||
        (newMsg.senderId === user.id && newMsg.recipientId === selectedPartner.id)
      ) {
        const decryptedText = await decryptPayload(newMsg.encryptedPayload, user.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, decryptedText }];
        });
      }
      fetchConversations();
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, selectedPartner, user]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // 5. Send encrypted message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPartner || !user || !myPublicKey) return;

    if (!partnerPublicKey) {
      alert("Recipient has not set up E2E public key yet.");
      return;
    }

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      // Encrypt payload using Web Crypto
      const encryptedPayload = await encryptPayload({
        plaintext: textToSend,
        senderId: user.id,
        senderPublicKeyBase64: myPublicKey,
        recipientId: selectedPartner.id,
        recipientPublicKeyBase64: partnerPublicKey,
      });

      // Emit via socket
      if (socket) {
        socket.emit("send-message", {
          senderId: user.id,
          recipientId: selectedPartner.id,
          encryptedPayload,
        });
      } else {
        // Fallback REST POST if socket disconnected
        await fetch(`${apiBase}/chat/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientId: selectedPartner.id,
            encryptedPayload,
          }),
        });
        fetchConversations();
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Top Title Banner */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-brand" />
              Messages
            </h1>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg flex-1 min-h-[580px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Sidebar - Contact Conversations */}
          <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Loading chats...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No previous conversations found.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = selectedPartner?.id === c.user.id;
                  return (
                    <button
                      key={c.user.id}
                      onClick={() => setSelectedPartner(c.user)}
                      className={`w-full text-left p-4 flex items-center gap-3 transition cursor-pointer ${
                        isSelected
                          ? "bg-brand/10 border-l-4 border-brand"
                          : "hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {c.user.avatarUrl ? (
                          <img
                            src={c.user.avatarUrl}
                            alt={c.user.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                            {c.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {c.user.name}
                          </h3>
                          <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            {c.user.role || "USER"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                          Click to open chat stream
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Chat Window */}
          <div className="md:col-span-8 flex flex-col bg-white">
            {selectedPartner ? (
              <>
                {/* Chat Partner Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    {selectedPartner.avatarUrl ? (
                      <img
                        src={selectedPartner.avatarUrl}
                        alt={selectedPartner.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {selectedPartner.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        {selectedPartner.name}
                      </h2>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> E2E Verified
                      </p>
                    </div>
                  </div>

                  {!partnerPublicKey && (
                    <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                      Partner public key pending
                    </div>
                  )}
                </div>

                {/* Messages Stream Container */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[460px] bg-slate-50/30"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="bg-brand/10 text-brand p-4 rounded-full mb-3">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        No messages yet
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mt-1 font-medium">
                        Send a message to ask about library timing, quiet zones, or seat availability directly.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                              isMe
                                ? "bg-brand text-white rounded-br-none"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                            }`}
                          >
                            {msg.decryptedText || "[Decrypting message...]" }
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 font-semibold">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-5 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white p-3 rounded-full shadow-md transition flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="bg-slate-100 text-slate-400 p-4 rounded-full mb-3">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Start a Conversation
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium">
                  Chat directly with workspace owners to understand library details before booking.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-xs font-bold text-slate-500">
          Loading secure messaging session...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

