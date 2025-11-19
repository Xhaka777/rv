import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { CustomText } from '../../../components';
import { Metrix, Utills, Images } from '../../../config';
import { ChatProps } from '../../propTypes';
import { Search } from 'lucide-react-native';

interface ChatItemData {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: any;
    unreadCount: number;
    isActive: boolean;
}

// Mock data for chat messages
const mockChatData: ChatItemData[] = [
    {
        id: '1',
        name: 'Sarah Johnson',
        message: 'See you tomorrow! 👋',
        time: '6m',
        avatar: Images.AddFriend,
        unreadCount: 2,
        isActive: true,
    },
    {
        id: '2',
        name: 'Mike Chen',
        message: 'Thanks for your help!',
        time: '2h',
        avatar: Images.AddFriend,
        unreadCount: 0,
        isActive: true,
    },
    {
        id: '3',
        name: 'Emily Davis',
        message: 'Sounds good to me!',
        time: '1d',
        avatar: Images.AddFriend,
        unreadCount: 0,
        isActive: true,
    },
    {
        id: '4',
        name: 'Alex Thompson',
        message: 'Check out this article!',
        time: '2d',
        avatar: Images.AddFriend,
        unreadCount: 0,
        isActive: true,
    },
    {
        id: '5',
        name: 'Jessica Lee',
        message: 'Great presentation today!',
        time: '3d',
        avatar: Images.AddFriend,
        unreadCount: 1,
        isActive: true,
    },
];

export const Chat: React.FC<ChatProps> = ({ navigation }) => {
    const [searchText, setSearchText] = useState('');
    const [chatList, setChatList] = useState(mockChatData);

    const handleChatPress = useCallback((chatId: string) => {
        const selectedChat = chatList.find(chat => chat.id === chatId);
        if (selectedChat && navigation) {
            navigation.navigate('ChatDetail', {
                chatId: selectedChat.id,
                contactName: selectedChat.name,
                contactAvatar: selectedChat.avatar,
                isActive: selectedChat.isActive,
            });
        } else {
            Alert.alert('Chat Selected', `Opening chat with ID: ${chatId}`);
        }
    }, [chatList, navigation]);

    const handleSearch = useCallback((text: string) => {
        setSearchText(text);
        if (text.trim() === '') {
            setChatList(mockChatData);
        } else {
            const filtered = mockChatData.filter(chat =>
                chat.name.toLowerCase().includes(text.toLowerCase()) ||
                chat.message.toLowerCase().includes(text.toLowerCase())
            );
            setChatList(filtered);
        }
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={24} color={"#666"} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search messages..."
                        placeholderTextColor="#999"
                        value={searchText}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            <FlatList
                data={chatList}
                keyExtractor={(item) => item.id}
                renderItem={renderChatItem}
                style={styles.chatList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatListContainer}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000000',
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
    searchIcon: {
        width: 18,
        height: 18,
        marginRight: 10,
        tintColor: '#999',
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
});