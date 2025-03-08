import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from 'firebase/messaging';
import axios from 'axios';

// Firebase設定
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Google App Script ウェブアプリのURL
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// FCMトークン取得とサーバー保存用関数
const requestNotificationPermissionAndSaveToken = async (userId) => {
  try {
    // 通知許可をリクエスト
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // FCMトークンを取得
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // プロジェクト設定のクラウドメッセージングからVapid Keyを取得
      });
      
      // ユーザーIDとトークンをFirestoreに保存
      await setDoc(doc(db, 'fcmTokens', userId), {
        token,
        updatedAt: serverTimestamp()
      });
      
      console.log('FCM token saved:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// 通知を受信するためのリスナー設定
const setupNotificationListener = () => {
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    
    // ブラウザ通知を表示
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/favicon.ico'
    };
    
    new Notification(notificationTitle, notificationOptions);
  });
};

// メッセージ送信機能を持つコンポーネント
function MessageForm({ currentUserId, targetUserId }) {
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    // コンポーネントマウント時にFCMトークンを取得・保存
    requestNotificationPermissionAndSaveToken(currentUserId);
    setupNotificationListener();
  }, [currentUserId]);
  
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      // メッセージをFirestoreに保存
      const messageData = {
        text: message,
        senderId: currentUserId,
        receiverId: targetUserId,
        read: false,
        createdAt: serverTimestamp()
      };
      
      // messagesコレクションに新しいドキュメントを追加
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      const messageId = docRef.id;
      
      // Google App Scriptにリクエストを送信して通知を処理
      await triggerNotification(messageId, currentUserId, targetUserId, message);
      
      console.log('Message sent and notification triggered');
      
      // 入力フィールドをクリア
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Google App Scriptに通知リクエストを送信
  const triggerNotification = async (messageId, senderId, receiverId, messageText) => {
    try {
      const response = await axios.post(GAS_WEBAPP_URL, {
        action: 'sendNotification',
        messageId,
        senderId,
        receiverId,
        messageText
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('GAS notification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error triggering notification via GAS:', error);
      throw error;
    }
  };
  
  return (
    <form onSubmit={sendMessage}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="メッセージを入力..."
      />
      <button type="submit">送信</button>
    </form>
  );
}

export default MessageForm;