import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Image, TextInput, Platform, Keyboard, Alert, ActivityIndicator, AppState } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Camera, Mic, Plus, Send, X } from 'lucide-react-native';
import ImagePicker from 'react-native-image-crop-picker';
import Voice from '@react-native-voice/voice';
import { useDispatch } from 'react-redux';
import { HomeActions } from '../../redux/actions';
import _ from 'lodash';
import { Images, Metrix } from '../../config';

import { profanity, CensorType } from '@2toad/profanity';

interface ThirdBottomSheetProps {
  onComplete: (additionalDetails: string, image?: string) => void;
  onChange: (index: number) => void;
  selectedThreat?: { id: number, icon: any, label: string } | null;
  onThreatConfirmed?: (threatData: { id: number, icon: any, label: string }) => void;
  onClose?: () => void;
  shouldAutoFocuas?: boolean;
}

interface Message {
  id: string;
  text: string;
  image?: string;
  timestamp: string;
  isBot: boolean;
  type?: 'info' | 'bot' | 'user';
}

const ThirdBottomSheet = forwardRef<BottomSheet, ThirdBottomSheetProps>(
  ({ onComplete, onChange, selectedThreat, onThreatConfirmed, onClose, shouldAutoFocus = false }, ref) => {
    const snapPoints = useMemo(() => ['20%'], []);
    const dispatch = useDispatch();

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [hideTextInput, setHideTextInput] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessLoader, setShowSuccessLoader] = useState(false);
    const [isTypingManually, setIsTypingManually] = useState(false);

    // Voice recognition states - EXACT COPY FROM SafeWordTraining
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

    // Function to count words
    // const countWords = (text: string): number => {
    //   return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    // };

    const countCharacters = (text: string): number => {
      return text.trim().length;
    }

    // AppState monitoring - EXACT COPY FROM SafeWordTraining
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

    // Pause safe word detection when component mounts and resume when unmounts
    useEffect(() => {
      console.log('🚀 ThirdBottomSheet: Component mounting - pausing safe word detection');

      // Pause safe word detection when component mounts
      dispatch(HomeActions.setSafeWord({ isSafeWord: false, safeWord: 'Activate' }));

      return () => {
        console.log('🧹 ThirdBottomSheet: Component unmounting - resuming safe word detection');

        // Resume safe word detection when component unmounts
        dispatch(HomeActions.setSafeWord({ isSafeWord: true, safeWord: 'Activate' }));

        // Clean up voice
        Voice.stop().catch(() => { });
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
          console.log('✅ ThirdBottomSheet: Voice destroyed and listeners removed');
        });
      };
    }, [dispatch]);

    useEffect(() => {
      // Clear any existing messages first to prevent duplicates
      console.log('🔄 ThirdBottomSheet: Initializing messages');
      setMessages([]);

      // Add initial bot message when component mounts
      const initialMessage: Message = {
        id: '1',
        text: 'Your community update is anonymous. Only moderators can view it.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isBot: true,
        type: 'info'
      };

      // Use a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        console.log('✅ ThirdBottomSheet: Setting initial message');
        setMessages([initialMessage]);
      }, 100);

      return () => clearTimeout(timer);
    }, []);

    // Voice Recognition Setup - ENHANCED VERSION
    useEffect(() => {
      console.log('🎤 Setting up Voice Recognition...');
      console.log('🎤 Voice object available:', !!Voice);

      // **ADD THIS - Cleanup any existing voice instance first**
      const initializeVoice = async () => {
        try {
          // Clean up any existing instance
          await Voice.destroy();
          Voice.removeAllListeners();
          console.log('🧹 Cleaned up existing voice instance before setup');
        } catch (error) {
          console.log('No existing voice instance to clean up');
        }

        // Voice event handlers
        const onSpeechStart = (e) => {
          console.log('🎤 onSpeechStart triggered:', e);
          console.log('🎤 Speech recognition started successfully');

          // Update last speech time
          lastSpeechTimeRef.current = Date.now();
          console.log('⏰ Updated last speech time');

          // Clear any existing timeout when speech starts
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
            console.log('⏰ Cleared existing voice timeout');
          }
        };

        const onSpeechRecognized = (e) => {
          console.log('🎤 onSpeechRecognized triggered:', e);
          // Update last speech time when speech is recognized
          lastSpeechTimeRef.current = Date.now();
        };

        const onSpeechEnd = (e) => {
          console.log('🎤 onSpeechEnd triggered:', e);
          console.log('🎤 Speech recognition ended naturally');

          // Clear monitoring interval since speech ended naturally
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
            console.log('⏰ Cleared voice monitoring interval due to natural speech end');
          }

          setIsListening(false);
          console.log('🔄 isListening set to false by onSpeechEnd');
        };

        const onSpeechResults = async (e) => {
          console.log('🎤 onSpeechResults triggered with full event:', JSON.stringify(e, null, 2));
          console.log('🎤 e.value:', e.value);

          // Update last speech time when we get results
          lastSpeechTimeRef.current = Date.now();
          console.log('⏰ Updated last speech time due to new results');

          if (e.value && e.value.length > 0) {
            const recognizedText = e.value[0];
            console.log('📝 Recognized text:', `"${recognizedText}"`);

            // Apply @2toad/profanity filter to speech-to-text result
            const { cleaned: filteredText, wasFiltered } = filterProfanityText(recognizedText);
            console.log('🛡️ @2toad filtered text result:', `"${filteredText}"`);

            if (wasFiltered) {
              console.log('⚠️ Speech contained profanity and was automatically filtered');
            }

            // **IMPORTANT FIX - Replace text instead of appending**
            setInputText(filteredText); // This replaces, not appends
            setIsTypingManually(false); // Voice input is not manual typing
            console.log('📝 Text REPLACED with filtered version:', `"${filteredText}"`);

            // **KEY FIX**: Start auto-stop timer AFTER getting results
            if (voiceTimeoutRef.current) {
              clearTimeout(voiceTimeoutRef.current);
            }

            voiceTimeoutRef.current = setTimeout(() => {
              console.log('🛑 Auto-stopping after 2 seconds of silence');
              stopListening();
            }, 2000);

            console.log('✅ Text input updated with @2toad filtering and auto-stop timer set');
          } else {
            console.log('⚠️ No valid speech results received');
          }
        };

        const onSpeechPartialResults = (e) => {
          console.log('🎤 onSpeechPartialResults triggered:', e.value);
          // Update last speech time for partial results too
          lastSpeechTimeRef.current = Date.now();

          // Show partial results in real-time (optional)
          if (e.value && e.value.length > 0) {
            const partialText = e.value[0];
            console.log('👀 Partial text preview:', `"${partialText}"`);

            // Optionally update input with partial results for real-time feedback
            // setInputText(partialText);
          }
        };

        const onSpeechVolumeChanged = (e) => {
          // Minimal logging to avoid issues
          // console.log('🔊 Volume:', e.value);
        };

        const onSpeechError = (e) => {
          console.error('❌ onSpeechError triggered:', e);

          // Clear timeout on error
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
            console.log('⏰ Cleared voice timeout due to error');
          }

          setIsListening(false);
          console.log('🔄 isListening set to false due to error');

          // Only show alert for real errors, not "no speech input"
          if (e.error?.message !== 'No speech input' && e.error?.code !== '7') {
            console.log('🚨 Showing error alert to user');
            Alert.alert('Voice Recognition Error', `Failed to recognize speech: ${e.error?.message || 'Unknown error'}. Please try again.`);
          } else {
            console.log('ℹ️ No speech input detected - not showing error to user');
          }
        };

        console.log('🔗 Attaching voice event listeners...');

        // Attach event listeners
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechRecognized = onSpeechRecognized;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;
        Voice.onSpeechError = onSpeechError;

        console.log('✅ All voice event listeners attached successfully');
      };

      initializeVoice();

      return () => {
        console.log('🧹 Voice Recognition useEffect cleanup...');

        // Clear timeout on cleanup
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
          console.log('⏰ Cleared voice timeout during cleanup');
        }

        Voice.stop().catch(() => { });
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
          console.log('✅ Voice destroyed and listeners removed in useEffect cleanup');
        });
      };
    }, []); // Keep empty dependency array

    // startListening function - ENHANCED VERSION
    const startListening = async () => {
      try {
        console.log('🎤 Starting voice recognition...');

        // **ENHANCED CLEANUP - Always stop and clean first**
        if (isListening) {
          console.log('⚠️ Already listening, stopping first...');
          await stopListening();
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // **ADDITIONAL SAFETY - Stop any existing recognition**
        try {
          await Voice.stop();
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          console.log('No existing recognition to stop');
        }

        // **CLEAR INPUT TEXT WHEN STARTING NEW VOICE RECOGNITION**
        setInputText(''); // This ensures we start with empty text
        console.log('📝 Cleared input text for new voice recognition');

        // Check voice recognition availability
        const isAvailable = await Voice.isAvailable();
        console.log('🎤 Voice recognition available:', isAvailable);

        // Check if recognition is already in progress
        const isRecognizing = await Voice.isRecognizing();
        console.log('🎤 Voice recognition already in progress:', isRecognizing);

        if (isRecognizing) {
          console.log('🛑 Stopping existing recognition first...');
          await Voice.stop();
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('🚀 Starting Voice.start with options...');

        // Start with optimized options
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

        // Set a maximum listening time as backup (30 seconds)
        voiceTimeoutRef.current = setTimeout(() => {
          console.log('🛑 Maximum listening time reached (30s)');
          stopListening();
        }, 30000);

        console.log('✅ Voice recognition started successfully');

      } catch (e) {
        console.error('❌ Voice.start error:', e);
        setIsListening(false);
        Alert.alert('Voice Recognition Error', `Failed to start voice recognition: ${e.message || 'Unknown error'}. Please try again.`);
      }
    };

    // stopListening function - EXACT COPY FROM SafeWordTraining
    const stopListening = async () => {
      try {
        console.log('🔇 Stopping voice recognition...');

        // Clear timeout when manually stopping
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
          console.log('⏰ Cleared voice timeout during manual stop');
        }

        const isRecognizing = await Voice.isRecognizing();
        console.log('🔇 Voice recognition in progress before stop:', isRecognizing);

        if (isRecognizing) {
          await Voice.stop();
          console.log('✅ Voice.stop() called successfully');
        }

        setIsListening(false);
        console.log('✅ Voice recognition stopped, isListening set to false');

      } catch (e) {
        console.error('❌ Voice.stop error:', e);
        setIsListening(false);
      }
    };

    // handleMicPress function - EXACT COPY FROM SafeWordTraining
    const handleMicPress = () => {
      console.log('🎤 Mic button pressed');
      console.log('🎤 Current isListening state:', isListening);

      if (isListening) {
        console.log('🔇 Currently listening, will stop...');
        stopListening();
      } else {
        console.log('🚀 Not listening, will start...');
        startListening();
      }
    };

    const handleClose = useCallback(() => {
      console.log('🚪 handleClose called');
      Keyboard.dismiss();

      // **ENHANCED VOICE CLEANUP - Stop and destroy voice properly**
      const cleanupVoice = async () => {
        try {
          if (isListening) {
            console.log('🔇 Stopping voice recognition in handleClose');
            await Voice.stop();
            setIsListening(false);
          }

          // Always destroy and recreate voice instance
          console.log('🧹 Destroying voice instance in handleClose');
          await Voice.destroy();

          // Small delay to ensure cleanup
          setTimeout(() => {
            Voice.removeAllListeners();
            console.log('✅ Voice completely cleaned up in handleClose');
          }, 100);

        } catch (error) {
          console.log('Error cleaning up voice:', error);
        }
      };

      cleanupVoice();

      setInputText(''); // **This should clear the input text**
      setSelectedImage(null);
      setHideTextInput(false);
      setIsProcessing(false);
      setShowSuccessLoader(false);
      setIsTypingManually(false);

      // Clear monitoring interval when closing
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current); // Changed from clearInterval to clearTimeout
        voiceTimeoutRef.current = null;
        console.log('⏰ Cleared voice monitoring timeout during close');
      }

      // Reset to initial state with the info message
      const initialMessage: Message = {
        id: '1',
        text: 'Your community update is anonymous. Only moderators can view it.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isBot: true,
        type: 'info'
      };
      setMessages([initialMessage]);
      console.log('✅ handleClose completed');
    }, [isListening]); // Add isListening to dependencies

    // Enhanced X button press with logic for actual reporting vs cancellation
    const handleXButtonPress = useCallback(() => {
      if (isProcessing || showSuccessLoader) return;

      if (isListening) {
        console.log('Stopping voice recognition in handleXButtonPress');
        Voice.stop().catch(() => { });
        setIsListening(false);
      }

      // Always create the report when X is pressed, even without description
      const userMessage = messages.find(msg => !msg.isBot && (msg.text.length > 0 || msg.image));
      const userText = userMessage?.text || '';
      const userImage = userMessage?.image;

      const hasImage = !!userImage;
      const hasText = userText.length > 0;
      const charCount = hasText ? countCharacters(userText) : 0;
      const meetsTextRequirement = hasText && charCount >= 40;

      if (!meetsTextRequirement && !hasImage) {
        // Show validation alert based on what's missing
        if (!hasText && !hasImage) {
          Alert.alert(
            'No Content',
            'Please add a description (minimum 40 words) or attach an image to submit your threat report.',
            [{ text: 'OK' }]
          );
        } else if (hasText && charCount < 40 && !hasImage) {
          Alert.alert(
            'Description Too Short',
            `You need at least 40 words to submit a report. You currently have ${charCount} word${charCount === 1 ? '' : 's'}. Please add more details or attach an image.`,
            [{ text: 'OK' }]
          );
        }

        // Don't submit the report - just return
        return;
      }

      setIsProcessing(true);
      Keyboard.dismiss();

      setTimeout(() => {
        setIsProcessing(false);
        setShowSuccessLoader(true);

        setTimeout(() => {
          if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.close();
          }

          // Always call onComplete to create the threat
          onComplete(userText, userImage);
        }, 1200);
      }, 800);

    }, [onClose, ref, messages, onComplete, isProcessing, showSuccessLoader, inputText, isTypingManually, isListening]);

    // Use the exact same image picker function as EditProfile
    const imagePicker = async () => {
      try {
        const image = await ImagePicker?.openPicker({
          mediaType: 'photo',
          cropping: true,
        });
        if (_.isEmpty(image?.path)) {
          Alert.alert('Error', 'Upload image field required.');
          return;
        } else {
          console.log('Selected image path:', image?.path); // Debug log
          setSelectedImage(image?.path);
        }
      } catch (error: any) {
        if (error.message !== 'User cancelled image selection') {
          console.error('Error upload image', error);
          Alert.alert('Error', 'Failed to select image. Please try again.');
        }
      }
    };

    // Remove selected image
    const removeSelectedImage = () => {
      setSelectedImage(null);
    };

    // Handle manual text input
    const handleTextChange = (text: string) => {
      setInputText(text);
      setIsTypingManually(true); // Mark as manual typing when user types
    };

    // 40 word minimum requirement with alert
    const sendMessage = async () => {

      if (isListening) {
        console.log('🔇 Stopping voice recognition in sendMessage');
        await stopListening();
      }

      // Check if there's no content at all
      if (!inputText.trim() && !selectedImage) return;

      // Apply @2toad/profanity filter to manually typed text
      let textToSend = inputText.trim();
      if (textToSend.length > 0) {
        const originalText = textToSend;
        const { cleaned: filteredText, wasFiltered } = filterProfanityText(textToSend);

        if (wasFiltered) {
          console.log('🛡️ @2toad: Text was filtered:', {
            original: originalText,
            filtered: filteredText
          });

          // Update the input to show filtered version
          setInputText(filteredText);

          // Optional: Show user that their text was filtered
          Alert.alert(
            'Content Filtered',
            'Some inappropriate words were automatically filtered from your message.',
            [{ text: 'OK' }]
          );
        }

        textToSend = filteredText;
      }

      // Check word count only for manual typing
      const charCount = isTypingManually && textToSend ? countCharacters(textToSend) : 0;

      // Check if text is less than 40 words for manual typing
      if (isTypingManually && textToSend.length > 0 && charCount < 40) {
        Alert.alert(
          'Message too short',
          'You need 40 words minimum to send a message.',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        return;
      }

      // Continue with existing sendMessage logic...
      if ((isTypingManually && charCount >= 40) || (!isTypingManually && textToSend.length > 0) || (selectedImage && textToSend.length === 0)) {
        Keyboard.dismiss();
        textInputRef.current?.blur();

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage: Message = {
          id: Date.now().toString(),
          text: textToSend, // Use filtered text
          image: selectedImage || undefined,
          timestamp,
          isBot: false,
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        setSelectedImage(null);
        setIsTypingManually(false); // Reset manual typing state

        // Auto-reply from bot
        setTimeout(() => {
          const botReply: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Most people keep their heads down. You gave a heads up. Your alert will be shared with the community and can be seen on the Safe Zones map. Nice one. 🙌',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isBot: true,
          };
          setMessages(prev => [...prev, botReply]);

          if (selectedThreat && onThreatConfirmed) {
            setTimeout(() => {
              onThreatConfirmed(selectedThreat);
            }, 500);
          }

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
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        onChange={(index) => {
          // Call the original onChange prop
          onChange(index);

          // If bottom sheet is closed (index -1), reset the state
          if (index === -1) {
            handleClose();
          }
        }}
        enablePanDownToClose
        backgroundStyle={styles.chatBottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView style={styles.chatContainer}>
          <View style={styles.chatGradient}>
            {/* Header with X button */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderTitle}>Short description</Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  (isProcessing || showSuccessLoader) && styles.closeButtonDisabled
                ]}
                onPress={handleXButtonPress}
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

            {/* Enhanced Processing/Success Overlay */}
            {(isProcessing || showSuccessLoader) && (
              <View style={styles.processingOverlay}>
                {isProcessing ? (
                  <>
                    <ActivityIndicator size="large" color="#4ade80" />
                    <Text style={styles.processingText}>Preparing your report...</Text>
                  </>
                ) : (
                  <>
                  </>
                )}
              </View>
            )}

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isProcessing && !showSuccessLoader} // Disable scrolling during processing
            >
              {messages.map(renderMessage)}
            </ScrollView>

            {/* Input Area */}
            {!hideTextInput && !isProcessing && !showSuccessLoader && (
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
                        onPress={removeSelectedImage}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.inputWrapper}>
                    <View style={styles.inputRow}>
                      <View style={styles.textInputContainer}>
                        <BottomSheetTextInput
                          ref={textInputRef}
                          style={styles.textInput}
                          placeholder="" // Removed placeholder
                          placeholderTextColor="#666"
                          value={inputText}
                          onChangeText={handleTextChange} // Use new handler
                          multiline={true}
                          maxLength={500}
                          returnKeyType="send"
                          onSubmitEditing={sendMessage}
                          blurOnSubmit={false}
                          autoFocus={shouldAutoFocus} // Add blinking cursor
                        />
                        {/* Word counter - only show when user has started typing */}
                        {isTypingManually && inputText.length > 0 && (
                          <Text style={[
                            styles.characterCounter,
                            // Show red if text exists but less than 40 words, green if 40+
                            countCharacters(inputText.trim()) < 40 && { color: '#ff4444' },
                            countCharacters(inputText.trim()) >= 40 && { color: '#4ade80' }
                          ]}>
                            {countCharacters(inputText.trim())}/40
                          </Text>
                        )}
                      </View>

                      {/* Only show camera and mic when no text is entered */}
                      {inputText.trim().length === 0 && (
                        <>
                          <TouchableOpacity
                            style={styles.inputActionButton}
                            onPress={() => {
                              console.log('Camera button pressed'); // Debug log
                              imagePicker(); // Use the same function as EditProfile
                            }}
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
              </KeyboardAvoidingView>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);


ThirdBottomSheet.displayName = 'ThirdBottomSheet';

const styles = StyleSheet.create({
  chatBottomSheetBackground: {
    backgroundColor: 'rgba(51, 51, 51, 0.82)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
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
    justifyContent: 'center', // Changed from space-between to center
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative', // Add this to enable absolute positioning for the close button
  },
  chatHeaderTitle: {
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
    bottom: 15,
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
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successCheckmarkLarge: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  successText: {
    color: '#4ade80',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(60, 60, 60, 0.59)',
  },
  messagesContent: {
    paddingVertical: 10,
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

export default ThirdBottomSheet;