import {
    Alert,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import {
    BackHeader,
    CustomText,
    Loader,
    MainContainer,
    PrimaryButton,
} from '../../../components';
import { t } from 'i18next';
import {
    Images,
    Metrix,
    NavigationService,
    Utills,
} from '../../../config';
import { normalizeFont } from '../../../config/metrix';
import { HomeAPIS } from '../../../services/home';
import { useRoute } from '@react-navigation/native';
import ContactImageDB from '../../../config/utills/ContactImageDB';
import ImagePicker from 'react-native-image-crop-picker';

const alertServices = [
    {
        id: '1',
        service: 'WhatsApp',
        icon: Images.Whatsapp,
    },
    {
        id: '2',
        service: 'SMS',
        icon: Images.Sms,
    },
];

export const EditContact: React.FC = () => {
    const route = useRoute<any>();
    const contactData = route?.params?.contactData;

    const [loading, setLoading] = useState(false);
    const [selectedService, setSelectedService] = useState(contactData?.serviceType || 'WhatsApp');
    const [contactName, setContactName] = useState(contactData?.name || '');
    const [contactAvatar, setContactAvatar] = useState(contactData?.avatar || null);

    const handleChangePhoto = () => {
        Alert.alert(
            'Change Photo',
            'Choose an option',
            [
                { text: 'Camera', onPress: openCamera },
                { text: 'Gallery', onPress: openGallery },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
    };

    const openCamera = () => {
        ImagePicker.openCamera({
            width: 300,
            height: 300,
            cropping: true,
            cropperCircleOverlay: true,
            compressImageMaxWidth: 300,
            compressImageMaxHeight: 300,
            compressImageQuality: 0.8,
        })
            .then(image => {
                setContactAvatar(image.path);
            })
            .catch(err => {
                console.log('Camera error:', err);
            });
    };

    const openGallery = () => {
        ImagePicker.openPicker({
            width: 300,
            height: 300,
            cropping: true,
            cropperCircleOverlay: true,
            compressImageMaxWidth: 300,
            compressImageMaxHeight: 300,
            compressImageQuality: 0.8,
        })
            .then(image => {
                setContactAvatar(image.path);
            })
            .catch(err => {
                console.log('Gallery error:', err);
            });
    };

    const updateContact = async () => {
        setLoading(true);
        try {
            const body = {
                name: contactName,
                phone_number: contactData?.phone,
                alert_to: selectedService,
                avatar: contactAvatar,
            };

            const res = await HomeAPIS.updateTrustedContact(contactData?.id, body);

            // Update image in local database if contact was updated successfully
            if (contactAvatar && res?.data?.id) {
                const contactId = res.data.id.toString();
                await ContactImageDB.saveContactImage(contactId, contactAvatar);
            }

            setLoading(false);
            Utills.showToast('Contact updated successfully');
            setTimeout(() => {
                NavigationService.goBack();
            }, 500);

        } catch (err) {
            console.log('Error updating contact:', err?.response);
            setLoading(false);
            Utills.showToast('Error updating contact. Please try again.');
        }
    };

    const deleteContact = async () => {
        Alert.alert(
            'Delete Responder',
            'Are you sure you want to delete this responder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await HomeAPIS.deleteTrustedContact(contactData?.id);

                            // Also delete the image from local database
                            const contactId = contactData?.id?.toString();
                            if (contactId) {
                                await ContactImageDB.deleteContactImage(contactId);
                            }

                            setLoading(false);
                            Utills.showToast('Contact deleted successfully');
                            NavigationService.goBack();
                        } catch (err) {
                            console.log('Error deleting contact:', err?.response?.data);
                            setLoading(false);
                            Utills.showToast('Error deleting contact. Please try again.');
                        }
                    }
                },
            ],
        );
    };

    const getContactInitial = (name: string) => {
        return (name?.trim()?.charAt(0) || '?').toUpperCase();
    };

    return (
        <MainContainer>
            <BackHeader
                heading={contactName}
                isBoldHeading
            />

            <View style={styles.container}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    {contactAvatar ? (
                        <Image
                            source={{ uri: contactAvatar }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <CustomText.LargeBoldText customStyle={styles.avatarText}>
                                {getContactInitial(contactName)}
                            </CustomText.LargeBoldText>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleChangePhoto}
                        style={styles.changePhotoButton}
                    >
                        <CustomText.MediumText customStyle={styles.changePhotoText}>
                            Change Photo
                        </CustomText.MediumText>
                    </TouchableOpacity>
                </View>

                {/* Alert Service Section */}
                <View style={styles.serviceSection}>
                    <CustomText.MediumText customStyle={styles.sectionTitle}>
                        Select alert service
                    </CustomText.MediumText>

                    <View style={styles.serviceRow}>
                        {alertServices?.map((item) => {
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedService(item?.service)}
                                    key={item?.id}
                                    style={[
                                        styles.serviceButton,
                                        selectedService === item?.service && styles.serviceButtonSelected
                                    ]}>
                                    <Image
                                        source={item?.icon}
                                        style={styles.serviceIcon}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Delete Button */}
                <View style={styles.deleteSection}>
                    <TouchableOpacity
                        onPress={deleteContact}
                        style={styles.deleteButton}
                        activeOpacity={0.8}
                    >
                        <CustomText.MediumText customStyle={styles.deleteButtonText}>
                            Delete responder
                        </CustomText.MediumText>
                    </TouchableOpacity>
                </View>
            </View>

            <Loader isLoading={loading} />
        </MainContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: Metrix.VerticalSize(30),
    },

    // Avatar section
    avatarSection: {
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(40),
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: Metrix.VerticalSize(15),
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Metrix.VerticalSize(15),
    },
    avatarText: {
        color: Utills.selectedThemeColors().Base,
        fontSize: normalizeFont(40),
        fontWeight: 'bold',
    },
    changePhotoButton: {
        paddingVertical: Metrix.VerticalSize(5),
    },
    changePhotoText: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: normalizeFont(16),
        textDecorationLine: 'underline',
    },

    // Service section
    serviceSection: {
        marginBottom: Metrix.VerticalSize(40),
        // paddingHorizontal: Metrix.HorizontalSize(10),
        alignItems: 'flex-start', // Align everything to the left
    },
    sectionTitle: {
        color: Utills.selectedThemeColors().PrimaryTextColor,
        fontSize: normalizeFont(18),
        marginBottom: Metrix.VerticalSize(20),
        alignSelf: 'flex-start', // Position title on the very left
    },
    serviceRow: {
        flexDirection: 'row',
        gap: Metrix.HorizontalSize(20),
        alignSelf: 'flex-start', // Position icons on the very left
    },
    serviceButton: {
        width: Metrix.HorizontalSize(50), // Made smaller
        height: Metrix.VerticalSize(50), // Made smaller
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Metrix.HorizontalSize(16),
        borderWidth: 3,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
    },
    serviceButtonSelected: {
        borderColor: '#4ade80',
        backgroundColor: 'transparent',
    },
    serviceIcon: {
        width: 56, // Smaller icon size
        height: 56, // Smaller icon size
    },

    // Delete section
    deleteSection: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: Metrix.VerticalSize(80),
        // paddingHorizontal: Metrix.HorizontalSize(10),
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: Metrix.HorizontalSize(5),
        width: '100%',
        paddingVertical: Metrix.VerticalSize(15), // Added padding
        paddingHorizontal: Metrix.HorizontalSize(10), // Added padding
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: '#000',
        fontSize: normalizeFont(16),
        fontWeight: '600',
    },

    // Next button
    nextButton: {
        position: 'absolute',
        bottom: Metrix.VerticalSize(20),
        right: Metrix.HorizontalSize(20),
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextIcon: {
        width: 20,
        height: 20,
        tintColor: Utills.selectedThemeColors().Base,
    },
});