import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { CustomText } from '../../../components';
import { Metrix, Utills, Images } from '../../../config';
import { ChatProps } from '../../propTypes';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  isMe: boolean;
}

interface ChatContact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
}

export const Chat: React.FC<ChatProps> = ({ }) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'messages'>('contacts');
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      lastMessage: 'Are you safe?',
      timestamp: new Date(),
      unreadCount: 2,
    },
    {
      id: '2',
      name: 'Mike Wilson',
      lastMessage: 'Checking in on you',
      timestamp: new Date(Date.now() - 3600000),
      unreadCount: 0,
    },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = useCallback(() => {
    if (messageText.trim() && selectedContact) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'me',
        senderName: 'Me',
        message: messageText.trim(),
        timestamp: new Date(),
        isMe: true,
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
    }
  }, [messageText, selectedContact]);

  const renderContactItem = ({ item }: { item: ChatContact }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => {
        setSelectedContact(item);
        setActiveTab('messages');
      }}
    >
      <View style={styles.contactAvatar}>
        <CustomText.RegularText customStyle={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </CustomText.RegularText>
      </View>
      <View style={styles.contactInfo}>
        <CustomText.MediumText customStyle={styles.contactName}>
          {item.name}
        </CustomText.MediumText>
        <CustomText.SmallText customStyle={styles.lastMessage}>
          {item.lastMessage}
        </CustomText.SmallText>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <CustomText.SmallText customStyle={styles.unreadText}>
            {item.unreadCount}
          </CustomText.SmallText>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageItem,
      item.isMe ? styles.myMessage : styles.theirMessage
    ]}>
      <CustomText.RegularText customStyle={[
        styles.messageText,
        item.isMe ? styles.myMessageText : styles.theirMessageText
      ]}>
        {item.message}
      </CustomText.RegularText>
      <CustomText.SmallText customStyle={styles.messageTime}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </CustomText.SmallText>
    </View>
  );

  if (activeTab === 'messages' && selectedContact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('contacts');
              setSelectedContact(null);
            }}
          >
            <CustomText.RegularText customStyle={styles.backButton}>
              ← Back
            </CustomText.RegularText>
          </TouchableOpacity>
          <CustomText.MediumText customStyle={styles.headerTitle}>
            {selectedContact.name}
          </CustomText.MediumText>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={Utills.selectedThemeColors().SecondaryTextColor}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <CustomText.RegularText customStyle={styles.sendButtonText}>
              Send
            </CustomText.RegularText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <CustomText.LargeBoldText customStyle={styles.headerTitle}>
          Messages
        </CustomText.LargeBoldText>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        style={styles.contactsList}
        contentContainerStyle={styles.contactsContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Utills.selectedThemeColors().Base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(15),
    borderBottomWidth: 1,
    borderBottomColor: Utills.selectedThemeColors().Base,
  },
  headerTitle: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(20),
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(16),
  },
  contactsList: {
    flex: 1,
  },
  contactsContent: {
    paddingVertical: Metrix.VerticalSize(10),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(15),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactAvatar: {
    width: Metrix.HorizontalSize(50),
    height: Metrix.VerticalSize(50),
    borderRadius: Metrix.HorizontalSize(25),
    backgroundColor: Utills.selectedThemeColors().Yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Metrix.HorizontalSize(15),
  },
  avatarText: {
    color: Utills.selectedThemeColors().Base,
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(16),
    marginBottom: Metrix.VerticalSize(5),
  },
  lastMessage: {
    color: Utills.selectedThemeColors().SecondaryTextColor,
    fontSize: Metrix.customFontSize(14),
  },
  unreadBadge: {
    backgroundColor: Utills.selectedThemeColors().Red,
    borderRadius: Metrix.HorizontalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(8),
    paddingVertical: Metrix.VerticalSize(4),
    minWidth: Metrix.HorizontalSize(20),
    alignItems: 'center',
  },
  unreadText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(12),
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Metrix.VerticalSize(10),
  },
  messageItem: {
    marginHorizontal: Metrix.HorizontalSize(20),
    marginVertical: Metrix.VerticalSize(5),
    maxWidth: '80%',
    padding: Metrix.HorizontalSize(12),
    borderRadius: Metrix.HorizontalSize(12),
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Utills.selectedThemeColors().Yellow,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: Metrix.customFontSize(16),
    marginBottom: Metrix.VerticalSize(5),
  },
  myMessageText: {
    color: Utills.selectedThemeColors().Base,
  },
  theirMessageText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  messageTime: {
    fontSize: Metrix.customFontSize(12),
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(15),
    borderTopWidth: 1,
    borderTopColor: Utills.selectedThemeColors().Base,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Utills.selectedThemeColors().Base,
    borderRadius: Metrix.HorizontalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(15),
    paddingVertical: Metrix.VerticalSize(10),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(16),
    maxHeight: Metrix.VerticalSize(100),
    marginRight: Metrix.HorizontalSize(10),
  },
  sendButton: {
    backgroundColor: Utills.selectedThemeColors().Yellow,
    paddingHorizontal: Metrix.HorizontalSize(20),
    paddingVertical: Metrix.VerticalSize(10),
    borderRadius: Metrix.HorizontalSize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: Utills.selectedThemeColors().Base,
    fontSize: Metrix.customFontSize(16),
    fontWeight: '600',
  },
});