import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Keyboard,
} from 'react-native';
import { Camera, Mic, Send, Plus, X, Check } from 'lucide-react-native';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';

interface Message {
  id: string;
  text: string;
  image?: string;
  timestamp: string;
  isBot: boolean;
  type?: 'info' | 'bot' | 'user';
}

interface ChatBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  showInitialSheet?: boolean;
  onInitialConfirm?: () => void;
}

export default function ChatBottomSheet({ isVisible, onClose, showInitialSheet = true, onInitialConfirm }: ChatBottomSheetProps) {
  const [internalShowInitialSheet, setInternalShowInitialSheet] = useState(false);
  const [showChatSheet, setShowChatSheet] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hideTextInput, setHideTextInput] = useState(false);

  const initialBottomSheetRef = useRef<BottomSheet>(null);
  const chatBottomSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  const initialSnapPoints = useMemo(() => ['25%'], []);
  const chatSnapPoints = useMemo(() => ['85%'], []);

  useEffect(() => {
    // Only set initial sheet to true if we explicitly want to show it AND it's visible
    if (isVisible && showInitialSheet) {
      setInternalShowInitialSheet(true);
      setShowChatSheet(false);
    } else if (isVisible && !showInitialSheet) {
      // Only show chat sheet if we're NOT showing the initial sheet
      setInternalShowInitialSheet(false);
      setShowChatSheet(true);
    } else {
      // When not visible, close everything
      setInternalShowInitialSheet(false);
      setShowChatSheet(false);
    }
  }, [isVisible, showInitialSheet]);

  useEffect(() => {
    if (showChatSheet && messages.length === 0) {
      // Add initial bot message when chat opens
      const initialMessage: Message = {
        id: '1',
        text: 'Your community update is anonymous. Only moderators can view it. False reports of serious events may be reviewed and escalated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isBot: true,
      };
      setMessages([initialMessage]);
      
      // Focus text input when chat opens
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
    }
  }, [showChatSheet]);

  // Dismiss keyboard when bottom sheet visibility changes
  useEffect(() => {
    if (!isVisible) {
      Keyboard.dismiss();
    }
  }, [isVisible]);

  const handleInitialSheetClose = useCallback(() => {
    setInternalShowInitialSheet(false);
    onClose();
  }, [onClose]);

  const handleCheckPress = useCallback(() => {
    setInternalShowInitialSheet(false);
    setTimeout(() => {
      setShowChatSheet(true);
    }, 300);
  }, []);

  const handleChatSheetClose = useCallback(() => {
    Keyboard.dismiss();
    setShowChatSheet(false);
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
    setHideTextInput(false);
    setInternalShowInitialSheet(true);
    onClose();
  }, [onClose]);

  // Enhanced permission handling for both platforms
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    // For iOS, permissions are handled automatically by react-native-image-picker
    return true;
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  // Open camera
  const openCamera = async () => {
    const hasPermission = await requestPermissions();

    if (!hasPermission && Platform.OS === 'android') {
      Alert.alert('Permission required', 'Camera permission is required to take photos.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        if (response.errorMessage && response.errorMessage !== 'User cancelled image selection') {
          console.log('Camera Error:', response.errorMessage);
          Alert.alert('Error', 'Failed to open camera. Please try again.');
        }
        return;
      }

      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0].uri || null);
      }
    });
  };

  // Open gallery
  const openGallery = async () => {
    const hasPermission = await requestPermissions();

    if (!hasPermission && Platform.OS === 'android') {
      Alert.alert('Permission required', 'Storage permission is required to access photos.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        if (response.errorMessage && response.errorMessage !== 'User cancelled image selection') {
          console.log('Gallery Error:', response.errorMessage);
          Alert.alert('Error', 'Failed to open gallery. Please try again.');
        }
        return;
      }

      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0].uri || null);
      }
    });
  };

  // 100 character minimum requirement with alert
  const sendMessage = () => {
    // Check if there's no content at all
    if (!inputText.trim() && !selectedImage) return;

    // Check if text is less than 100 characters (only check text, images can be sent without text)
    if (inputText.trim().length > 0 && inputText.trim().length < 100) {
      Alert.alert(
        'Message too short',
        'You need 100 characters minimum to send a message.',
        [{ text: 'OK' }],
        { cancelable: true }
      );
      return;
    }

    // Allow sending if: 
    // 1. Text is 100+ characters, OR
    // 2. Just an image with no text, OR  
    // 3. Text is 100+ characters AND an image
    if ((inputText.trim().length >= 100) || (selectedImage && inputText.trim().length === 0)) {
      // Dismiss keyboard and blur text input
      Keyboard.dismiss();
      textInputRef.current?.blur();

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        image: selectedImage || undefined,
        timestamp,
        isBot: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setSelectedImage(null);

      // Auto-reply from bot
      setTimeout(() => {
        const botReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Most people keep their heads down. You gave a heads up. Your alert will be shared with the community and can be seen on the Safe Zones map. Nice one. 🙌',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBot: true,
        };
        setMessages(prev => [...prev, botReply]);
        
        // Hide text input after this specific bot message
        setHideTextInput(true);
      }, 1000);
    }
  };

  const renderMessage = (message: Message) => {
    if (message.type === 'info') {
      return (
        <View key={message.id} style={styles.infoMessageContainer}>
          <Text style={styles.infoMessageText}>{message.text}</Text>
        </View>
      );
    }

    const isBot = message.isBot;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isBot ? styles.botBubble : styles.userBubble,
          ]}
        >
          {message.image && (
            <Image source={{ uri: message.image }} style={styles.messageImage} />
          )}
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {message.text}
          </Text>
          <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
            {message.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Initial Bottom Sheet */}
      <BottomSheet
        ref={initialBottomSheetRef}
        snapPoints={initialSnapPoints}
        enablePanDownToClose
        onClose={handleInitialSheetClose}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        // index={internalShowInitialSheet ? 0 : -1}
      >
        <BottomSheetView style={styles.initialSheetContent}>
          <Text style={styles.initialSheetTitle}>Report an incident?</Text>
          <Text style={styles.initialSheetSubtitle}>
            Help keep your community safe by reporting what you see
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleInitialSheetClose}
            >
              <X size={24} color="#666" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleCheckPress}
            >
              <Check size={24} color="#fff" />
              <Text style={styles.confirmButtonText}>Report</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Chat Bottom Sheet */}
      <BottomSheet
        ref={chatBottomSheetRef}
        snapPoints={chatSnapPoints}
        enablePanDownToClose
        onClose={handleChatSheetClose}
        backgroundStyle={styles.chatBottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="extend"
        android_keyboardInputMode="adjustResize"
        index={showChatSheet ? 0 : -1}
      >
        <BottomSheetView style={styles.chatContainer}>
          <View style={styles.chatGradient}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderTitle}>Short description</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map(renderMessage)}
            </ScrollView>

            {/* Input Area */}
            {!hideTextInput && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              >
                <View style={styles.inputContainer}>
                  {selectedImage && (
                    <View style={styles.selectedImageContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setSelectedImage(null)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.inputRow}>
                    <TouchableOpacity style={styles.inputActionButton}>
                      <Plus size={24} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.textInputContainer}>
                      <BottomSheetTextInput
                        ref={textInputRef}
                        style={styles.textInput}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                        blurOnSubmit={false}
                      />
                      {/* Character counter */}
                      <Text style={styles.characterCounter}>
                        {inputText.length}/100
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.inputActionButton} 
                      onPress={showImagePickerOptions}
                    >
                      <Camera size={24} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.inputActionButton}>
                      <Mic size={24} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        // Show active state if: 100+ chars OR (image with no text) OR (image with 100+ chars)
                        ((inputText.trim().length >= 100) || (selectedImage && inputText.trim().length === 0)) && styles.sendButtonActive
                      ]}
                      onPress={sendMessage}
                    >
                      <Send size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatBottomSheetBackground: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
  },
  initialSheetContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  initialSheetTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  initialSheetSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4ade80',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  chatContainer: {
    flex: 1,
  },
  chatGradient: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  chatHeaderTitle: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-start',
  },
  botMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 16,
  },
  userBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
  },
  botBubble: {
    backgroundColor: '#4ade80',
    borderBottomRightRadius: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },
  infoMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    maxWidth: '85%',
  },
  infoMessageText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  userText: {
    color: '#000',
  },
  botText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  userTimestamp: {
    color: '#666',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#000',
    opacity: 0.7,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  inputContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputActionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
    fontFamily: 'Inter-Regular',
    paddingRight: 50, // Make space for character counter
  },
  characterCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 12,
    color: '#999',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sendButton: {
    backgroundColor: '#ccc',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4ade80',
  },
});