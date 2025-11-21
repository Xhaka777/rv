import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Keyboard, Alert, ActivityIndicator, ImageBackground, Image, AppState } from 'react-native';
import { Camera, Mic, X } from 'lucide-react-native';
import ImagePicker from 'react-native-image-crop-picker';
import Voice from '@react-native-voice/voice';
import { useDispatch, useSelector } from 'react-redux';
import { HomeActions } from '../../../redux/actions';
import _ from 'lodash';
import { Images, Metrix } from '../../../config';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profanity, CensorType } from '@2toad/profanity';
import { RootState } from '../../../redux/reducers';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type HomeParamList = {
  ThreatReportScreen: {
    onComplete: (additionalDetails: string, image?: string) => void;
    selectedThreat?: { id: number, icon: any, label: string, message: string } | null;
    shouldAutoFocus?: boolean;
    capturedPhoto?: string | null;
  };
};

type ThreatReportScreenProps = {
  navigation: StackNavigationProp<HomeParamList, 'ThreatReportScreen'>;
  route: RouteProp<HomeParamList, 'ThreatReportScreen'>;
};

interface Message {
  id: string;
  text: string;
  image?: string;
  timestamp: string;
  isBot: boolean;
  type?: 'info' | 'bot' | 'user';
}

const ThreatReportScreen: React.FC<ThreatReportScreenProps> = ({ route, navigation }) => {
  // Get parameters from route
  const { onComplete, selectedThreat, shouldAutoFocus = false, capturedPhoto } = route.params;

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const currentSafeWord = useSelector((state: RootState) => state.home.safeWord?.safeWord);

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hideTextInput, setHideTextInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessLoader, setShowSuccessLoader] = useState(false);
  const [isTypingManually, setIsTypingManually] = useState(false);
  const [isTextInputFocused, setIsTextInputFocused] = useState(false);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  const filterProfanityText = (text: string): { cleaned: string; wasFiltered: boolean } => {
    try {
      console.log('🛡️ Filtering text with @2toad/profanity:', text);

      const hasProfanity = profanity.exists(text);

      if (hasProfanity) {
        const cleanedText = profanity.censor(text, CensorType.FirstChar);
        console.log('🛡️ Profanity detected and filtered:', {
          original: text,
          cleaned: cleanedText,
          hasProfanity: true
        });
        return { cleaned: cleanedText, wasFiltered: true }
      } else {
        console.log('Text is clean, no profanity detected');
        return { cleaned: text, wasFiltered: false }
      }
    } catch (error) {
      console.error('Error in profanity filter: ', error);
      return { cleaned: text, wasFiltered: false }
    }
  }

  const countCharacters = (text: string): number => {
    return text.trim().length;
  }

  // AppState monitoring
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changing from', appState, 'to', nextAppState);
      setAppState(nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App going to background - stopping voice recognition');
        if (isListening) {
          await stopListening();
        }
      } else if (nextAppState === 'active' && appState !== 'active') {
        console.log('App becoming active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isListening]);

  useEffect(() => {
    console.log('🚀 ThreatReportScreen: Setting current screen and pausing TabStack mic');
    dispatch(HomeActions.setCurrentScreen('ThreatReportScreen'));

    return () => {
      console.log('🧹 ThreatReportScreen: Restoring TabStack mic functionality');
      dispatch(HomeActions.setCurrentScreen('TabStack'));
    };
  }, [dispatch]);

  // Pause safe word detection when component mounts and resume when unmounts
  useEffect(() => {
    console.log('🚀 ThreatReportScreen: Component mounting - pausing safe word detection');
    dispatch(HomeActions.setSafeWord({ isSafeWord: false, safeWord: currentSafeWord }));

    return () => {
      console.log('🧹 ThreatReportScreen: Component unmounting - resuming safe word detection');
      dispatch(HomeActions.setSafeWord({ isSafeWord: true, safeWord: currentSafeWord }));

      Voice.stop().catch(() => { });
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
        console.log('✅ ThreatReportScreen: Voice destroyed and listeners removed');
      });
    };
  }, [dispatch, currentSafeWord]);

  useEffect(() => {
    console.log('🔄 ThreatReportScreen: Initializing messages');
    setMessages([]);

    const getInitialMessage = () => {
      if (selectedThreat?.message) {
        return selectedThreat.message;
      }
      return 'Your community update is anonymous. Only moderators can view it.';
    }

    const initialMessage: Message = {
      id: '1',
      text: getInitialMessage(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isBot: true,
      type: 'info'
    };

    const timer = setTimeout(() => {
      console.log('✅ ThreatReportScreen: Setting initial message');
      const messagesToSet = [initialMessage];

      if (capturedPhoto) {
        console.log('📸 Adding captured photo to messages:', capturedPhoto);
        const photoMessage: Message = {
          id: '2',
          text: '',
          image: capturedPhoto,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBot: false,
        };
        messagesToSet.push(photoMessage);
      }

      setMessages(messagesToSet);
    }, 100);

    return () => clearTimeout(timer);
  }, [capturedPhoto]);

  // Voice Recognition Setup
  useEffect(() => {
    console.log('🎤 Setting up Voice Recognition...');

    const initializeVoice = async () => {
      try {
        await Voice.destroy();
        Voice.removeAllListeners();
        console.log('🧹 Cleaned up existing voice instance before setup');
      } catch (error) {
        console.log('No existing voice instance to clean up');
      }

      const onSpeechStart = (e) => {
        console.log('🎤 onSpeechStart triggered:', e);
        lastSpeechTimeRef.current = Date.now();
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
      };

      const onSpeechRecognized = (e) => {
        console.log('🎤 onSpeechRecognized triggered:', e);
        lastSpeechTimeRef.current = Date.now();
      };

      const onSpeechEnd = (e) => {
        console.log('🎤 onSpeechEnd triggered:', e);
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setIsListening(false);
      };

      const onSpeechResults = async (e) => {
        console.log('🎤 onSpeechResults triggered with full event:', JSON.stringify(e, null, 2));
        lastSpeechTimeRef.current = Date.now();

        if (e.value && e.value.length > 0) {
          const recognizedText = e.value[0];
          console.log('📝 Recognized text:', `"${recognizedText}"`);

          const { cleaned: filteredText, wasFiltered } = filterProfanityText(recognizedText);
          console.log('🛡️ @2toad filtered text result:', `"${filteredText}"`);

          if (wasFiltered) {
            console.log('⚠️ Speech contained profanity and was automatically filtered');
          }

          setInputText(filteredText);
          setIsTypingManually(false);

          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
          }

          voiceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Auto-stopping after 2 seconds of silence');
            stopListening();
          }, 2000);
        }
      };

      const onSpeechError = (e) => {
        console.error('❌ onSpeechError triggered:', e);
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setIsListening(false);

        if (e.error?.message !== 'No speech input' && e.error?.code !== '7') {
          Alert.alert('Voice Recognition Error', `Failed to recognize speech: ${e.error?.message || 'Unknown error'}. Please try again.`);
        }
      };

      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechRecognized = onSpeechRecognized;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      console.log('✅ All voice event listeners attached successfully');
    };

    initializeVoice();

    return () => {
      console.log('🧹 Voice Recognition useEffect cleanup...');
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      Voice.stop().catch(() => { });
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
        console.log('✅ Voice destroyed and listeners removed in useEffect cleanup');
      });
    };
  }, []);

  const startListening = async () => {
    try {
      console.log('🎤 Starting voice recognition...');

      if (isListening) {
        console.log('⚠️ Already listening, stopping first...');
        await stopListening();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      try {
        await Voice.stop();
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.log('No existing recognition to stop');
      }

      setInputText('');
      console.log('📝 Cleared input text for new voice recognition');

      const isAvailable = await Voice.isAvailable();
      console.log('🎤 Voice recognition available:', isAvailable);

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        console.log('🛑 Stopping existing recognition first...');
        await Voice.stop();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await Voice.start('en-US', {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: true,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      });

      setIsListening(true);
      lastSpeechTimeRef.current = Date.now();

      voiceTimeoutRef.current = setTimeout(() => {
        console.log('🛑 Maximum listening time reached (30s)');
        stopListening();
      }, 30000);

    } catch (e) {
      console.error('❌ Voice.start error:', e);
      setIsListening(false);
      Alert.alert('Voice Recognition Error', `Failed to start voice recognition: ${e.message || 'Unknown error'}. Please try again.`);
    }
  };

  const stopListening = async () => {
    try {
      console.log('🔇 Stopping voice recognition...');

      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }

      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }

      setIsListening(false);
    } catch (e) {
      console.error('❌ Voice.stop error:', e);
      setIsListening(false);
    }
  };

  const handleMicPress = () => {
    console.log('🎤 Mic button pressed');
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClose = useCallback(() => {
    console.log('🚪 handleClose called');
    Keyboard.dismiss();

    const cleanupVoice = async () => {
      try {
        if (isListening) {
          await Voice.stop();
          setIsListening(false);
        }
        await Voice.destroy();
        setTimeout(() => {
          Voice.removeAllListeners();
        }, 100);
      } catch (error) {
        console.log('Error cleaning up voice:', error);
      }
    };

    cleanupVoice();
    navigation.goBack();
  }, [isListening, navigation]);

  const handleSubmit = useCallback(() => {
    if (isProcessing || showSuccessLoader) return;

    if (isListening) {
      Voice.stop().catch(() => { });
      setIsListening(false);
    }

    // Get the user's text content - prioritize current input, then look for existing messages
    let userText = inputText.trim();

    // If no current input, look for existing user messages
    if (!userText) {
      const userMessage = messages.find(msg => !msg.isBot && msg.text.length > 0);
      userText = userMessage?.text || '';
    }

    // Get the user's image - prioritize selected image, then look for existing messages
    let userImage = selectedImage;
    if (!userImage) {
      const userMessageWithImage = messages.find(msg => !msg.isBot && msg.image);
      userImage = userMessageWithImage?.image;
    }

    const hasImage = !!userImage;
    const hasText = userText.length > 0;
    const charCount = hasText ? countCharacters(userText) : 0;
    const meetsTextRequirement = hasText && charCount >= 40;

    // Block submission if there's no content at all
    if (!hasImage && !hasText) {
      Alert.alert(
        'No Content',
        'Please add a description (minimum 40 characters) or attach an image to submit your threat report.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Block submission if there's text but it's less than 40 characters AND no image
    if (hasText && charCount < 40 && !hasImage) {
      Alert.alert(
        'Description Too Short',
        `You need at least 40 characters to submit a report. You currently have ${charCount} characters. Please add more details or attach an image.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Allow submission if:
    // 1. Text >= 40 characters (with or without image)
    // 2. Image exists (with or without text)

    setIsProcessing(true);
    Keyboard.dismiss();

    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccessLoader(true);

      setTimeout(() => {
        // Pass the correct user text and image to onComplete
        onComplete(userText, userImage);
        navigation.goBack();
      }, 1200);
    }, 800);
  }, [messages, inputText, selectedImage, onComplete, isProcessing, showSuccessLoader, isListening, navigation]);

  const imagePicker = async () => {
    try {
      const image = await ImagePicker?.openPicker({
        mediaType: 'photo',
        cropping: false,
      });
      if (_.isEmpty(image?.path)) {
        Alert.alert('Error', 'Upload image field required.');
        return;
      } else {
        setSelectedImage(image?.path);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Error upload image', error);
        Alert.alert('Error', 'Failed to select image. Please try again.');
      }
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    setIsTypingManually(true);
  };

  const sendMessage = async () => {
    if (isListening) {
      await stopListening();
    }

    if (!inputText.trim() && !selectedImage) return;

    let textToSend = inputText.trim();
    if (textToSend.length > 0) {
      const originalText = textToSend;
      const { cleaned: filteredText, wasFiltered } = filterProfanityText(textToSend);

      if (wasFiltered) {
        setInputText(filteredText);
        Alert.alert(
          'Content Filtered',
          'Some inappropriate words were automatically filtered from your message.',
          [{ text: 'OK' }]
        );
      }
      textToSend = filteredText;
    }

    const charCount = isTypingManually && textToSend ? countCharacters(textToSend) : 0;

    if (isTypingManually && textToSend.length > 0 && charCount < 40) {
      Alert.alert(
        'Message too short',
        'You need 40 words minimum to send a message.',
        [{ text: 'OK' }],
        { cancelable: true }
      );
      return;
    }

    if ((isTypingManually && charCount >= 40) || (!isTypingManually && textToSend.length > 0) || (selectedImage && textToSend.length === 0)) {
      Keyboard.dismiss();
      textInputRef.current?.blur();

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMessage: Message = {
        id: Date.now().toString(),
        text: textToSend,
        image: selectedImage || undefined,
        timestamp,
        isBot: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setSelectedImage(null);
      setIsTypingManually(false);

      setTimeout(() => {
        const botReply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Most people keep their heads down. You gave a heads up. Your alert will be shared with the community and can be seen on the Safe Zones map. Nice one. 🙌',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBot: true,
        };
        setMessages(prev => [...prev, botReply]);
        setHideTextInput(true);
      }, 1000);
    }
  };

  const renderMessage = (message: Message) => {
    // Hide info message when text input is focused AND there's a photo
    if (message.type === 'info' && isTextInputFocused && capturedPhoto) {
      return null;
    }

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
            message.image && styles.imageBubble,
          ]}
        >
          {message.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: message.image }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.timestampOverlay}>
                <Text style={styles.timestampOverlayText}>
                  {message.timestamp}
                </Text>
              </View>
            </View>
          )}

          {message.text.length > 0 && (
            <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
              {message.text}
            </Text>
          )}
          {!message.image && (
            <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
              {message.timestamp}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={styles.container}
    >
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Short description</Text>
        <TouchableOpacity
          style={[
            styles.closeButton,
            (isProcessing || showSuccessLoader) && styles.closeButtonDisabled
          ]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={isProcessing || showSuccessLoader}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : showSuccessLoader ? (
            <View style={styles.successCheckmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          ) : (
            <X size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Processing/Success Overlay */}
      {(isProcessing || showSuccessLoader) && (
        <View style={styles.processingOverlay}>
          {isProcessing ? (
            <>
              <ActivityIndicator size="large" color="#4ade80" />
              <Text style={styles.processingText}>Preparing your report...</Text>
            </>
          ) : null}
        </View>
      )}

      {/* Messages Container - Flex fills remaining space */}
      <View style={styles.messagesContainer}>
        <ImageBackground
          source={Images.MessageBackground}
          style={styles.messagesBackground}
          resizeMode='cover'
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollViewContent}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!isProcessing && !showSuccessLoader}
          >
            {messages.map(renderMessage)}
          </ScrollView>
        </ImageBackground>
      </View>

      {/* Fixed Input Area at Bottom */}
      {!hideTextInput && !isProcessing && !showSuccessLoader && (
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={removeSelectedImage}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <View style={styles.inputRow}>
              <View style={styles.textInputContainer}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder=""
                  placeholderTextColor="#666"
                  value={inputText}
                  onChangeText={handleTextChange}
                  multiline={true}
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  autoFocus={shouldAutoFocus}
                  onFocus={() => {
                    console.log('Text input focused');
                    setIsTextInputFocused(true);
                  }}
                  onBlur={() => {
                    console.log('Text input blurred');
                    setIsTextInputFocused(false);
                  }}
                />
                {isTypingManually && inputText.length > 0 && (
                  <Text style={[
                    styles.characterCounter,
                    countCharacters(inputText.trim()) < 40 && { color: '#ff4444' },
                    countCharacters(inputText.trim()) >= 40 && { color: '#4ade80' }
                  ]}>
                    {countCharacters(inputText.trim())}/40
                  </Text>
                )}
              </View>

              {inputText.trim().length === 0 && (
                <>
                  <TouchableOpacity
                    style={styles.inputActionButton}
                    onPress={imagePicker}
                  >
                    <Camera size={24} color="#666" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.inputActionButton,
                      isListening && styles.micButtonActive
                    ]}
                    onPress={handleMicPress}
                  >
                    <Mic
                      size={24}
                      color={isListening ? "#ff4444" : "#666"}
                    />
                    {isListening && (
                      <View style={styles.listeningIndicator}>
                        <Text style={styles.listeningText}>●</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                ((isTypingManually && countCharacters(inputText.trim()) >= 40) ||
                  (!isTypingManually && inputText.trim().length > 0) ||
                  (selectedImage && inputText.trim().length === 0)) && styles.sendButtonActive
              ]}
              onPress={sendMessage}
            >
              <Image
                source={Images.SendMessage}
                resizeMode="contain"
                style={{ width: 40, height: 40 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(51, 51, 51, 0.82)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
    backgroundColor: 'rgba(51, 51, 51, 0.82)',
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '500',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
  closeButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  successCheckmark: {
    backgroundColor: '#4ade80',
    borderRadius: 20,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesBackground: {
    flex: 1,
  },
  scrollViewContent: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 6,
    maxWidth: '80%',
    paddingHorizontal: 16,
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
  imageBubble: {
    padding: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderRadius: 15,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 4,
    maxWidth: 250,
    alignSelf: 'flex-start',
    backgroundColor: '#343432',
    padding: 2,
  },
  messageImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    minHeight: 200,
    maxHeight: 350,
    borderRadius: 14,
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  userBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
  },
  botBubble: {
    backgroundColor: '#4ade80',
    borderBottomRightRadius: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },
  infoMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#f4f2eb',
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
  inputContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    minHeight: 60,
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4ade80',
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    height: 40,
  },
  micButtonActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 20,
  },
  listeningIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningText: {
    color: '#ff4444',
    fontSize: 6,
    fontWeight: 'bold',
  },
  textInputContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    fontFamily: 'Inter-Regular',
    paddingRight: 50,
    textAlignVertical: 'center',
  },
  characterCounter: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    fontSize: 12,
    color: '#999',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    height: 40,
    width: 40,
  },
  sendButtonActive: {
    backgroundColor: '#4ade80',
  },
});


export default ThreatReportScreen;