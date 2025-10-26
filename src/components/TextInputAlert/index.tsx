import React, {useState} from 'react';
import {View, Button} from 'react-native';
import Dialog from 'react-native-dialog';

type TextInputAlertProps = {
  visible: boolean;
  setVisible: any;
  inputText?: any;
  setInputText?: any;
  handleConfirm?: () => void;
  heading?: string;
  subHeading?: string;
};

export const TextInputAlert: React.FC<TextInputAlertProps> = ({
  visible = false,
  setVisible,
  inputText,
  setInputText,
  heading,
  subHeading,
  handleConfirm = () => {},
}) => {
  return (
    <Dialog.Container visible={visible}>
      <Dialog.Title>{heading}</Dialog.Title>
      <Dialog.Description>{subHeading}</Dialog.Description>
      <Dialog.Input
        placeholder="Type something..."
        value={inputText}
        onChangeText={setInputText}
      />
      <Dialog.Button label="Cancel" onPress={() => setVisible(false)} />
      <Dialog.Button label="OK" onPress={handleConfirm} />
    </Dialog.Container>
  );
};
