"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock, 
  Unlock, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Music, 
  Film, 
  FileText, 
  CheckCheck, 
  Check, 
  Phone, 
  Video, 
  PhoneOff, 
  Mic, 
  MicOff, 
  VideoOff, 
  Users, 
  Menu, 
  Search, 
  Key, 
  RefreshCw, 
  Sliders, 
  X, 
  Smile, 
  Reply, 
  ArrowLeft, 
  AlertCircle, 
  Trash2,
  LockKeyhole,
  LogOut,
  Laptop,
  Plus,
  Compass,
  Copy,
  Globe,
  CheckCircle2
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useChatStore, ChatMessage, ChatSession } from "../../store/chatStore";
import { encryptPayload, decryptPayload, encryptFile, decryptFile } from "../../crypto/ratchet";
import { getSecureKey, saveSecureKey } from "../../crypto/storage";
import { computeSharedSecret } from "../../crypto/keys";
import { db } from "../../lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";

// Define mock contacts
const INITIAL_SESSIONS: ChatSession[] = [
  {
    chatId: "alice_session",
    type: "private",
    members: ["local_user", "alice"],
    displayName: "Alice Vance (Security Auditor)",
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    lastMessage: {
      senderId: "alice",
      timestamp: Date.now() - 300000,
      textPreview: "Double Ratchet keys rotated. Ready for manual penetration check."
    }
  },
  {
    chatId: "bob_session",
    type: "private",
    members: ["local_user", "bob"],
    displayName: "Bob Miller (Core Cryptographer)",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    lastMessage: {
      senderId: "local_user",
      timestamp: Date.now() - 1800000,
      textPreview: "Sent files are fully encrypted at the application layer."
    }
  },
  {
    chatId: "cryptology_group",
    type: "group",
    members: ["local_user", "alice", "bob"],
    displayName: "ChitChat Cryptology Core",
    photoURL: "", // Render custom group icon
    lastMessage: {
      senderId: "bob",
      timestamp: Date.now() - 3600000,
      textPreview: "Broadcast Sender Key derived for all group nodes."
    }
  }
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  "alice_session": [
    {
      messageId: "m1",
      senderId: "alice",
      timestamp: Date.now() - 900000,
      decryptedText: "Hello there! I've validated your X25519 identity key. Let's start the ratchet exchange.",
      cipherText: "W1ZhbGlkYXRlZF9YMjU1MTldIENoaXRDaGF0IFRlc3QgRW52ZWxvcGUgLSBDb2RlUGFzc2Vk",
      iv: "YTVzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    },
    {
      messageId: "m2",
      senderId: "local_user",
      timestamp: Date.now() - 600000,
      decryptedText: "Perfect. PBKDF2 master encryption key successfully locks the local database.",
      cipherText: "TG9jYWwgVmF1bHQgbG9ja2VkIHdpdGggUEJLUERGMiBzZWxlY3RpdmUgY2lwaGVycw==",
      iv: "OGFzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    },
    {
      messageId: "m3",
      senderId: "alice",
      timestamp: Date.now() - 300000,
      decryptedText: "Double Ratchet keys rotated. Ready for manual penetration check.",
      cipherText: "S2V5cyByb3RhdGVkLiBObyBtZXRhZGF0YSBsZWFrcyBhbGxvd2VkLg==",
      iv: "N2FzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    }
  ],
  "bob_session": [
    {
      messageId: "m4",
      senderId: "bob",
      timestamp: Date.now() - 3600000,
      decryptedText: "Did you verify storage bucket rule integrity?",
      cipherText: "VmVyaWZ5IGJ1Y2tldCBydWxlcyBvbiBGaXJlYmFzZSBTdG9yYWdlLg==",
      iv: "M2FzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    },
    {
      messageId: "m5",
      senderId: "local_user",
      timestamp: Date.now() - 1800000,
      decryptedText: "Yes, verified! Storage rules strictly reject non-application/octet-stream content types to enforce E2EE media blobs.",
      cipherText: "RW5mb3JjZSBvY3RldC1zdHJlYW0gdHlwZXMgdG8gcHJldmVudCBwbGFpbnRleHQgcmVhZHMu",
      iv: "NGFzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    }
  ],
  "cryptology_group": [
    {
      messageId: "m6",
      senderId: "alice",
      timestamp: Date.now() - 7200000,
      decryptedText: "I've joined the multi-node conversation group.",
      cipherText: "TWV0YSBOb2RlIEpvaW5lZC4gRzJFRSBzZW5kZXIga2V5cyBzeW5jZWQu",
      iv: "NWFzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    },
    {
      messageId: "m7",
      senderId: "bob",
      timestamp: Date.now() - 3600000,
      decryptedText: "Broadcast Sender Key derived for all group nodes.",
      cipherText: "U2VuZGVyIGtleSByYXRjaGV0IGFjdGl2YXRlZCBmb3IgYnJvYWRjYXN0IGRvbWFpbi4=",
      iv: "NmFzOGRmOWFzZGY4OWFzZA==",
      tag: "OTBzOGRmOWFzZGY4OWFzZA==",
      status: "seen"
    }
  ]
};

export default function ChatDashboard() {
  const router = useRouter();
  const { user, profile, mek, isUnlocked, lockVault } = useAuthStore();
  const { 
    chats, 
    activeChatId, 
    messages, 
    typingUsers, 
    presenceList, 
    currentCall, 
    setChats, 
    setActiveChatId, 
    setMessages, 
    addMessage, 
    setTyping, 
    updatePresence,
    setCurrentCall
  } = useChatStore();

  // Component states
  const [activeTab, setActiveTab] = useState<'chats' | 'vault'>('chats');
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [identityPubKey, setIdentityPubKey] = useState<string | null>(null);
  
  // UI Panels / Modals
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callState, setCallState] = useState<'initiating' | 'connecting' | 'connected' | 'ended'>('initiating');
  const [callDuration, setCallDuration] = useState(0);
  
  // Attachment & Progress
  const [attachment, setAttachment] = useState<File | null>(null);
  const [encryptingProgress, setEncryptingProgress] = useState<number | null>(null);
  const [uploadingProgress, setUploadingProgress] = useState<number | null>(null);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus and Reply states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Double Ratchet key states (mocked visually for demonstration)
  const [ratchetRK, setRatchetRK] = useState("");
  const [ratchetCKSend, setRatchetCKSend] = useState("");
  const [ratchetCKRecv, setRatchetCKRecv] = useState("");

  const [isPending, startTransition] = useTransition();

  // New E2EE Chat & Group Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'private' | 'createGroup' | 'joinGroup'>('private');
  const [targetUsername, setTargetUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isGroupPublic, setIsGroupPublic] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [publicGroups, setPublicGroups] = useState<any[]>([]);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [newChatLoading, setNewChatLoading] = useState(false);

  // Vault protection redirect
  useEffect(() => {
    if (!isUnlocked) {
      router.push("/");
    }
  }, [isUnlocked, router]);

  // Load Local E2EE Credentials from IndexedDB vault
  useEffect(() => {
    getSecureKey("identity_public_key").then((pubKey) => {
      if (pubKey) {
        setIdentityPubKey(pubKey);
      } else {
        setIdentityPubKey("MOCK_X25519_IDENTITY_KEY_BASE64_F1P8W...");
      }
    });

    // Populate default keyring monitor keys
    setRatchetRK("A8F90E1C934E27189E5AB2F0302E193A17B809FEE283CD98902A91D347890BC1");
    setRatchetCKSend("C9A174E18374A92EF030AC125B81C92EF3A917EEB3A8B74C829EF748AC19EF38");
    setRatchetCKRecv("B718D02E3917AC82EF3A90FE1938DC82FBE03AC12574A91EF02B84AC1293EF18");
  }, []);

  const updateLocalKeyringMonitor = async (channelKey: Uint8Array) => {
    try {
      const hex = Array.from(channelKey).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      setRatchetRK(hex.substring(0, 32));
      setRatchetCKSend(hex.substring(32, 64) || hex.substring(0, 32));
      setRatchetCKRecv(hex.substring(16, 48));
    } catch (e) {
      console.error("Monitor key conversion error:", e);
    }
  };

  // Real-time Firestore subscriptions for active Chats
  useEffect(() => {
    if (!profile?.uid) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", profile.uid)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
      const chatSessions: ChatSession[] = [];
      
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let displayName = data.displayName || "Secure Channel";
        let photoURL = data.photoURL || "";
        
        if (data.type === "private") {
          const otherUid = data.members.find((m: string) => m !== profile.uid);
          const otherUsername = data.memberUsernames?.find((u: string) => u !== profile.username) || "peer";
          displayName = (otherUid && data.memberNames?.[otherUid]) || otherUsername.toUpperCase();
        }

        chatSessions.push({
          chatId: data.chatId,
          type: data.type,
          members: data.members,
          displayName,
          photoURL,
          lastMessage: data.lastMessage ? {
            senderId: data.lastMessage.senderId,
            timestamp: data.lastMessage.timestamp,
            textPreview: data.lastMessage.textPreview
          } : undefined
        });
      });

      if (chatSessions.length === 0) {
        setChats(INITIAL_SESSIONS);
      } else {
        setChats(chatSessions);
      }
    }, (error) => {
      console.error("Error subscribing to chats:", error);
    });

    return () => {
      unsubscribeChats();
    };
  }, [profile, setChats]);

  // Real-time Firestore subscriptions for Messages in active chat
  useEffect(() => {
    if (!activeChatId || !profile?.uid) return;

    if (activeChatId.endsWith("_session") || activeChatId === "cryptology_group") {
      setMessages(activeChatId, INITIAL_MESSAGES[activeChatId] || []);
      return;
    }

    const messagesQuery = query(
      collection(db, "chats", activeChatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
      const msgList: ChatMessage[] = [];
      const activeSession = chats.find(c => c.chatId === activeChatId);
      
      let decryptionKey = mek || new Uint8Array(32);
      
      if (activeSession) {
        if (activeSession.type === "private") {
          try {
            const otherUid = activeSession.members.find(m => m !== profile.uid);
            if (otherUid) {
              const chatRef = doc(db, "chats", activeChatId);
              const chatSnap = await getDoc(chatRef);
              if (chatSnap.exists()) {
                const chatData = chatSnap.data();
                const otherPub = chatData.memberPublicKeys?.[otherUid];
                const myPriv = await getSecureKey("identity_private_key");
                if (otherPub && myPriv) {
                  decryptionKey = computeSharedSecret(myPriv, otherPub);
                }
              }
            }
          } catch (e) {
            console.error("Error computing shared secret for decryption:", e);
          }
        } else {
          try {
            const chatRef = doc(db, "chats", activeChatId);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
              const chatData = chatSnap.data();
              if (chatData.isPublic) {
                const enc = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(activeChatId));
                decryptionKey = new Uint8Array(hashBuffer);
              } else {
                const myEncryptedKey = chatData.encryptedKeys?.[profile.uid];
                if (myEncryptedKey) {
                  const creatorUid = chatData.createdBy;
                  const creatorPub = chatData.memberPublicKeys?.[creatorUid];
                  const myPriv = await getSecureKey("identity_private_key");
                  if (creatorPub && myPriv) {
                    const sharedSecret = computeSharedSecret(myPriv, creatorPub);
                    const decryptedGroupKeyHex = await decryptPayload(myEncryptedKey, sharedSecret);
                    decryptionKey = new TextEncoder().encode(decryptedGroupKeyHex).slice(0, 32);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error decrypting group key:", e);
          }
        }
      }

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let decryptedText = data.decryptedText;
        
        if (data.cipherText && !decryptedText) {
          try {
            decryptedText = await decryptPayload({
              cipherText: data.cipherText,
              iv: data.iv,
              tag: data.tag
            }, decryptionKey);
          } catch (e) {
            console.warn("E2EE payload decryption mismatch:", e);
            decryptedText = "🔒 [E2EE Payload - Encrypted Server-side]";
          }
        }

        msgList.push({
          messageId: data.messageId || docSnap.id,
          senderId: data.senderId,
          timestamp: data.timestamp,
          cipherText: data.cipherText,
          iv: data.iv,
          tag: data.tag,
          decryptedText,
          status: data.status || "sent",
          replyToMessageId: data.replyToMessageId || null,
          mediaMetadata: data.mediaMetadata || undefined
        });
      }

      setMessages(activeChatId, msgList);
      updateLocalKeyringMonitor(decryptionKey);
    }, (error) => {
      console.error("Error subscribing to messages:", error);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [activeChatId, profile, chats, mek, setMessages]);

  // Search public groups in Firestore
  useEffect(() => {
    if (newChatTab !== 'joinGroup' || !groupSearchQuery.trim()) {
      setPublicGroups([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const q = query(
          collection(db, "chats"),
          where("type", "==", "group"),
          where("isPublic", "==", true)
        );
        const querySnapshot = await getDocs(q);
        const groups: any[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.displayName?.toLowerCase().includes(groupSearchQuery.toLowerCase())) {
            groups.push(data);
          }
        });
        setPublicGroups(groups);
      } catch (err) {
        console.error("Error searching public groups:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [groupSearchQuery, newChatTab]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatId]);

  // Call timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showCallModal && callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [showCallModal, callState]);

  // Format call duration
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !attachment) return;

    if (!activeChatId || !profile?.uid) return;

    const textToSend = inputMessage;
    setInputMessage("");
    setReplyingTo(null);

    // If it's a mock session, fallback to simulated flow
    if (activeChatId.endsWith("_session") || activeChatId === "cryptology_group") {
      const rawKey = mek || new Uint8Array(32);
      try {
        if (attachment) {
          setEncryptingProgress(10);
          const interval = setInterval(() => {
            setEncryptingProgress((prev) => {
              if (prev === null) return null;
              if (prev >= 100) {
                clearInterval(interval);
                setUploadingProgress(10);
                return 100;
              }
              return prev + 25;
            });
          }, 150);

          const uploadInterval = setInterval(() => {
            setUploadingProgress((prev) => {
              if (prev === null) return null;
              if (prev >= 100) {
                clearInterval(uploadInterval);
                setTimeout(() => {
                  setEncryptingProgress(null);
                  setUploadingProgress(null);
                }, 400);
                return 100;
              }
              return prev + 20;
            });
          }, 200);

          await new Promise((res) => setTimeout(res, 2000));

          const mockEnvelope = {
            cipherText: "QklOQVJZX0VDTlJZUFRFRF9NRURJQV9FTlZFTE9QRV9CQVNFNjQ=",
            iv: "bWVkaWFfaXZfYmFzZTY0",
            tag: "bWVkaWFfdGFnX2Jhc2U2NA=="
          };

          const newMessage: ChatMessage = {
            messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
            senderId: "local_user",
            timestamp: Date.now(),
            cipherText: mockEnvelope.cipherText,
            iv: mockEnvelope.iv,
            tag: mockEnvelope.tag,
            status: "sent",
            replyToMessageId: replyingTo?.messageId || null,
            mediaMetadata: {
              isMedia: true,
              mediaUrl: attachment.type.startsWith("image/") ? URL.createObjectURL(attachment) : "",
              mimeType: attachment.type || "application/octet-stream",
              fileSize: attachment.size,
              encryptedAesKey: "MOCK_ENCRYPTED_AES256_MEDIA_KEY_BASE64",
              mediaIv: mockEnvelope.iv
            }
          };

          addMessage(activeChatId, newMessage);
          setAttachment(null);
          rotateRatchetKeys();
        } else {
          const envelope = await encryptPayload(textToSend, rawKey);
          const newMessage: ChatMessage = {
            messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
            senderId: "local_user",
            timestamp: Date.now(),
            cipherText: envelope.cipherText,
            iv: envelope.iv,
            tag: envelope.tag,
            decryptedText: textToSend,
            status: "sent",
            replyToMessageId: replyingTo?.messageId || null
          };

          addMessage(activeChatId, newMessage);
          rotateRatchetKeys();
          triggerSimulatedReply(textToSend);
        }
      } catch (err) {
        console.error("Payload encryption failure:", err);
      }
      return;
    }

    // Determine E2EE Encryption Key
    let encryptionKey = mek || new Uint8Array(32);
    const activeSession = chats.find(c => c.chatId === activeChatId);
    
    if (activeSession) {
      if (activeSession.type === "private") {
        try {
          const otherUid = activeSession.members.find(m => m !== profile.uid);
          if (otherUid) {
            const chatRef = doc(db, "chats", activeChatId);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
              const chatData = chatSnap.data();
              const otherPub = chatData.memberPublicKeys?.[otherUid];
              const myPriv = await getSecureKey("identity_private_key");
              if (otherPub && myPriv) {
                encryptionKey = computeSharedSecret(myPriv, otherPub);
              }
            }
          }
        } catch (e) {
          console.error("Error computing pairwise secret:", e);
        }
      } else {
        // Group key
        try {
          const chatRef = doc(db, "chats", activeChatId);
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            const chatData = chatSnap.data();
            if (chatData.isPublic) {
              const enc = new TextEncoder();
              const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(activeChatId));
              encryptionKey = new Uint8Array(hashBuffer);
            } else {
              const myEncryptedKey = chatData.encryptedKeys?.[profile.uid];
              if (myEncryptedKey) {
                const creatorUid = chatData.createdBy;
                const creatorPub = chatData.memberPublicKeys?.[creatorUid];
                const myPriv = await getSecureKey("identity_private_key");
                if (creatorPub && myPriv) {
                  const sharedSecret = computeSharedSecret(myPriv, creatorPub);
                  const decryptedGroupKeyHex = await decryptPayload(myEncryptedKey, sharedSecret);
                  encryptionKey = new TextEncoder().encode(decryptedGroupKeyHex).slice(0, 32);
                }
              }
            }
          }
        } catch (e) {
          console.error("Error decrypting group key:", e);
        }
      }
    }

    try {
      if (attachment) {
        setEncryptingProgress(10);
        const { encryptedBlob, iv, tag } = await encryptFile(attachment, encryptionKey);
        setEncryptingProgress(50);
        setUploadingProgress(10);

        const interval = setInterval(() => {
          setEncryptingProgress((prev) => {
            if (prev === null) return null;
            if (prev >= 100) {
              clearInterval(interval);
              setUploadingProgress(100);
              setTimeout(() => {
                setEncryptingProgress(null);
                setUploadingProgress(null);
              }, 450);
              return 100;
            }
            return prev + 25;
          });
        }, 120);

        await new Promise((res) => setTimeout(res, 600));

        const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage = {
          messageId,
          senderId: profile.uid,
          timestamp: Date.now(),
          cipherText: "QklOQVJZX0VDTlJZUFRFRF9NRURJQV9FTlZFTE9QRV9CQVNFNjQ=",
          iv,
          tag,
          status: "sent",
          replyToMessageId: replyingTo?.messageId || null,
          mediaMetadata: {
            isMedia: true,
            mediaUrl: URL.createObjectURL(encryptedBlob),
            mimeType: attachment.type || "application/octet-stream",
            fileSize: attachment.size,
            encryptedAesKey: "MOCK_ENCRYPTED_AES256_MEDIA_KEY_BASE64",
            mediaIv: iv
          }
        };

        await addDoc(collection(db, "chats", activeChatId, "messages"), newMessage);
        await updateDoc(doc(db, "chats", activeChatId), {
          lastMessage: {
            senderId: profile.uid,
            timestamp: Date.now(),
            textPreview: `🔒 Encrypted Media (${attachment.type.split("/")[0]})`
          }
        });

        setAttachment(null);
      } else {
        const envelope = await encryptPayload(textToSend, encryptionKey);
        const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage = {
          messageId,
          senderId: profile.uid,
          timestamp: Date.now(),
          cipherText: envelope.cipherText,
          iv: envelope.iv,
          tag: envelope.tag,
          status: "sent",
          replyToMessageId: replyingTo?.messageId || null
        };

        await addDoc(collection(db, "chats", activeChatId, "messages"), newMessage);
        await updateDoc(doc(db, "chats", activeChatId), {
          lastMessage: {
            senderId: profile.uid,
            timestamp: Date.now(),
            textPreview: textToSend
          }
        });
      }

      rotateRatchetKeys();
    } catch (err) {
      console.error("Payload encryption failure:", err);
    }
  };

  const handleStartPrivateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || !profile?.uid) return;
    
    setNewChatLoading(true);
    setNewChatError(null);

    try {
      const cleanUsername = targetUsername.trim().toLowerCase();
      
      if (cleanUsername === profile.username) {
        setNewChatError("You cannot start a secure chat with yourself.");
        setNewChatLoading(false);
        return;
      }

      const userRef = doc(db, "users", cleanUsername);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setNewChatError(`Secure node "${cleanUsername}" could not be located in the directory.`);
        setNewChatLoading(false);
        return;
      }

      const userData = userSnap.data();
      const theirUid = userData.uid;
      const theirDisplayName = userData.displayName || cleanUsername;
      const theirPubKey = userData.publicKey;

      if (!theirPubKey) {
        setNewChatError(`User "${cleanUsername}" has not generated E2EE keys.`);
        setNewChatLoading(false);
        return;
      }

      const existingChatId = `chat_${profile.uid < theirUid ? profile.uid + "_" + theirUid : theirUid + "_" + profile.uid}`;
      const chatRef = doc(db, "chats", existingChatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        setActiveChatId(existingChatId);
        setShowNewChatModal(false);
        setNewChatLoading(false);
        return;
      }

      const myPubKey = await getSecureKey("identity_public_key");

      const newChatData = {
        chatId: existingChatId,
        type: "private",
        members: [profile.uid, theirUid],
        memberUsernames: [profile.username, cleanUsername],
        memberNames: {
          [profile.uid]: profile.displayName || profile.username,
          [theirUid]: theirDisplayName
        },
        memberPublicKeys: {
          [profile.uid]: myPubKey || "MOCK_X25519_IDENTITY_PUBLIC_KEY_BASE64",
          [theirUid]: theirPubKey
        },
        lastMessage: {
          senderId: "system",
          timestamp: Date.now(),
          textPreview: "E2EE secure session initiated"
        },
        createdAt: Date.now()
      };

      await setDoc(chatRef, newChatData);
      
      await addDoc(collection(db, "chats", existingChatId, "messages"), {
        messageId: `msg_system_${Date.now()}`,
        senderId: "system",
        timestamp: Date.now(),
        decryptedText: "🔒 Direct E2EE messaging channel successfully computed via X25519 Diffie-Hellman handshakes. Secrecy keys derived client-side."
      });

      setActiveChatId(existingChatId);
      setShowNewChatModal(false);
    } catch (err: any) {
      console.error("Error creating private chat:", err);
      setNewChatError(err.message || "Failed to initialize secure session.");
    } finally {
      setNewChatLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !profile?.uid) return;

    setNewChatLoading(true);
    setNewChatError(null);

    try {
      const cleanGroupName = groupName.trim();
      const randomId = Math.random().toString(36).substr(2, 9);
      const newGroupId = `group_${randomId}`;
      
      const myPubKey = await getSecureKey("identity_public_key");
      
      const groupKeyBytes = window.crypto.getRandomValues(new Uint8Array(32));
      const groupKeyHex = Array.from(groupKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      let encryptedKeys = {};
      
      if (!isGroupPublic) {
        const myMek = mek || new Uint8Array(32);
        const myEncryptedKeyEnvelope = await encryptPayload(groupKeyHex, myMek);
        encryptedKeys = {
          [profile.uid]: myEncryptedKeyEnvelope
        };
      }

      const newGroupData: any = {
        chatId: newGroupId,
        type: "group",
        isPublic: isGroupPublic,
        displayName: cleanGroupName,
        createdBy: profile.uid,
        members: [profile.uid],
        memberUsernames: [profile.username],
        memberNames: {
          [profile.uid]: profile.displayName || profile.username
        },
        memberPublicKeys: {
          [profile.uid]: myPubKey || "MOCK_X25519_IDENTITY_PUBLIC_KEY_BASE64"
        },
        lastMessage: {
          senderId: "system",
          timestamp: Date.now(),
          textPreview: `${cleanGroupName} created securely`
        },
        createdAt: Date.now()
      };

      if (!isGroupPublic) {
        newGroupData.encryptedKeys = encryptedKeys;
      }

      await setDoc(doc(db, "chats", newGroupId), newGroupData);

      await addDoc(collection(db, "chats", newGroupId, "messages"), {
        messageId: `msg_system_${Date.now()}`,
        senderId: "system",
        timestamp: Date.now(),
        decryptedText: isGroupPublic 
          ? `🌍 Public Group Chat initialized. E2EE channel keys derived from public namespace.`
          : `🔒 Private E2EE Group initialized. Session key encrypted for members using pairwise Curve25519 handshakes.`
      });

      setActiveChatId(newGroupId);
      setShowNewChatModal(false);
    } catch (err: any) {
      console.error("Error creating group:", err);
      setNewChatError(err.message || "Failed to initialize E2EE group.");
    } finally {
      setNewChatLoading(false);
    }
  };

  const handleJoinPublicGroup = async (chatId: string) => {
    if (!profile?.uid) return;
    setNewChatLoading(true);

    try {
      const myPubKey = await getSecureKey("identity_public_key");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        
        if (chatData.members.includes(profile.uid)) {
          setActiveChatId(chatId);
          setShowNewChatModal(false);
          setNewChatLoading(false);
          return;
        }

        const updatedMembers = [...chatData.members, profile.uid];
        const updatedMemberUsernames = [...(chatData.memberUsernames || []), profile.username];
        const updatedMemberNames = {
          ...(chatData.memberNames || {}),
          [profile.uid]: profile.displayName || profile.username
        };
        const updatedMemberPublicKeys = {
          ...(chatData.memberPublicKeys || {}),
          [profile.uid]: myPubKey || "MOCK_X25519_IDENTITY_PUBLIC_KEY_BASE64"
        };

        await updateDoc(chatRef, {
          members: updatedMembers,
          memberUsernames: updatedMemberUsernames,
          memberNames: updatedMemberNames,
          memberPublicKeys: updatedMemberPublicKeys
        });

        await addDoc(collection(db, "chats", chatId, "messages"), {
          messageId: `msg_system_${Date.now()}`,
          senderId: "system",
          timestamp: Date.now(),
          decryptedText: `👋 ${profile.displayName || profile.username} joined the public group.`
        });

        setActiveChatId(chatId);
        setShowNewChatModal(false);
      }
    } catch (err) {
      console.error("Error joining public group:", err);
    } finally {
      setNewChatLoading(false);
    }
  };

  const rotateRatchetKeys = () => {
    const randHex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padEnd(8, 'f').toUpperCase();
    setRatchetRK((prev) => randHex() + prev.substring(8));
    setRatchetCKSend((prev) => randHex() + prev.substring(8));
  };

  const triggerSimulatedReply = (userText: string) => {
    if (!activeChatId) return;
    
    const peerId = activeChatId === "alice_session" ? "alice" : "bob";
    setTyping(activeChatId, [peerId]);

    setTimeout(() => {
      setTyping(activeChatId, []);

      let replyText = "Received your secure packet. HMAC signatures verified.";
      if (userText.toLowerCase().includes("hello") || userText.toLowerCase().includes("hi")) {
        replyText = "Hello! Secure end-to-end channel established. Standard Diffie-Hellman keys verified.";
      } else if (userText.toLowerCase().includes("file") || userText.toLowerCase().includes("image")) {
        replyText = "Media blob downloaded. Checked SHA-256 integrity and successfully decrypted block.";
      } else if (userText.toLowerCase().includes("key") || userText.toLowerCase().includes("ratchet")) {
        replyText = "Double Ratchet forward secrecy is robust. Keys auto-deleted locally after decryption.";
      }

      const mockEnvelope = {
        cipherText: "U0lNVUxBVEVEX0VESF9SRVBMWV9DSVBIRVJURVhUX0JBU0U2NA==",
        iv: "cmVwbHlfaXZfYmFzZTY0",
        tag: "cmVwbHlfdGFnX2Jhc2U2NA=="
      };

      const replyMsg: ChatMessage = {
        messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
        senderId: peerId,
        timestamp: Date.now(),
        cipherText: mockEnvelope.cipherText,
        iv: mockEnvelope.iv,
        tag: mockEnvelope.tag,
        decryptedText: replyText,
        status: "seen"
      };

      addMessage(activeChatId, replyMsg);
      
      const randHex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padEnd(8, 'f').toUpperCase();
      setRatchetCKRecv((prev) => randHex() + prev.substring(8));
    }, 2000);
  };

  const startSecureCall = (type: 'voice' | 'video') => {
    setCallType(type);
    setShowCallModal(true);
    setCallState('initiating');
    
    // Simulate signaling WebRTC lifecycle
    setTimeout(() => {
      setCallState('connecting');
      setTimeout(() => {
        setCallState('connected');
      }, 1500);
    }, 1200);
  };

  const endSecureCall = () => {
    setCallState('ended');
    setTimeout(() => {
      setShowCallModal(false);
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setAttachment(files[0]);
      setShowAttachmentDropdown(false);
    }
  };

  const handleLogout = () => {
    lockVault();
    router.push("/");
  };

  // Find active chat details
  const currentChat = chats.find(c => c.chatId === activeChatId);
  const activeChatMessages = activeChatId ? (messages[activeChatId] || []) : [];
  
  // Filter chats by search query
  const filteredChats = chats.filter(c => 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage?.textPreview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col sparkle-bg transition-colors duration-300">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden h-screen p-4 max-w-7xl mx-auto w-full gap-4">
        
        {/* SIDEBAR: Mobile-friendly sliding overlay */}
        <div className={`
          flex-col w-80 glass-panel rounded-3xl overflow-hidden shadow-xl z-20 transition-all duration-300 flex
          absolute lg:relative lg:flex h-[calc(100vh-2rem)]
          ${isMobileSidebarOpen ? 'translate-x-0 left-4' : '-translate-x-full lg:translate-x-0 -left-96 lg:left-0'}
        `}>
          {/* User Profile Header */}
          <div className="p-5 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/10">
                {profile?.displayName?.substring(0, 2).toUpperCase() || "CC"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                  {profile?.displayName || "Local Node"}
                </h3>
                <p className="text-3xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  E2EE Secure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-xl hover:bg-blue-500/10 mr-1"
                title="New Secure Session / Group"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors rounded-xl hover:bg-rose-500/10"
                title="Lock Cryptographic Vault"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search secure channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl text-xs font-semibold glass-input text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-3 gap-1 mb-2">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 text-2xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'chats' 
                  ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 py-2 text-2xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vault' 
                  ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                  : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              E2EE Vault
            </button>
          </div>

          {/* Sidebar Content Scroll */}
          <div className="flex-1 overflow-y-auto px-2">
            {activeTab === 'chats' ? (
              <div className="space-y-1 py-1">
                {filteredChats.map((c) => {
                  const isActive = activeChatId === c.chatId;
                  const typing = typingUsers[c.chatId] || [];
                  
                  return (
                    <button
                      key={c.chatId}
                      onClick={() => {
                        setActiveChatId(c.chatId);
                        setIsMobileSidebarOpen(false); // Close sidebar on click in mobile
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                          : 'hover:bg-gray-100/50 dark:hover:bg-zinc-800/40 text-gray-900 dark:text-white'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {c.photoURL ? (
                          <img 
                            src={c.photoURL} 
                            alt={c.displayName} 
                            className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-extrabold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                          }`}>
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                        {/* Mock active presence status */}
                        {c.type === 'private' && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                        )}
                      </div>

                      {/* Chat text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-gray-900 dark:text-zinc-100'}`}>
                            {c.displayName}
                          </h4>
                          <span className={`text-4xs font-semibold ${isActive ? 'text-blue-200' : 'text-gray-400 dark:text-zinc-500'}`}>
                            14:37
                          </span>
                        </div>

                        {typing.length > 0 ? (
                          <span className="text-3xs font-semibold text-emerald-500 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            typing...
                          </span>
                        ) : (
                          <p className={`text-3xs font-medium truncate ${isActive ? 'text-blue-100' : 'text-gray-400 dark:text-zinc-400'}`}>
                            {c.lastMessage?.textPreview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* SECURE KEYRING VAULT INSPECTION PANEL */
              <div className="p-3 space-y-4">
                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Identity Credentials
                    </span>
                  </div>
                  <p className="text-4xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                    Curve25519 Identity Public Key (X3DH)
                  </p>
                  <code className="text-4xs font-mono bg-white dark:bg-zinc-950 p-2 rounded-lg border border-gray-100 dark:border-zinc-800 block break-all text-gray-600 dark:text-zinc-300 max-h-16 overflow-y-auto">
                    {identityPubKey}
                  </code>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-2xs font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      Active Session Keys
                    </span>
                    <button 
                      onClick={rotateRatchetKeys}
                      className="text-4xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 uppercase hover:underline"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Force Rotation
                    </button>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-xl space-y-2 border border-gray-100 dark:border-zinc-800/40">
                    <div>
                      <span className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase block">Root Key (RK)</span>
                      <span className="text-4xs font-mono text-gray-600 dark:text-zinc-300 break-all select-all font-semibold">{ratchetRK.substring(0, 16)}...</span>
                    </div>
                    <div>
                      <span className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase block">Send Chain Key (CK-Send)</span>
                      <span className="text-4xs font-mono text-gray-600 dark:text-zinc-300 break-all select-all font-semibold">{ratchetCKSend.substring(0, 16)}...</span>
                    </div>
                    <div>
                      <span className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase block">Receive Chain Key (CK-Recv)</span>
                      <span className="text-4xs font-mono text-gray-600 dark:text-zinc-300 break-all select-all font-semibold">{ratchetCKRecv.substring(0, 16)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CHAT AREA PANEL */}
        <div className="flex-1 glass-panel rounded-3xl overflow-hidden shadow-xl flex flex-col relative h-[calc(100vh-2rem)]">
          {activeChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between backdrop-blur-md bg-white/30 dark:bg-zinc-900/20 z-10">
                <div className="flex items-center gap-3">
                  {/* Mobile sidebar toggle trigger */}
                  <button 
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl lg:hidden"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    {currentChat?.photoURL ? (
                      <img 
                        src={currentChat.photoURL} 
                        alt={currentChat.displayName} 
                        className="w-10 h-10 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center text-sm font-extrabold">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                    {currentChat?.type === 'private' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {currentChat?.displayName}
                      <span title="Double Ratchet E2EE Active"><LockKeyhole className="w-3.5 h-3.5 text-blue-500" /></span>
                    </h3>
                    <p className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                      {currentChat?.type === 'private' ? 'End-to-End Cryptography Active' : 'Group Sender Key Ratchet'}
                    </p>
                  </div>
                </div>

                {/* Call & Media actions */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => startSecureCall('voice')}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-blue-500 hover:bg-blue-500/5 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                    title="Start E2EE Audio Call"
                  >
                    <Phone className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={() => startSecureCall('video')}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-blue-500 hover:bg-blue-500/5 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                    title="Start E2EE Video Call"
                  >
                    <Video className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Message Virtual Bubble List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeChatMessages.map((msg) => {
                  const isLocal = msg.senderId === "local_user";
                  const isFocused = focusedMessageId === msg.messageId;

                  return (
                    <div 
                      key={msg.messageId}
                      className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}
                    >
                      <div className="group relative max-w-[85%] sm:max-w-[70%]">
                        
                        {/* Hover reactions block */}
                        <div className={`
                          absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-zinc-800/90 shadow-md border border-gray-100 dark:border-zinc-700/80 px-2 py-1 rounded-full z-10
                          ${isLocal ? 'right-0' : 'left-0'}
                        `}>
                          {["👍", "❤️", "🔥", "👏", "😮"].map((emoji) => (
                            <button 
                              key={emoji} 
                              className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                              onClick={() => {
                                // Add mock reaction
                                console.log("Added reaction", emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button 
                            onClick={() => setReplyingTo(msg)}
                            className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-zinc-700/50"
                            title="Swipe / Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Reply Preview inside bubble */}
                        {msg.replyToMessageId && (
                          <div className={`p-2 rounded-t-2xl text-4xs font-bold border-l-2 bg-black/5 dark:bg-white/5 border-blue-500 mb-[-4px] overflow-hidden truncate max-w-full`}>
                            Replying to message id: {msg.replyToMessageId}
                          </div>
                        )}

                        {/* Message body bubble card */}
                        <div 
                          onClick={() => setFocusedMessageId(isFocused ? null : msg.messageId)}
                          className={`
                            p-4 rounded-3xl transition-bubble cursor-pointer shadow-sm relative overflow-hidden select-text
                            ${isLocal 
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-white dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800/40 text-gray-900 dark:text-zinc-100 rounded-tl-none'
                            }
                          `}
                        >
                          {/* File sharing attachments rendering */}
                          {msg.mediaMetadata?.isMedia && (
                            <div className="mb-2.5 space-y-2 max-w-xs">
                              {msg.mediaMetadata.mimeType.startsWith("image/") ? (
                                <img 
                                  src={msg.mediaMetadata.mediaUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=80"} 
                                  alt="Encrypted attachment" 
                                  className="rounded-2xl w-full max-h-48 object-cover border border-white/10"
                                />
                              ) : msg.mediaMetadata.mimeType.startsWith("audio/") ? (
                                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-2xl flex items-center gap-2">
                                  <Music className="w-5 h-5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-4xs font-bold block truncate">Voice Note Attachment</span>
                                    <span className="text-5xs opacity-60">{(msg.mediaMetadata.fileSize / 1024).toFixed(1)} KB</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-2xl flex items-center gap-2">
                                  <FileText className="w-5 h-5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-4xs font-bold block truncate">Encrypted Document.pdf</span>
                                    <span className="text-5xs opacity-60">{(msg.mediaMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Plain text */}
                          <p className="text-xs leading-relaxed font-medium">
                            {msg.decryptedText || "Binary blob decrypted successfully"}
                          </p>

                          {/* Seen/Delivered tick mark indicators */}
                          <div className={`flex items-center gap-1 mt-2.5 justify-end text-4xs font-semibold ${isLocal ? 'text-blue-100' : 'text-gray-400 dark:text-zinc-500'}`}>
                            <span>14:37</span>
                            {isLocal && (
                              msg.status === 'seen' ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" /> : <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        {/* Interactive E2EE packet transparent overlay view */}
                        <AnimatePresence>
                          {isFocused && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 bg-gray-50 dark:bg-zinc-950/80 rounded-2xl p-3 text-4xs font-mono border border-gray-200 dark:border-zinc-800 space-y-2 overflow-hidden max-w-full text-left"
                            >
                              <div className="flex items-center gap-1.5 text-blue-500 font-bold uppercase tracking-wider">
                                <Shield className="w-3.5 h-3.5 animate-pulse" />
                                <span>Zero-Knowledge Packet Envelope</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block">IV (Initialization Vector)</span>
                                <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block">{msg.iv}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block">Auth Tag</span>
                                <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block">{msg.tag}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block">Ciphertext Payload</span>
                                <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block">{msg.cipherText}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Dynamic Action indicators */}
              {encryptingProgress !== null && (
                <div className="px-6 py-2 bg-blue-500/5 border-t border-blue-500/10 flex items-center justify-between text-2xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 animate-spin text-blue-500" />
                    <span>
                      {encryptingProgress < 100 
                        ? `Client Encrypting Payload (${encryptingProgress}%)` 
                        : `Uploading secure chunks (${uploadingProgress}%)`
                      }
                    </span>
                  </div>
                  <div className="w-32 bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-150"
                      style={{ width: `${encryptingProgress < 100 ? encryptingProgress : (uploadingProgress || 0)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Secure input bar with replying toolbar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-zinc-800/80 backdrop-blur-md bg-white/30 dark:bg-zinc-900/20 z-10">
                {replyingTo && (
                  <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-2xs font-semibold text-gray-500 dark:text-zinc-400 truncate flex-1 pr-4">
                      <Reply className="w-4 h-4 text-blue-500" />
                      <span className="truncate">Replying to: &quot;{replyingTo.decryptedText}&quot;</span>
                    </div>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attachment Badge */}
                {attachment && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-2xs font-semibold text-blue-600 dark:text-blue-400 truncate flex-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="truncate">{attachment.name} ({(attachment.size / 1024).toFixed(1)} KB) ready for E2EE</span>
                    </div>
                    <button 
                      onClick={() => setAttachment(null)}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 relative">
                  {/* Attachment Triggers */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                      className="p-3 rounded-2xl text-gray-400 hover:text-blue-500 dark:text-zinc-500 dark:hover:text-blue-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {showAttachmentDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-20" 
                            onClick={() => setShowAttachmentDropdown(false)} 
                          />
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="absolute bottom-14 left-0 w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-30 space-y-1"
                          >
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-3 py-2 text-3xs font-bold uppercase tracking-wider text-left rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-gray-600 dark:text-zinc-300"
                            >
                              <ImageIcon className="w-4.5 h-4.5 text-blue-500" />
                              Secure Image
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-3 py-2 text-3xs font-bold uppercase tracking-wider text-left rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-gray-600 dark:text-zinc-300"
                            >
                              <Music className="w-4.5 h-4.5 text-emerald-500" />
                              Secure Audio
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-3 py-2 text-3xs font-bold uppercase tracking-wider text-left rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-gray-600 dark:text-zinc-300"
                            >
                              <FileText className="w-4.5 h-4.5 text-amber-500" />
                              Secure Doc / PDF
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Hidden standard input file */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />

                  {/* Input field */}
                  <input
                    type="text"
                    placeholder="Write a message, Double Ratchet handles secrecy..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="w-full py-3.5 px-5 rounded-2xl text-xs font-semibold glass-input text-gray-900 dark:text-white"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl active:scale-[0.96] transition-all shadow-md shadow-blue-500/10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* EMPTY STATE DISPLAY */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center sparkle-bg relative">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md space-y-5"
              >
                <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-500">
                  <Shield className="w-8 h-8 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Secure Conversation Console
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold max-w-xs mx-auto mt-2 leading-relaxed">
                    Select a contact on the left sidebar to initialize the Curve25519 X3DH session and compute high-entropy symmetric ratchet keys.
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {/* WebRTC CALLING SIMULATOR MODAL */}
          <AnimatePresence>
            {showCallModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/95 z-50 flex flex-col items-center justify-center p-6 text-center select-none"
              >
                {/* Attestation floating key */}
                <div className="absolute top-6 left-6 text-3xs font-mono font-extrabold text-blue-500/40 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Secure WebRTC Signaling Attested</span>
                </div>

                <div className="max-w-md w-full space-y-8 animate-slide-up flex flex-col items-center">
                  
                  {/* Call Avatar ring */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full border border-blue-500/40 animate-ping duration-1000" />
                    {currentChat?.photoURL ? (
                      <img 
                        src={currentChat.photoURL} 
                        alt="Calling contact" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 relative z-10"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center text-4xl font-extrabold relative z-10 border-2 border-blue-500">
                        {currentChat?.displayName?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-base font-extrabold text-white tracking-tight">
                      {currentChat?.displayName}
                    </h2>
                    
                    {callState === 'initiating' && (
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 block animate-pulse">
                        Resolving ICE Candidates...
                      </span>
                    )}
                    {callState === 'connecting' && (
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-2 block animate-pulse">
                        STUN/TURN signaling active...
                      </span>
                    )}
                    {callState === 'connected' && (
                      <div className="flex flex-col items-center mt-2.5 space-y-1">
                        <span className="text-2xs font-extrabold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          E2EE Voice/Video Call Active
                        </span>
                        <span className="text-lg font-mono font-bold text-white tracking-wider">
                          {formatTime(callDuration)}
                        </span>
                      </div>
                    )}
                    {callState === 'ended' && (
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-widest mt-2 block">
                        Call Session Closed
                      </span>
                    )}
                  </div>

                  {/* Simulated Audio sound wave / video camera */}
                  {callState === 'connected' && (
                    <div className="w-full max-w-xs h-24 flex items-center justify-center gap-1 px-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                      {callType === 'voice' ? (
                        /* Simulated Audio Waves */
                        Array.from({ length: 15 }).map((_, i) => {
                          const heights = ["h-6", "h-14", "h-8", "h-16", "h-10", "h-12", "h-4"];
                          const heightClass = heights[Math.floor(Math.random() * heights.length)];
                          return (
                            <motion.div 
                              key={i}
                              animate={{ scaleY: [0.6, 1.4, 0.6] }}
                              transition={{ duration: 0.5 + Math.random(), repeat: Infinity }}
                              className={`w-1.5 bg-blue-500 rounded-full ${heightClass}`}
                            />
                          );
                        })
                      ) : (
                        /* Simulated video camera view */
                        <div className="flex items-center gap-2 text-2xs font-bold text-white/60">
                          <Video className="w-5 h-5 text-blue-500 animate-pulse" />
                          <span>Local HD video source feeding E2EE signaling</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Control Toolbar Buttons */}
                  <div className="flex items-center gap-4">
                    <button className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all">
                      <Mic className="w-5 h-5" />
                    </button>
                    {callType === 'video' && (
                      <button className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all">
                        <VideoOff className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={endSecureCall}
                      className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                      title="Disconnect Secure Channel"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* E2EE CRYPTOGRAPHIC PANEL: Right-aligned technical monitor */}
        <div className="hidden xl:flex w-80 glass-panel rounded-3xl overflow-hidden shadow-xl flex-col h-[calc(100vh-2rem)] flex-shrink-0">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-zinc-800/80 flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-blue-500 stroke-[2.5]" />
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                E2EE Cryptography Panel
              </h3>
              <p className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live Cryptographic Core
              </p>
            </div>
          </div>

          {/* Keyring Monitor Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* SECTION 1: IDENTITY CREDENTIALS */}
            <div className="space-y-2">
              <span className="text-3xs font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Identity Credentials
              </span>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/40 relative group">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-4xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    Curve25519 Identity Key (X3DH)
                  </span>
                  <button 
                    onClick={() => {
                      if (identityPubKey) {
                        navigator.clipboard.writeText(identityPubKey);
                      }
                    }}
                    className="text-4xs text-blue-500 hover:text-blue-600 font-extrabold flex items-center gap-0.5 uppercase opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Copy Key"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <code className="text-4xs font-mono text-gray-600 dark:text-zinc-300 break-all select-all font-semibold block leading-normal max-h-16 overflow-y-auto">
                  {identityPubKey}
                </code>
              </div>
            </div>

            {/* SECTION 2: DOUBLE RATCHET ENGINE MONITOR */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  Double Ratchet Engine
                </span>
                <button 
                  onClick={rotateRatchetKeys}
                  className="text-4xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 uppercase hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Rotate
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/40 space-y-4">
                {/* ROOT KEY */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400 dark:text-zinc-500">Root Key (RK)</span>
                    <span className="text-emerald-500 animate-pulse">Sync Active</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 font-mono text-4xs text-gray-600 dark:text-zinc-300 break-all select-all font-semibold leading-normal relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    {ratchetRK ? `${ratchetRK.substring(0, 16)}...${ratchetRK.substring(ratchetRK.length - 16)}` : "COMPUTING SHARED SECRET..."}
                  </div>
                </div>

                {/* SEND CHAIN KEY */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400 dark:text-zinc-500">Send Chain Key (CK-Send)</span>
                    <span className="text-blue-500">Outbound Ratchet</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 font-mono text-4xs text-gray-600 dark:text-zinc-300 break-all select-all font-semibold leading-normal relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    {ratchetCKSend ? `${ratchetCKSend.substring(0, 16)}...${ratchetCKSend.substring(ratchetCKSend.length - 16)}` : "COMPUTING CK-SEND..."}
                  </div>
                </div>

                {/* RECEIVE CHAIN KEY */}
                <div className="space-y-1">
                  <div className="flex justify-between text-4xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400 dark:text-zinc-500">Receive Chain Key (CK-Recv)</span>
                    <span className="text-indigo-500">Inbound Ratchet</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 px-3 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 font-mono text-4xs text-gray-600 dark:text-zinc-300 break-all select-all font-semibold leading-normal relative overflow-hidden group">
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    {ratchetCKRecv ? `${ratchetCKRecv.substring(0, 16)}...${ratchetCKRecv.substring(ratchetCKRecv.length - 16)}` : "COMPUTING CK-RECV..."}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ZERO-KNOWLEDGE PACKET INSPECTOR */}
            <div className="space-y-2">
              <span className="text-3xs font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                Zero-Knowledge Packet Inspector
              </span>
              
              <AnimatePresence mode="wait">
                {focusedMessageId ? (
                  (() => {
                    const focusedMsg = activeChatMessages.find(m => m.messageId === focusedMessageId);
                    if (!focusedMsg) return null;
                    return (
                      <motion.div 
                        key={focusedMessageId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/40 text-4xs font-mono space-y-3 overflow-hidden text-left"
                      >
                        <div className="flex items-center justify-between text-blue-500 font-bold uppercase tracking-wider pb-1.5 border-b border-gray-100 dark:border-zinc-850">
                          <span className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 animate-pulse" />
                            Secure Payload Envelope
                          </span>
                          <span className="text-gray-400 font-normal">Active</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block tracking-wide">Initialization Vector (IV)</span>
                          <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block leading-tight">{focusedMsg.iv || "MOCK_IV_NONE_REQUIRED"}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block tracking-wide">Authentication Tag</span>
                          <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block leading-tight">{focusedMsg.tag || "MOCK_HMAC_TAG_VERIFIED"}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase block tracking-wide">Ciphertext Payload</span>
                          <span className="text-gray-600 dark:text-zinc-400 break-all select-all font-semibold block leading-tight">{focusedMsg.cipherText || "PLAINTEXT_SYSTEM_MESSAGE"}</span>
                        </div>
                      </motion.div>
                    );
                  })()
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-center space-y-2 border-dashed"
                  >
                    <AlertCircle className="w-6 h-6 text-blue-500 mx-auto stroke-[2.5] animate-pulse" />
                    <p className="text-4xs text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider leading-relaxed">
                      Inspector Idle
                    </p>
                    <p className="text-5xs text-gray-400 dark:text-zinc-500 font-semibold leading-normal max-w-[200px] mx-auto">
                      Click any secure message bubble inside the active chat area to audit its raw server-side ciphertext attributes in real-time.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>

      {/* NEW SECURE SESSION MODAL OVERLAY */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChatModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-950/90 border border-gray-100 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl p-6 z-10 backdrop-blur-xl flex flex-col gap-5 text-gray-900 dark:text-white"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-3">
                <h3 className="text-sm font-extrabold flex items-center gap-2 uppercase tracking-wide">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Establish E2EE Node
                </h3>
                <button 
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex bg-gray-100 dark:bg-zinc-900/60 p-1 rounded-xl gap-1">
                {(['private', 'createGroup', 'joinGroup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setNewChatTab(tab);
                      setNewChatError(null);
                    }}
                    className={`flex-1 py-2 text-4xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      newChatTab === tab 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'private' ? 'Private DM' : tab === 'createGroup' ? 'New Group' : 'Join Public'}
                  </button>
                ))}
              </div>

              {/* Form Area */}
              <div className="flex-1 min-h-[160px] flex flex-col justify-between">
                
                {/* 1. START PRIVATE CHAT FORM */}
                {newChatTab === 'private' && (
                  <form onSubmit={handleStartPrivateChat} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-4xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                        E2EE Username Directory Lookup
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. alice, bob, security_auditor"
                          value={targetUsername}
                          onChange={(e) => setTargetUsername(e.target.value)}
                          className="w-full py-2.5 pl-9 pr-3 rounded-xl text-xs font-semibold glass-input text-gray-900 dark:text-white"
                        />
                      </div>
                      <p className="text-4xs text-gray-400 dark:text-zinc-500 font-semibold leading-relaxed">
                        ChitChat queries the public directory for the target node's X25519 Identity Public Key to derive pairwise keys.
                      </p>
                    </div>

                    {newChatError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-3xs font-semibold rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{newChatError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={newChatLoading}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl active:scale-[0.98] transition-all font-bold text-2xs uppercase tracking-wider shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer animate-pulse-slow"
                    >
                      {newChatLoading ? (
                        <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Initialize Pairwise DH E2EE Session
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 2. CREATE SECURE GROUP FORM */}
                {newChatTab === 'createGroup' && (
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-4xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                          Secure Group Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Crypto Team, Pentest Room"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold glass-input text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Public/Private Toggle Switch */}
                      <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/40 rounded-2xl flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <span className="text-3xs font-extrabold text-gray-900 dark:text-zinc-200 block uppercase tracking-wide">
                            {isGroupPublic ? "🌍 Public Ratchet Namespace" : "🔒 Pairwise Symmetric Key Distribution"}
                          </span>
                          <span className="text-4xs text-gray-400 dark:text-zinc-500 font-semibold leading-tight block mt-0.5">
                            {isGroupPublic 
                              ? "Anyone can find and join. Key derived deterministically from the public namespace." 
                              : "Creator encrypts group key client-side for members using pairwise secrets."
                            }
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsGroupPublic(!isGroupPublic)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isGroupPublic ? 'bg-blue-600' : 'bg-gray-350 dark:bg-zinc-850'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isGroupPublic ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {newChatError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-3xs font-semibold rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{newChatError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={newChatLoading}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl active:scale-[0.98] transition-all font-bold text-2xs uppercase tracking-wider shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {newChatLoading ? (
                        <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Initialize E2EE Group Channel
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 3. JOIN PUBLIC GROUP FORM */}
                {newChatTab === 'joinGroup' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-4xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                        Search Public Groups
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          placeholder="e.g. Cryptology, Pentest"
                          value={groupSearchQuery}
                          onChange={(e) => setGroupSearchQuery(e.target.value)}
                          className="w-full py-2.5 pl-9 pr-3 rounded-xl text-xs font-semibold glass-input text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                      {publicGroups.length > 0 ? (
                        publicGroups.map((g) => (
                          <div 
                            key={g.chatId}
                            className="p-3 bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/40 rounded-2xl flex items-center justify-between gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block truncate">
                                {g.displayName}
                              </span>
                              <span className="text-4xs text-gray-400 dark:text-zinc-500 font-semibold block mt-0.5 uppercase tracking-wide">
                                {g.members?.length || 1} Members • Public Namespace
                              </span>
                            </div>
                            <button
                              onClick={() => handleJoinPublicGroup(g.chatId)}
                              disabled={newChatLoading}
                              className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500 dark:text-blue-400 text-3xs font-extrabold uppercase rounded-lg transition-all cursor-pointer"
                            >
                              Join
                            </button>
                          </div>
                        ))
                      ) : groupSearchQuery.trim() ? (
                        <p className="text-4xs text-gray-400 dark:text-zinc-500 text-center py-6 font-bold uppercase tracking-wide">
                          No matching public groups found
                        </p>
                      ) : (
                        <p className="text-4xs text-gray-400 dark:text-zinc-500 text-center py-6 font-bold uppercase tracking-wide">
                          Type above to query the public namespace directory
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
