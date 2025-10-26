import {ScrollView} from 'react-native';
import React from 'react';
import {FAQProps} from '../../propTypes';
import {BackHeader, CustomText, MainContainer} from '../../../components';

export const FAQ: React.FC<FAQProps> = ({}) => {
  return (
    <MainContainer isFlatList>
      <BackHeader heading="FAQs" backArrow={true} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <CustomText.RegularText>
          <CustomText.LargeSemiBoldText>
            General Questions{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.LargeSemiBoldText>
            Is Rove free to use?{'\n'}
          </CustomText.LargeSemiBoldText>
          Personal safety is a human right and should be accessible to
          everyone, so Rove is completely free and will always remain so.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Features{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.LargeSemiBoldText>
            How does Rove protect me?{'\n'}
          </CustomText.LargeSemiBoldText>
          Whenever you are on the move, Rove monitors for signs of distress
          and triggers an alert to your trusted contacts - including live
          location and audio stream - in case of an assault. This means you
          don't need to manually trigger the app and your loved ones are
          always able to react and call for help if the worst should happen.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Why not simply call 911?{'\n'}
          </CustomText.LargeSemiBoldText>
          Rove should not be seen as a replacement for regular emergency
          services but as a companion who is able to look out for you in
          situations where you are unable to make the call yourself.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            How do I activate an emergency stream manually?{'\n'}
          </CustomText.LargeSemiBoldText>
          You can always start the live video stream directly from the app,
          which will be shared with your trusted contacts including your live
          location. If you are not able to (or comfortable) using the video
          stream, you can always trigger Rove's audio stream and live location
          by using your safe word, which you set up in the app.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            How many contacts can I share my location with?{'\n'}
          </CustomText.LargeSemiBoldText>
          You can share your live stream with up to five trusted contacts.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Can Rove accidentally start an audio stream?{'\n'}
          </CustomText.LargeSemiBoldText>
          In certain scenarios like combat training or role-playing, the app
          might rarely misinterpret behavior and trigger an alert. While we
          are working to refine this, we suggest you add locations where such
          actions may occur to your SAFE ZONES.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            How do I know if Rove is audio streaming?{'\n'}
          </CustomText.LargeSemiBoldText>
          If Rove is triggered, you will see a generic popup message saying
          that Rove is active.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            How do I stop a stream if Rove is triggered?{'\n'}
          </CustomText.LargeSemiBoldText>
          You will be able to enter a pin that you create at the time of
          sign-up, and it will only be available to you so that you can stop
          the stream.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            What if I don't have coverage?{'\n'}
          </CustomText.LargeSemiBoldText>
          If you don't have coverage, Rove will not be able to trigger a
          stream and can only record locally. The video and/or audio will then
          automatically be shared with your trusted contacts as soon as your
          phone reconnects to a network.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Does Rove work at home?{'\n'}
          </CustomText.LargeSemiBoldText>
          Rove is a public safety app that monitors your safety when you are
          on the move and outside of your SAFE ZONES.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Is Rove always listening to me?{'\n'}
          </CustomText.LargeSemiBoldText>
          Rove does not store the data it processes, but instead scans for
          patterns. For added privacy, a manual, streaming-only option is
          available.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Can my TV or computer trigger a stream?{'\n'}
          </CustomText.LargeSemiBoldText>
          We do not expect that a TV or computer will trigger a stream.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Privacy and Security{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.LargeSemiBoldText>
            How is my data protected?{'\n'}
          </CustomText.LargeSemiBoldText>
          Your personal information and data are protected using end-to-end
          encryption. This ensures that your data is accessible only to you
          and your designated contacts and can be shared by them with
          emergency services if necessary.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            What happens to my data if I delete my account?{'\n'}
          </CustomText.LargeSemiBoldText>
          Upon deleting your account, all of your data is permanently removed
          from our systems within 30 days.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Support and Troubleshooting{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.LargeSemiBoldText>
            How do I reset my password?{'\n'}
          </CustomText.LargeSemiBoldText>
          You can reset your password by clicking "Forgot Password" on the
          login screen. You'll receive an email with instructions to reset it.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Can I use the app internationally?{'\n'}
          </CustomText.LargeSemiBoldText>
          Yes, the app functions globally, but we currently are only available
          in US English. We will soon have different language and accent
          capabilities.
          {'\n\n'}
          <CustomText.LargeSemiBoldText>
            Getting Started{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.RegularText>
            Permissions needed for the app{'\n\n'}
            The app requires access to your location, contacts, microphone,
            and camera for full functionality. These permissions allow the app
            to track your location and detect violent situations.
            {'\n\n'}
          </CustomText.RegularText>

          <CustomText.LargeSemiBoldText>
            Using the App{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.RegularText>
            Activating an emergency stream{'\n\n'}
            In the event of danger, use your secret word to trigger an alert
            and start a live stream. The app will notify your trusted contacts
            and share your real-time location with them.
            {'\n\n'}
          </CustomText.RegularText>

          <CustomText.LargeSemiBoldText>
            Account Management{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.RegularText>
            Updating your trusted contacts{'\n\n'}
            You can edit your list of trusted contacts at any time on the
            trusted contacts page, allowing for updates as needed.
            {'\n\n'}
            Deleting your account{'\n\n'}
            To delete your account, go to the "Settings" tab and select
            "Delete Account." All data associated with your account will be
            permanently deleted within 30 days of deleting the app.
            {'\n\n'}
          </CustomText.RegularText>

          <CustomText.LargeSemiBoldText>
            Technical Support{'\n\n'}
          </CustomText.LargeSemiBoldText>
          <CustomText.RegularText>
            What if the app crashes?{'\n\n'}
            Try restarting the app or clearing your cache. If the problem
            persists, visit the Help Center for troubleshooting or contact
            support.
            {'\n\n'}
            Contacting support{'\n\n'}
            For further issues, you can reach our support team.
            {'\n\n'}
          </CustomText.RegularText>
        </CustomText.RegularText>
      </ScrollView>
    </MainContainer>
  );
};