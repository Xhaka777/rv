import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useCallback, useState } from 'react';
import { TrustedContactsProps } from '../../propTypes';
import {
  CustomText,
  Loader,
  MainContainer,
  PrimaryButton,
  RoundImageContainer,
} from '../../../components';
import { t } from 'i18next';
import {
  Images,
  Metrix,
  NavigationService,
  RouteNames,
  Utills,
} from '../../../config';
import { createShadow, normalizeFont } from '../../../config/metrix';
import { HomeAPIS } from '../../../services/home';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import { useFocusEffect } from '@react-navigation/native';
import ContactImageDB from '../../../config/utills/ContactImageDB';

const { width } = Dimensions.get('window');

// Add the alertServices array same as EditContact
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

export const TrustedContacts: React.FC<TrustedContactsProps> = ({ }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>([]);
  const [refreshing, setRefreshing] = useState(false);
  const userDetails = useSelector((state: RootState) => state.home.userDetails);

  const wait = (timeout: any) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };

  const onRefresh = () => {
    setRefreshing(true);
    wait(1000).then(() => {
      getContacts();
      setRefreshing(false);
    });
  };

  const getContacts = async () => {
    setLoading(true);
    try {
      const res = await HomeAPIS.getTrustedContacts();

      if (res?.data && res.data.length > 0) {
        // Get all contact IDs
        const contactIds = res.data.map(item => item.id.toString());

        // Get all images from database in one call
        const contactImages = await ContactImageDB.getMultipleContactImages(contactIds);

        let array: Array<{
          id: any;
          name: any;
          phone: any;
          abbreviate: any;
          serviceType: any;
          avatar?: any;
        }> = [];

        // Process each contact
        res.data.forEach((item: any) => {
          const contactId = item.id.toString();
          const dbImage = contactImages[contactId];

          // More robust avatar checking
          let finalAvatar = null;

          if (dbImage && dbImage !== '') {
            finalAvatar = dbImage;
          } else if (item?.avatar && item.avatar !== '' && item.avatar !== null) {
            finalAvatar = item.avatar;
          }

          // Debug log to check what service type we're getting
          console.log(`Contact: ${item?.name}, Service Type: ${item?.alert_to}`);

          array.push({
            id: item?.id,
            name: item?.name,
            phone: item?.phone_number,
            abbreviate: item?.name?.charAt(0)?.toUpperCase() || '?',
            serviceType: item?.alert_to || 'WhatsApp', // Default to WhatsApp if undefined
            avatar: finalAvatar,
          });
        });
        setData(array?.reverse());
      } else {
        setData([]);
      }

      setLoading(false);
    } catch (err) {
      console.log('Error getting contacts:', err?.response?.data);
      setLoading(false);
    }
  };

  const deleteContact = async (id: any) => {
    setLoading(true);
    try {
      await HomeAPIS.deleteTrustedContact(id);

      // Also delete the image from local database
      const contactId = id.toString();
      const deletedFromDb = await ContactImageDB.deleteContactImage(contactId);
      console.log(`Contact image ${deletedFromDb ? 'deleted' : 'failed to delete'} from database for contact ID: ${contactId}`);

      // Refresh the contacts list
      getContacts();
    } catch (err) {
      console.log('Error deleting contact:', err?.response?.data);
      setLoading(false);
    }
  };

  const handleTestStream = (contact: any) => {
    console.log('🧪 Starting test stream with contact:', contact);

    // Navigate to TabStack and specify the LiveStream tab with parameters
    NavigationService.navigate(RouteNames.HomeRoutes.TabStack, {
      screen: 'LiveStream',
      params: {
        testStreamContact: contact,
        isTestStream: true
      },
    });
  };

  const handleEditContact = (contact: any) => {
    // Navigate to the edit contact screen
    NavigationService.navigate(RouteNames.HomeRoutes.EditContact, {
      contactData: contact,
    });
  };

  useFocusEffect(
    useCallback(() => {
      getContacts();
      return () => {
        console.log('Screen is unfocused');
      };
    }, []),
  );

  const handleBack = () => {
    NavigationService.goBack();
  };

  const getServiceIcon = (serviceType: string) => {
    // Debug log to see what service type is being processed
    console.log('Getting icon for service type:', serviceType);

    // Find the service in alertServices array
    const service = alertServices.find(s =>
      s.service.toLowerCase() === serviceType?.toLowerCase()
    );

    const icon = service ? service.icon : Images.Whatsapp; // Default to WhatsApp
    console.log('Returning icon:', icon);

    return icon;
  };

  const renderContactListItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <View >
        <View key={item?.id} style={styles.card}>
          {/* Contact Name - Clickable */}
          <TouchableOpacity
            style={styles.nameContainer}
            activeOpacity={0.7}
            onPress={() => handleEditContact(item)}
          >
            <CustomText.MediumText
              numberOfLines={1}
              customStyle={styles.contactName}>
              {item?.name}
            </CustomText.MediumText>
          </TouchableOpacity>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Service Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.serviceButton}>
              <Image
                source={getServiceIcon(item?.serviceType)}
                style={styles.serviceIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Test Stream Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.testStreamButton}
              onPress={() => handleTestStream(item)}>
              <CustomText.SmallText customStyle={styles.testStreamText}>
                Test{'\n'}stream
              </CustomText.SmallText>
            </TouchableOpacity>
          </View>
        </View>

        {/* White Separator Line */}
        {index < data.length - 1 && <View style={styles.separator} />}
      </View>
    );
  };

  return (
    <MainContainer
      customeStyle={{
        paddingVertical: 0,
        flex: 1,
      }}>
      {/* Premium icon back with title */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={Images.Premium}
            style={styles.headsUpIcon}
            resizeMode="contain"
          />
          <CustomText.LargeBoldText customStyle={styles.headerTitle}>
            Responders
          </CustomText.LargeBoldText>
        </View>
        <TouchableOpacity onPress={handleBack} style={styles.exitButton}>
          <Image
            source={Images.Exit}
            style={{ width: 20, height: 20, tintColor: '#ffffff' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Subtitle text */}
      <CustomText.RegularText
        customStyle={{
          marginTop: Metrix.VerticalSize(15),
          lineHeight: 20,
          fontSize: normalizeFont(15)
        }}>
        Add trusted contacts to be notified instantly in an emergency. They'll get your live location, alerts, and updates to help you quickly and effectively.
      </CustomText.RegularText>

      <View style={{ flex: 1, marginTop: Metrix.VerticalSize(20) }}>
        <PrimaryButton
          title={'Add Contact'}
          width={'100%'}
          customStyles={{ alignSelf: 'center' }}
          onPress={() => {
            NavigationService.navigate(RouteNames.HomeRoutes.AddContacts);
          }}
        />
        <FlatList
          data={data}
          renderItem={renderContactListItem}
          keyExtractor={item => item?.id}
          contentContainerStyle={styles.flatlist}
          showsVerticalScrollIndicator={false}
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
      </View>

      <Loader isLoading={loading} />
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Metrix.VerticalSize(5),
    borderBottomWidth: 1,
    borderBottomColor: Utills.selectedThemeColors().TextInputBorderColor,
    marginBottom: Metrix.VerticalSize(20), // Add this line
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headsUpIcon: {
    width: Metrix.HorizontalSize(28), // Changed from 32 to 28
    height: Metrix.VerticalSize(28), // Changed from 32 to 28
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginRight: Metrix.HorizontalSize(5), // Changed from 10 to 5
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  exitButton: {
    padding: Metrix.HorizontalSize(8),
    marginLeft: Metrix.HorizontalSize(10),
  },
  flatlist: {
    paddingHorizontal: Metrix.VerticalSize(0),
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    paddingVertical: Metrix.VerticalSize(15),
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: Metrix.HorizontalSize(10),
  },
  contactName: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: normalizeFont(18),
    fontWeight: '600',
    textAlign: 'left',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrix.HorizontalSize(12),
    paddingRight: 0,
  },
  serviceButton: {
    width: Metrix.HorizontalSize(50),
    height: Metrix.VerticalSize(35),
    backgroundColor: 'transparent', // Transparent background like EditContact
    borderRadius: Metrix.HorizontalSize(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIcon: {
    width: 40, // Same size as EditContact
    height: 40, // Same size as EditContact
  },
  testStreamButton: {
    width: Metrix.HorizontalSize(60),
    height: Metrix.VerticalSize(35),
    paddingHorizontal: Metrix.HorizontalSize(10),
    paddingVertical: Metrix.VerticalSize(6),
    borderRadius: Metrix.HorizontalSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0005'
  },
  testStreamText: {
    color: '#fff',
    fontSize: normalizeFont(11),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: Metrix.VerticalSize(2),
  },
  titleWrapper: {
    paddingLeft: Metrix.HorizontalSize(40), // Leave space for the icon
    marginBottom: Metrix.VerticalSize(10),
    marginTop: 5,
  },
  title: {
    fontSize: normalizeFont(18),
    letterSpacing: 0.7,
    fontWeight: '600',
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
  iconWrapper: {
    position: 'absolute',
    left: 0,
    top: Metrix.VerticalSize(20),
    marginLeft: 10,
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Metrix.VerticalSize(20),
    paddingTop: Metrix.VerticalSize(10),
    // marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exitButton: {
    width: Metrix.HorizontalSize(40),
    height: Metrix.VerticalSize(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Metrix.HorizontalSize(20),
  },
  exitButtonText: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600'
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(28),
    height: Metrix.VerticalSize(28),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    marginRight: Metrix.HorizontalSize(5)
  },
});