import {ScrollView} from 'react-native';
import React from 'react';
import {TermsAndPolicyProps} from '../../propTypes';
import {BackHeader, CustomText, MainContainer} from '../../../components';
import {useRoute} from '@react-navigation/native';

export const TermsAndPolicy: React.FC<TermsAndPolicyProps> = ({}) => {
  const route = useRoute();
  const screen = route?.params?.from;
  return (
    <MainContainer isFlatList>
      <BackHeader heading={screen} backArrow={true} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {screen === 'Privacy Policy' ? (
          <CustomText.RegularText>
            <CustomText.LargeSemiBoldText>
              {'\n'}Introduction{'\n\n'}
            </CustomText.LargeSemiBoldText>
            We are committed to protecting your privacy. This policy explains
            how we collect, use, and safeguard your personal data in compliance
            with GDPR and other applicable privacy laws. Please read this
            Privacy Policy carefully.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              1. Information We Collect
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            We collect different types of information in connection with the
            services we provide through the App, including:
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              1.1 Personal Information
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            When you use our App, we collect certain personal information that
            can be used to identify you and provide our services, such as:
            {'\n'}- Name
            {'\n'}- Email address
            {'\n'}- Phone number
            {'\n'}- Contact list (with your consent)
            {'\n'}- Location data (if applicable)
            {'\n\n'}Your data is only shared with your trusted contacts or
            emergency services during emergencies.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              1.2 Data Collected Automatically
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Certain data like location and activity logs are collected
            automatically for the app to function optimally. This data is
            anonymized with end-to-end encryption.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              2. Data Usage
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            How is your data used?
            {'\n\n'}Your data is used to trigger alerts and share location
            information with your contacts. We also use anonymized data to
            improve the app’s performance.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              3. Data Security
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            End-to-End Encryption
            {'\n\n'} We use end-to-end encryption to protect your data from
            unauthorized access. Only you and your designated contacts can
            access your data when needed.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              4. Data Retention
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Your data is stored as long as your account is active. Upon account
            deletion, all data is permanently erased from our systems.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              5. User Rights
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Accessing and Deleting Data
            {'\n\n'} You can access, update, or delete your data at any time by
            adjusting your account settings or contacting support.
            {'\n\n'}
          </CustomText.RegularText>
        ) : (
          <CustomText.RegularText>
            <CustomText.LargeSemiBoldText>
              {'\n'}Introduction{'\n\n'}
            </CustomText.LargeSemiBoldText>
            These Terms and Conditions govern your use of our app. By using the
            app, you agree to comply with these terms and our Privacy Policy.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              1. Use of the App
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            User Responsibilities:
            {'\n'} You are responsible for the accuracy of the information
            provided during account setup and must use the app for its intended
            purpose—enhancing personal safety
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              2. Permitted Uses
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            The app is designed for personal protection against violence. Misuse
            of the app, such as triggering false alerts intentionally, may
            result in the suspension or termination of your account.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              3. Account Management
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              3.1 Creating an Account
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            You are required to provide accurate information and maintain the
            confidentiality of your login credentials. You are responsible for
            all activity under your account.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              3.2 Termination of Account
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            We reserve the right to terminate accounts that violate our terms or
            misuse the app’s safety features.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              4. Liability
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Limitation of Liability:
            {'\n'}We are not liable for any harm resulting from your use of the
            app, including issues with emergency services or loss of
            connectivity during an emergency.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              5. Intellectual Property
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Ownership:
            {'\n'}
            All intellectual property related to the app, including AI systems
            and design, is owned by us. You may not copy or reproduce any part
            of the app without explicit permission. Doing so will result in
            legal action.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              6. Governing Law
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Jurisdiction:
            {'\n'} These Terms and any disputes arising from or related to the
            use of this app shall be governed by and construed in accordance
            with the laws of the European Union. Any disputes shall be subject
            to the exclusive jurisdiction of the courts of the EU.
            {'\n\n'}
            <CustomText.LargeSemiBoldText>
              7. Amendments to Terms
            </CustomText.LargeSemiBoldText>
            {'\n\n'}
            Changes to Terms:
            {'\n'} We may update these Terms and Conditions as necessary. You
            will be notified of significant changes, and continued use of the
            app implies acceptance of the updated terms.
            {'\n\n'}
          </CustomText.RegularText>
        )}
      </ScrollView>
    </MainContainer>
  );
};
