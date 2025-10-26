import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { CustomText } from '../';
import { Images, Metrix, Utills } from '../../config';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    incidentId: string;
    onSubmit?: (feedbackText: string) => Promise<void>; // Add this prop
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
    visible, 
    onClose, 
    incidentId, 
    onSubmit 
}) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (feedback.trim().length < 80) {
            Alert.alert('Minimum Length Required', 'Please provide at least 80 characters of feedback.');
            return;
        }

        try {
            setIsSubmitting(true);
            
            // Call the API through the parent component
            if (onSubmit) {
                await onSubmit(feedback.trim());
            } else {
                // Fallback - log the feedback (for testing)
                console.log('Submitting feedback for incident:', incidentId);
                console.log('Feedback content:', feedback);
                
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            Alert.alert(
                'Thank You!', 
                'Your feedback has been submitted successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setFeedback('');
                            onClose();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error submitting feedback:', error);
            Alert.alert('Error', 'Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFeedback('');
        onClose();
    };

    const characterCount = feedback.trim().length;
    const isValidLength = characterCount >= 80;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={Images.Premium}
                                style={styles.premiumIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>Share Your Feedback</Text>
                    </View>

                    <View style={styles.separator} />

                    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        <Text style={styles.contentText}>
                            Tell us if this stream helped you, was a false alarm, or if you have any other thoughts.{' '}
                        </Text>

                        <View style={styles.textInputContainer}>
                            <TextInput
                                style={styles.textInput}
                                multiline={true}
                                placeholder="Share your detailed feedback here..."
                                placeholderTextColor="#8E8E93"
                                value={feedback}
                                onChangeText={setFeedback}
                                textAlignVertical="top"
                                maxLength={1000}
                            />
                        </View>

                        {/* Add character count indicator */}
                        <View style={styles.wordCountContainer}>
                            <Text style={[
                                styles.wordCountText,
                                { color: isValidLength ? '#34C759' : '#FF3B30' }
                            ]}>
                                {characterCount}/80 minimum characters
                            </Text>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={handleClose}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.submitButton,
                                    (!isValidLength || isSubmitting) && styles.disabledButton
                                ]}
                                onPress={handleSubmit}
                                disabled={!isValidLength || isSubmitting}
                            >
                                <Text style={[
                                    styles.submitButtonText,
                                    (!isValidLength || isSubmitting) && styles.disabledButtonText
                                ]}>
                                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 20,
        paddingTop: 40,
        justifyContent: 'center',
    },
    modalContainer: {
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    separator: {
        height: 1,
        backgroundColor: '#48484A',
        marginBottom: 20,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#FFFFFF',
        marginBottom: 20,
    },
    highlightText: {
        color: '#5f626b',
        fontWeight: '600',
    },
    textInputContainer: {
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#1C1C1E',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        minHeight: 120,
        borderWidth: 1,
        borderColor: '#48484A',
    },
    wordCountContainer: {
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    wordCountText: {
        fontSize: 14,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#48484A',
    },
    submitButton: {
        backgroundColor: '#5f626b',
    },
    disabledButton: {
        backgroundColor: '#48484A',
        opacity: 0.5,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    disabledButtonText: {
        color: '#8E8E93',
    },
    premiumIcon: {
        width: Metrix.HorizontalSize(35),
        height: Metrix.VerticalSize(35),
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    },
});