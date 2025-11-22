import React, { useState, useCallback, useEffect } from 'react';
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
    RefreshControl,
} from 'react-native';
import { CustomText } from '../../../components';
import { Metrix, Utills, Images } from '../../../config';
import { ChatProps } from '../../propTypes';
import { Search } from 'lucide-react-native';
import { HomeAPIS } from '../../../services/home';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import { useFocusEffect } from '@react-navigation/native';
import ContactImageDB from '../../../config/utills/ContactImageDB';

interface ChatItemData {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: any;
    unreadCount: number;
    isActive: boolean;
    phone?: string;
    serviceType?: string;
}

interface RequestItemData {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: any;
    username?: string;
    mutualFriends?: number;
    isNewRequest?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ navigation }) => {
    const [searchText, setSearchText] = useState('');
    const [chatList, setChatList] = useState<ChatItemData[]>([]);
    const [originalChatList, setOriginalChatList] = useState<ChatItemData[]>([]);
    const [requestsList, setRequestsList] = useState<RequestItemData[]>([]);
    const [originalRequestsList, setOriginalRequestsList] = useState<RequestItemData[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
    const userDetails = useSelector((state: RootState) => state.home.userDetails);

    const wait = (timeout: any) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    };

    const onRefresh = () => {
        setRefreshing(true);
        wait(1000).then(() => {
            if (activeTab === 'chats') {
                getTrustedContacts();
            } else {
                getFriendRequests();
            }
            setRefreshing(false);
        });
    };

    const getTrustedContacts = async () => {
        setLoading(true);
        try {
            const res = await HomeAPIS.getTrustedContacts();

            if (res?.data && res.data.length > 0) {
                // Get all contact IDs
                const contactIds = res.data.map(item => item.id.toString());

                // Get all images from database in one call
                const contactImages = await ContactImageDB.getMultipleContactImages(contactIds);

                let array: ChatItemData[] = [];

                // Process each contact
                res.data.forEach((item: any) => {
                    const contactId = item.id.toString();
                    const dbImage = contactImages[contactId];

                    // More robust avatar checking
                    let finalAvatar = Images.AddFriend; // Default avatar

                    if (dbImage && dbImage !== '') {
                        finalAvatar = { uri: dbImage };
                    } else if (item?.avatar && item.avatar !== '' && item.avatar !== null) {
                        finalAvatar = { uri: item.avatar };
                    }

                    // Generate a more realistic last message and time
                    const lastMessages = [
                        "Available for emergency alerts",
                        "Ready to help when needed",
                        "Emergency contact active",
                        "Standing by for alerts",
                        "Available for assistance"
                    ];

                    const timeOptions = ['2m', '5m', '10m', '1h', '2h', '1d', '2d'];

                    const randomMessage = lastMessages[Math.floor(Math.random() * lastMessages.length)];
                    const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];

                    array.push({
                        id: item?.id?.toString(),
                        name: item?.name || 'Unknown Contact',
                        message: randomMessage,
                        time: randomTime,
                        avatar: finalAvatar,
                        unreadCount: 0, // Trusted contacts don't have unread messages by default
                        isActive: true, // Assume trusted contacts are active
                        phone: item?.phone_number,
                        serviceType: item?.alert_to || 'WhatsApp',
                    });
                });

                // Sort by name alphabetically
                array.sort((a, b) => a.name.localeCompare(b.name));

                setChatList(array);
                setOriginalChatList(array);
            } else {
                setChatList([]);
                setOriginalChatList([]);
            }

            setLoading(false);
        } catch (err) {
            console.log('Error getting trusted contacts for chat:', err?.response?.data);
            setLoading(false);
            // Set empty array on error
            setChatList([]);
            setOriginalChatList([]);
        }
    };

    // Mock function to get friend requests - replace with actual API call
    const getFriendRequests = async () => {
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // const res = await HomeAPIS.getFriendRequests();
            
            // Mock data for demonstration
            const mockRequests: RequestItemData[] = [
                {
                    id: '1',
                    name: 'Ardit Xhaka',
                    message: 'Hey, I found you in canal are you safe.',
                    time: '2h',
                    avatar: Images.AddFriend,
                    mutualFriends: 0,
                    isNewRequest: true,
                },
                {
                    id: '2',
                    name: '@altin_xhaka',
                    message: 'Hi, I\'m Christian. Let\'s connect.',
                    time: '1h',
                    avatar: Images.AddFriend,
                    username: '@altin_xhaka',
                    mutualFriends: 0,
                    isNewRequest: false,
                },
            ];

            setRequestsList(mockRequests);
            setOriginalRequestsList(mockRequests);
            setLoading(false);
        } catch (err) {
            console.log('Error getting friend requests:', err);
            setLoading(false);
            setRequestsList([]);
            setOriginalRequestsList([]);
        }
    };

    // Load data when component mounts or tab changes
    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'chats') {
                getTrustedContacts();
            } else {
                getFriendRequests();
            }
            return () => {
                console.log('Chat screen unfocused');
            };
        }, [activeTab]),
    );

    const handleChatPress = useCallback((chatId: string) => {
        const selectedChat = chatList.find(chat => chat.id === chatId);
        if (selectedChat && navigation) {
            navigation.navigate('ChatDetail', {
                chatId: selectedChat.id,
                contactName: selectedChat.name,
                contactAvatar: selectedChat.avatar,
                isActive: selectedChat.isActive,
                phone: selectedChat.phone,
                serviceType: selectedChat.serviceType,
            });
        } else {
            Alert.alert('Chat Selected', `Opening chat with ID: ${chatId}`);
        }
    }, [chatList, navigation]);

    const handleRequestAction = useCallback((requestId: string, action: 'accept' | 'decline' | 'block') => {
        // TODO: Implement API calls for request actions
        Alert.alert('Request Action', `${action} request for ID: ${requestId}`);
        
        // Remove from list after action
        const updatedRequests = requestsList.filter(request => request.id !== requestId);
        setRequestsList(updatedRequests);
        setOriginalRequestsList(updatedRequests);
    }, [requestsList]);

    const handleSearch = useCallback((text: string) => {
        setSearchText(text);
        if (text.trim() === '') {
            if (activeTab === 'chats') {
                setChatList(originalChatList);
            } else {
                setRequestsList(originalRequestsList);
            }
        } else {
            if (activeTab === 'chats') {
                const filtered = originalChatList.filter(chat =>
                    chat.name.toLowerCase().includes(text.toLowerCase()) ||
                    chat.message.toLowerCase().includes(text.toLowerCase())
                );
                setChatList(filtered);
            } else {
                const filtered = originalRequestsList.filter(request =>
                    request.name.toLowerCase().includes(text.toLowerCase()) ||
                    request.message.toLowerCase().includes(text.toLowerCase()) ||
                    (request.username && request.username.toLowerCase().includes(text.toLowerCase()))
                );
                setRequestsList(filtered);
            }
        }
    }, [originalChatList, originalRequestsList, activeTab]);

    const handleTabPress = useCallback((tab: 'chats' | 'requests') => {
        setActiveTab(tab);
        setSearchText(''); // Clear search when switching tabs
    }, []);

    const renderChatItem = useCallback(({ item }: { item: ChatItemData }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleChatPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                <Image source={item.avatar} style={styles.avatar} />
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                    {item.message}
                </Text>
            </View>

            {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    ), [handleChatPress]);

    const renderRequestItem = useCallback(({ item }: { item: RequestItemData }) => (
        <View style={styles.requestItem}>
            {item.isNewRequest && (
                <Text style={styles.newRequestLabel}>NEW REQUEST</Text>
            )}
            <View style={styles.requestContent}>
                <View style={styles.avatarContainer}>
                    <Image source={item.avatar} style={styles.avatar} />
                </View>

                <View style={styles.requestInfo}>
                    <View style={styles.requestHeader}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                    <Text style={styles.requestMessage} numberOfLines={2}>
                        {item.message}
                    </Text>
                    {item.username && (
                        <Text style={styles.usernameText}>{item.username}</Text>
                    )}
                    {item.mutualFriends !== undefined && (
                        <Text style={styles.mutualFriendsText}>
                            {item.mutualFriends === 0 ? 'No mutual friends' : `${item.mutualFriends} mutual friends`}
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleRequestAction(item.id, 'accept')}
                >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleRequestAction(item.id, 'decline')}
                >
                    <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>

                {!item.isNewRequest && (
                    <TouchableOpacity
                        style={styles.blockButton}
                        onPress={() => handleRequestAction(item.id, 'block')}
                    >
                        <Text style={styles.blockButtonText}>Block</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    ), [handleRequestAction]);

    const renderEmptyState = () => {
        if (activeTab === 'chats') {
            return (
                <View style={styles.emptyStateContainer}>
                    <Image source={Images.AddFriend} style={styles.emptyStateImage} />
                    <Text style={styles.emptyStateTitle}>No Trusted Contacts</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Add trusted contacts to start messaging them during emergencies
                    </Text>
                    <TouchableOpacity
                        style={styles.addContactButton}
                        onPress={() => {
                            // Navigate to add contacts - adjust route name as needed
                            navigation?.navigate('TrustedContacts');
                        }}
                    >
                        <Text style={styles.addContactButtonText}>Add Contacts</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            return (
                <View style={styles.emptyStateContainer}>
                    <Image source={Images.AddFriend} style={styles.emptyStateImage} />
                    <Text style={styles.emptyStateTitle}>No Friend Requests</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        When people send you friend requests, they will appear here
                    </Text>
                </View>
            );
        }
    };

    const getRequestsCount = () => {
        return requestsList.length;
    };

    const getCurrentData = () => {
        return activeTab === 'chats' ? chatList : requestsList;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Tab Header */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                    onPress={() => handleTabPress('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                        Messages
                    </Text>
                    {activeTab === 'chats' && <View style={styles.tabIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => handleTabPress('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                        Requests {getRequestsCount() > 0 && `(${getRequestsCount()})`}
                    </Text>
                    {activeTab === 'requests' && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
            </View>

            {/* Search Container */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={24} color={"#666"} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={activeTab === 'chats' ? "Search friends..." : "Search requests..."}
                        placeholderTextColor="#999"
                        value={searchText}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {/* Content */}
            {getCurrentData().length === 0 && !loading ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={getCurrentData()}
                    keyExtractor={(item) => item.id}
                    renderItem={activeTab === 'chats' ? renderChatItem : renderRequestItem}
                    style={styles.chatList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.chatListContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Utills.selectedThemeColors().PrimaryTextColor}
                            colors={[Utills.selectedThemeColors().PrimaryTextColor]}
                            enabled={true}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 0,
        backgroundColor: '#FFFFFF',
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        position: 'relative',
    },
    activeTab: {
        // Active tab styling handled by indicator
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#999',
    },
    activeTabText: {
        color: '#000',
        fontWeight: '600',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#000',
        borderRadius: 1.5,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 45,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        marginLeft: 8,
    },
    chatList: {
        flex: 1,
    },
    chatListContainer: {
        paddingBottom: 20,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    requestItem: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    newRequestLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    requestContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    requestInfo: {
        flex: 1,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    requestMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 5,
    },
    usernameText: {
        fontSize: 14,
        color: '#000',
        marginBottom: 5,
    },
    mutualFriendsText: {
        fontSize: 13,
        color: '#999',
        marginBottom: 15,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
    },
    acceptButton: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        flex: 1,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '500',
    },
    declineButton: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        flex: 1,
        alignItems: 'center',
    },
    declineButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '500',
    },
    blockButton: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        flex: 1,
        alignItems: 'center',
    },
    blockButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '500',
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E0E0',
    },
    chatContent: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    timeText: {
        fontSize: 14,
        color: '#999',
    },
    messagePreview: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    unreadBadge: {
        backgroundColor: '#000000',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100, // Account for tab bar
    },
    emptyStateImage: {
        width: 80,
        height: 80,
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
    },
    addContactButton: {
        backgroundColor: '#000',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addContactButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});