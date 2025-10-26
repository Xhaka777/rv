import {
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AddContactsProps } from '../../propTypes';
import {
  BackHeader,
  CustomInput,
  CustomModal,
  CustomText,
  Loader,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import { t } from 'i18next';
import { Images, Metrix, NavigationService, Utills } from '../../../config';
import { Image } from 'react-native';
import { HomeAPIS } from '../../../services/home';
import Contacts, { Contact } from 'react-native-contacts';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { CustomSearchBar } from '../../../components/SearchBar';
import ImagePicker from 'react-native-image-crop-picker';
import ContactImageDB from '../../../config/utills/ContactImageDB';
import RNFS from 'react-native-fs';
import { captureRef } from 'react-native-view-shot';
import { Check } from 'lucide-react-native';

export const AddContacts: React.FC<AddContactsProps> = ({ }) => {
  const route = useRoute<any>();
  const userInfo = route?.params?.userInfo;
  const from = route?.params?.from;
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState('WhatsApp'); // Keep default value
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);

  const [currentTrustedContactsCount, setCurrentTrustedContactsCount] = useState(0);


  const isFocus = useIsFocused();
  const MAX_CONTACTS = 5;

  const loadContacts = () => {
    setLoading(true);
    Contacts.getAll()
      .then(contacts => {
        // Filter contacts that have phone numbers
        const contactsWithPhones = contacts.filter(contact =>
          contact.phoneNumbers && contact.phoneNumbers.length > 0
        );
        setContacts(contactsWithPhones);
        setFilteredContacts(contactsWithPhones);
        setLoading(false);
      })
      .catch(e => {
        console.log('Error loading contacts:', e);
        setLoading(false);
      });
  };

  const getCurrentTrustedContactsCount = async () => {
    try {
      const res = await HomeAPIS.getTrustedContacts();
      const count = res?.data?.length || 0;
      setCurrentTrustedContactsCount(count);
      return count;
    } catch (err) {
      console.log('Error getting current contacts count:', err);
      return 0;
    }
  };

  useEffect(() => {
    getCurrentTrustedContactsCount();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
        title: 'Contacts',
        message: 'This app would like to view your contacts.',
        buttonPositive: 'OK',
      }).then(() => {
        loadContacts();
      });
    } else {
      loadContacts();
    }
  }, [isFocus]);

  // Search function
  const search = (text: string) => {
    setSearchVal(text);
    if (text === '' || text === null) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.givenName || ''} ${contact.familyName || ''}`.toLowerCase();
        const phoneNumber = contact.phoneNumbers?.[0]?.number || '';
        return fullName.includes(text.toLowerCase()) || phoneNumber.includes(text);
      });
      setFilteredContacts(filtered);
    }
  };

  // Toggle contact selection
  const toggleContactSelection = async (contact: Contact) => {
    const isSelected = selectedContacts.find(c => c.recordID === contact.recordID);

    if (isSelected) {
      // Remove from selection
      setSelectedContacts(prev => prev.filter(c => c.recordID !== contact.recordID));
    } else {
      // Get current count from server to ensure accuracy
      const currentCount = await getCurrentTrustedContactsCount();

      // Check if we've reached the total limit (current + selected)
      if (currentCount + selectedContacts.length >= MAX_CONTACTS) {
        const remainingSlots = MAX_CONTACTS - currentCount;

        if (remainingSlots <= 0) {
          Alert.alert(
            'Limit Reached',
            `You already have ${MAX_CONTACTS} trusted contacts. Please remove some contacts first.`
          );
        } else {
          Alert.alert(
            'Selection Limit',
            `You can only select ${remainingSlots} more contact${remainingSlots === 1 ? '' : 's'}. You currently have ${currentCount} trusted contact${currentCount === 1 ? '' : 's'}.`
          );
        }
        return;
      }

      // Add to selection
      const contactData = {
        recordID: contact.recordID,
        name: `${contact.givenName || ''} ${contact.familyName || ''}`.trim(),
        phone: contact.phoneNumbers?.[0]?.number || '',
        avatar: contact.thumbnailPath || null,
      };
      setSelectedContacts(prev => [...prev, contactData]);
    }
  };

  // Add selected contacts
  const addSelectedContacts = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to add.');
      return;
    }

    setLoading(true);

    try {
      // First, get current trusted contacts to check the limit
      const currentContactsRes = await HomeAPIS.getTrustedContacts();
      const currentContactsCount = currentContactsRes?.data?.length || 0;

      // Check if adding selected contacts would exceed the limit
      if (currentContactsCount + selectedContacts.length > MAX_CONTACTS) {
        const remainingSlots = MAX_CONTACTS - currentContactsCount;
        setLoading(false);

        if (remainingSlots <= 0) {
          Alert.alert(
            'Limit Reached',
            `You already have ${MAX_CONTACTS} trusted contacts. Please remove some contacts first.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Limit Exceeded',
            `You can only add ${remainingSlots} more contact${remainingSlots === 1 ? '' : 's'}. You currently have ${currentContactsCount} trusted contact${currentContactsCount === 1 ? '' : 's'}.`,
            [{ text: 'OK' }]
          );
        }
        return;
      }

      // Add each selected contact
      for (const contact of selectedContacts) {
        const body = {
          name: contact.name,
          phone_number: contact.phone?.replace(/[\s\-()]/g, ''),
          alert_to: selectedService,
          avatar: contact.avatar,
        };

        const res = await HomeAPIS.addTrustedContact(body);

        // Save image to local database if contact was created successfully
        if (contact.avatar && res?.data?.id) {
          const contactId = res.data.id.toString();
          await ContactImageDB.saveContactImage(contactId, contact.avatar);
        }
      }

      setLoading(false);
      Utills.showToast(`${selectedContacts.length} contact(s) added successfully`);
      setTimeout(() => {
        NavigationService.goBack();
      }, 500);

    } catch (err) {
      console.log('Error adding contacts:', err?.response);
      setLoading(false);

      // Check if error is due to limit exceeded
      if (err?.response?.data?.message?.includes('limit') || err?.response?.status === 422) {
        Alert.alert(
          'Limit Reached',
          'You have reached the maximum limit of 5 trusted contacts. Please remove some contacts first.',
          [{ text: 'OK' }]
        );
      } else {
        Utills.showToast('Error adding contacts. Please try again.');
      }
    }
  };

  const keyExtractor = (item: Contact, index: number) => {
    return item?.recordID?.toString() || index.toString();
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.find(c => c.recordID === item.recordID);
    const fullName = `${item.givenName || ''} ${item.familyName || ''}`.trim();
    const phoneNumber = item.phoneNumbers?.[0]?.number || '';

    return (
      <TouchableOpacity
        onPress={() => toggleContactSelection(item)}
        activeOpacity={0.7}
        style={styles.contactItem}>

        <View style={styles.contactInfo}>
          <View style={styles.contactDetails}>
            <CustomText.MediumText customStyle={styles.contactName}>
              {fullName || 'Unknown'}
            </CustomText.MediumText>
          </View>
        </View>

        {/* Checkmark */}
        <View style={styles.checkmarkContainer}>
          {isSelected && (
            <View style={styles.checkmark}>
              <Check size={24} color='#fff' />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  const searchHeader = useMemo(() => {
    return (
      <View style={styles.searchContainer}>
        <CustomSearchBar
          value={searchVal}
          onChangeText={search}
          returnKeyType={'search'}
          placeholder="Search"
          onSubmitEditing={() => search(searchVal)}
          mainContainer={styles.whiteSearchContainer}
          customStyle={styles.whiteSearchInput}
          leftIcon={Images.Search}
          showMicIcon={true}
          onMicPress={() => {
            console.log('Mic button pressed!');
            // Add your mic functionality here
          }}
        />

        {/* Selection counter */}
        <View style={styles.selectionCounter}>
          <CustomText.RegularText customStyle={styles.counterText}>
            {selectedContacts.length}/{MAX_CONTACTS} contacts selected
          </CustomText.RegularText>
        </View>
      </View>
    );
  }, [searchVal, selectedContacts.length]);

  return (
    <MainContainer>
      <BackHeader
        heading="Add Responder"
        subtitle="(max. 5)"
        isBoldHeading
      />

      <View style={styles.container}>
        {/* Contacts List */}
        <View style={styles.contactsSection}>
          <FlatList
            data={filteredContacts}
            renderItem={renderContactItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={searchHeader}
            ItemSeparatorComponent={renderSeparator}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContainer}
          />
        </View>

        {/* Add Button */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={`Add Contact${selectedContacts.length > 1 ? 's' : ''} (${selectedContacts.length})`}
            onPress={addSelectedContacts}
            disabled={selectedContacts.length === 0}
            customStyles={[
              styles.addButton,
              selectedContacts.length === 0 && styles.addButtonDisabled
            ]}
          />
        </View>
      </View>

      <Loader isLoading={loading} />
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Metrix.VerticalSize(10),
  },

  // Service selection styles - COMMENTED OUT BUT KEPT FOR REFERENCE
  // serviceSection: {
  //   marginBottom: Metrix.VerticalSize(20),
  // },
  // sectionTitle: {
  //   marginBottom: Metrix.VerticalSize(10),
  // },
  // serviceRow: {
  //   flexDirection: 'row',
  //   gap: Metrix.HorizontalSize(15),
  // },
  // serviceButton: {
  //   width: Metrix.HorizontalSize(60),
  //   height: Metrix.VerticalSize(55),
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   borderRadius: Metrix.HorizontalSize(10),
  //   borderWidth: 1,
  //   borderColor: 'transparent',
  // },
  // serviceButtonSelected: {
  //   borderColor: '#4ade80',
  // },
  // serviceIcon: {
  //   width: Metrix.HorizontalSize(42),
  //   height: Metrix.HorizontalSize(42),
  // },

  // Search and contacts section
  contactsSection: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: Metrix.VerticalSize(15),
  },
  selectionCounter: {
    marginTop: Metrix.VerticalSize(10),
    alignItems: 'center',
  },
  counterText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: Metrix.VerticalSize(20),
  },

  // Contact item styles
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Metrix.VerticalSize(15),
    paddingHorizontal: Metrix.HorizontalSize(5),
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: Metrix.HorizontalSize(15),
  },
  contactAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Utills.selectedThemeColors().Base,
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: {
    color: Utills.selectedThemeColors().SecondaryTextColor || '#888',
    fontSize: 14,
  },
  checkmarkContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Separator
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: Utills.selectedThemeColors().TextInputBorderColor || 'rgba(255, 255, 255, 0.2)',
  },

  // Button styles
  buttonContainer: {
    paddingTop: Metrix.VerticalSize(20),
    borderTopWidth: 1,
    borderTopColor: Utills.selectedThemeColors().TextInputBorderColor || 'rgba(255, 255, 255, 0.2)',
  },
  addButton: {
    backgroundColor: '#fff',
  },
  addButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },

  // White search bar styling
  whiteSearchContainer: {
    backgroundColor: '#fff',
    borderRadius: 25,
    height: Metrix.VerticalSize(45),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Metrix.HorizontalSize(15),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderColor: 'transparent',
    marginVertical: 0,
  },
  whiteSearchInput: {
    color: '#000',
    fontSize: 16,
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: Metrix.HorizontalSize(10),
  },
});