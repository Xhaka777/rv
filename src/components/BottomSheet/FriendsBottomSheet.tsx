import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Images } from '../../config';

interface FriendsBottomSheetProps {
    onChange: (index: number) => void;
    onClose: () => void;
}

const FriendsBottomSheet = forwardRef<BottomSheet, FriendsBottomSheetProps>(
    ({ onChange, onClose }, ref) => {
        const snapPoints = useMemo(() => ['15%'], []); // Adjust height as needed

        // Sample friend data - replace with your actual friends data
        const friends = [
            { id: 1, image: Images.AddFriend }, // You can replace with actual profile images
            { id: 2, image: Images.AddFriend },
        ];

        const renderFriendsGrid = () => (
            <View style={styles.friendsContainer}>
                <View style={styles.friendsGrid}>
                    {friends.map((friend) => (
                        <TouchableOpacity
                            key={friend.id}
                            style={styles.friendButton}
                            onPress={() => {
                                // Handle friend selection
                                console.log('Friend selected:', friend.id);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.friendImageContainer}>
                                <Image
                                    source={friend.image}
                                    style={styles.friendImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* Add Friend Button */}
                {/* <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => {
                        // Handle add friend action
                        console.log('Add friend pressed');
                    }}
                    activeOpacity={0.7}
                >
                    <Image
                        source={Images.AddFriend}
                        style={styles.addFriendIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity> */}
            </View>
        );

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                onChange={onChange}
                enablePanDownToClose
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    {/* <View style={styles.bottomSheetHeader}>
                        <Text style={styles.bottomSheetTitle}>Friends</Text>
                    </View> */}
                    {renderFriendsGrid()}
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

FriendsBottomSheet.displayName = 'FriendsBottomSheet';

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: 'rgba(60, 60, 60, 0.95)',
        borderRadius: 20,
    },
    bottomSheetContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    bottomSheetHeader: {
        paddingTop: 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#FFFFFF',
    },
    handleIndicator: {
        backgroundColor: '#d1d5db',
        width: 40,
        height: 4,
    },
    friendsContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: 'rgba(223, 223, 223, 0.07)',
    },
    friendsGrid: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 20,
        marginBottom: 20,
    },
    friendButton: {
        alignItems: 'flex-start',
    },
    friendImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    friendImage: {
        width: '80%',
        height: '80%',
    },
    addFriendButton: {
        alignSelf: 'center',
        padding: 10,
    },
    addFriendIcon: {
        width: 40,
        height: 40,
        tintColor: '#FFFFFF',
    },
});

export default FriendsBottomSheet;