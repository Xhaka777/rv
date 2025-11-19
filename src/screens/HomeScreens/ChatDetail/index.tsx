import { Camera, ChevronLeft, GalleryHorizontal, Mic, Phone, Smile, Video, Send } from 'lucide-react-native';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Alert,
    Image,
    Text,
    KeyboardAvoidingView,
    Platform,
    ActionSheetIOS,
    Linking,
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

interface Message {
    id: string;
    text: string;
    timestamp: string;
    isSent: boolean;
    type: 'text' | 'image' | 'voice';
    imageUri?: string;
    voiceUri?: string;
}

interface ChatDetailProps {
    route: {
        params: {
            chatId: string;
            contactName: string;
            contactAvatar: any;
            isActive?: boolean;
            phone?: string;
            serviceType?: string;
        };
    };
    navigation: any;
}

// Generate more relevant emergency-focused messages
const generateEmergencyMessages = (contactName: string): Message[] => [
    {
        id: '1',
        text: 'Hi! I\'ve added you as my emergency contact.',
        timestamp: '2:30 PM',
        isSent: true,
        type: 'text',
    },
    {
        id: '2',
        text: 'Thank you for being my trusted contact! I really appreciate it.',
        timestamp: '2:32 PM',
        isSent: true,
        type: 'text',
    },
    {
        id: '3',
        text: 'No problem at all! I\'m here whenever you need help.',
        timestamp: '2:35 PM',
        isSent: false,
        type: 'text',
    },
    {
        id: '4',
        text: 'You\'ll get automatic notifications if I trigger an emergency alert.',
        timestamp: '2:37 PM',
        isSent: true,
        type: 'text',
    },
    {
        id: '5',
        text: 'Got it! Stay safe out there 🙏',
        timestamp: '2:40 PM',
        isSent: false,
        type: 'text',
    },
];

export const ChatDetail: React.FC<ChatDetailProps> = ({ route, navigation }) => {
    const {
        chatId,
        contactName,
        contactAvatar,
        isActive = true,
        phone,
        serviceType
    } = route.params;

    const [messages, setMessages] = useState<Message[]>(generateEmergencyMessages(contactName));
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Scroll to bottom when component mounts
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    const handleSendMessage = useCallback(() => {
        if (inputText.trim().length === 0) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSent: true,
            type: 'text',
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');

        // Scroll to bottom after sending message
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Simulate auto-reply for emergency context
        setTimeout(() => {
            const autoReplies = [
                "I've received your message. Stay safe!",
                "Thanks for the update. Let me know if you need anything.",
                "Got it! I'm keeping an eye on my phone.",
                "Message received. Take care!",
                "Understood. I'm here if you need me."
            ];

            const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];

            const autoReplyMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: randomReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSent: false,
                type: 'text',
            };

            setMessages(prev => [...prev, autoReplyMessage]);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }, 2000);
    }, [inputText]);

    const handleAttachmentPress = useCallback(() => {
        const options = ['Camera', 'Photo Library', 'Cancel'];

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        openCamera();
                    } else if (buttonIndex === 1) {
                        openImageLibrary();
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Image',
                'Choose an option',
                [
                    { text: 'Camera', onPress: openCamera },
                    { text: 'Photo Library', onPress: openImageLibrary },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    }, []);

    const openCamera = useCallback(() => {
        const options = {
            mediaType: 'photo' as MediaType,
            includeBase64: false,
            maxHeight: 2000,
            maxWidth: 2000,
        };

        launchCamera(options, (response: ImagePickerResponse) => {
            if (response.assets && response.assets[0]) {
                const newMessage: Message = {
                    id: Date.now().toString(),
                    text: 'Photo',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSent: true,
                    type: 'image',
                    imageUri: response.assets[0].uri,
                };
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        });
    }, []);

    const openImageLibrary = useCallback(() => {
        const options = {
            mediaType: 'photo' as MediaType,
            includeBase64: false,
            maxHeight: 2000,
            maxWidth: 2000,
        };

        launchImageLibrary(options, (response: ImagePickerResponse) => {
            if (response.assets && response.assets[0]) {
                const newMessage: Message = {
                    id: Date.now().toString(),
                    text: 'Photo',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSent: true,
                    type: 'image',
                    imageUri: response.assets[0].uri,
                };
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        });
    }, []);

    const handleVoicePress = useCallback(() => {
        setIsRecording(!isRecording);
        // Implement voice recording logic here
        Alert.alert('Voice Recording', isRecording ? 'Stopped recording' : 'Started recording');
    }, [isRecording]);

    const handleCallPress = useCallback(() => {
        if (phone) {
            Alert.alert(
                'Call Contact',
                `Call ${contactName} at ${phone}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Call',
                        onPress: () => {
                            Linking.openURL(`tel:${phone}`);
                        }
                    }
                ]
            );
        } else {
            Alert.alert('No Phone Number', 'Phone number not available for this contact');
        }
    }, [contactName, phone]);

    const handleVideoCallPress = useCallback(() => {
        if (serviceType?.toLowerCase() === 'whatsapp') {
            Alert.alert('WhatsApp Video Call', `Starting WhatsApp video call with ${contactName}...`);
            // You can implement WhatsApp deep linking here
            // Linking.openURL(`whatsapp://video/${phone}`);
        } else {
            Alert.alert('Video Call', `Starting video call with ${contactName}...`);
        }
    }, [contactName, serviceType, phone]);

    const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
        const isLastMessage = index === messages.length - 1;
        const showAvatar = !item.isSent && (isLastMessage || messages[index + 1]?.isSent);

        return (
            <View style={[
                styles.messageContainer,
                item.isSent ? styles.sentMessageContainer : styles.receivedMessageContainer
            ]}>
                {!item.isSent && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                            <Image source={contactAvatar} style={styles.messageAvatar} />
                        ) : (
                            <View style={styles.messageAvatarPlaceholder} />
                        )}
                    </View>
                )}

                <View style={styles.messageContentContainer}>
                    <View style={[
                        styles.messageBubble,
                        item.isSent ? styles.sentBubble : styles.receivedBubble
                    ]}>
                        {item.type === 'image' && item.imageUri ? (
                            <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
                        ) : (
                            <Text style={[
                                styles.messageText,
                                item.isSent ? styles.sentMessageText : styles.receivedMessageText
                            ]}>
                                {item.text}
                            </Text>
                        )}
                    </View>

                    <Text style={[
                        styles.timestampText,
                        item.isSent ? styles.sentTimestamp : styles.receivedTimestamp
                    ]}>
                        {item.timestamp}
                    </Text>
                </View>
            </View>
        );
    }, [messages, contactAvatar]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color='#000000' />
                </TouchableOpacity>

                <View style={styles.contactInfo}>
                    <Image source={contactAvatar} style={styles.headerAvatar} />
                    <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>{contactName}</Text>
                        <Text style={styles.activeStatus}>
                            Active now
                        </Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleCallPress} style={styles.headerButton}>
                        <Phone size={24} color={'#000000'} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleVideoCallPress} style={styles.headerButton}>
                        <Video size={28} color={"#000000"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.messagesContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Send an emergency message..."
                            placeholderTextColor="#999"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />

                        {inputText.trim().length === 0 && (
                            <TouchableOpacity
                                onPress={handleVoicePress}
                                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                            >
                                <Mic size={20} color={isRecording ? "#FFFFFF" : "#666"} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {inputText.trim().length > 0 ? (
                        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                            <Send size={24} color={"#007AFF"} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.rightButtonsContainer}>
                            <TouchableOpacity style={styles.emojiButton}>
                                <Smile size={24} color={"#666"} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleAttachmentPress} style={styles.attachmentButton}>
                                <GalleryHorizontal size={24} color={"#666"} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    contactInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    activeStatus: {
        fontSize: 14,
        color: '#999',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: 8,
        marginLeft: 5,
    },
    emergencyNotice: {
        backgroundColor: '#FFF3CD',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    emergencyNoticeText: {
        fontSize: 14,
        color: '#856404',
        textAlign: 'center',
        fontWeight: '500',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 2,
        alignItems: 'flex-end',
    },
    sentMessageContainer: {
        justifyContent: 'flex-end',
    },
    receivedMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 32,
        marginRight: 8,
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    messageAvatarPlaceholder: {
        width: 32,
        height: 32,
    },
    messageContentContainer: {
        maxWidth: '75%',
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    sentBubble: {
        backgroundColor: '#000000',
        borderBottomRightRadius: 5,
    },
    receivedBubble: {
        backgroundColor: '#F0F0F0',
        borderBottomLeftRadius: 5,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    sentMessageText: {
        color: '#FFFFFF',
    },
    receivedMessageText: {
        color: '#000000',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 10,
    },
    timestampText: {
        fontSize: 12,
        marginTop: 4,
        marginHorizontal: 5,
    },
    sentTimestamp: {
        color: '#999',
        textAlign: 'right',
    },
    receivedTimestamp: {
        color: '#999',
        textAlign: 'left',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    inputWrapper: {
        flex: 1,
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingRight: 45,
        fontSize: 16,
        maxHeight: 100,
        color: '#000',
    },
    micButton: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        padding: 6,
        borderRadius: 15,
    },
    micButtonRecording: {
        backgroundColor: '#FF3B30',
    },
    rightButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emojiButton: {
        padding: 8,
        marginRight: 5,
    },
    attachmentButton: {
        padding: 8,
    },
    sendButton: {
        padding: 8,
        marginLeft: 10,
    },
});