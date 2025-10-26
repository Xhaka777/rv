import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface TimePickerModalProps {
  visible: boolean;
  currentTime: string;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}

export function TimePickerModal({ visible, currentTime, onTimeSelect, onClose }: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(() => {
    const [time, period] = currentTime.split(' ');
    const [hour] = time.split(':');
    return parseInt(hour);
  });
  
  const [selectedMinute, setSelectedMinute] = useState(() => {
    const [time] = currentTime.split(' ');
    const [, minute] = time.split(':');
    return parseInt(minute);
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    return currentTime.includes('AM') ? 'AM' : 'PM';
  });

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    const formattedTime = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    onTimeSelect(formattedTime);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Time</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Hour</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.picker}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      selectedHour === hour && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedHour === hour && styles.selectedPickerItemText,
                      ]}
                    >
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Minute</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.picker}>
                {minutes.filter(minute => minute % 5 === 0).map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMinute === minute && styles.selectedPickerItemText,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>Period</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.picker}>
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.pickerItem,
                      selectedPeriod === period && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedPeriod === period && styles.selectedPickerItemText,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 14,
    color: '#8E8E93',
    paddingVertical: 10,
  },
  picker: {
    flex: 1,
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginHorizontal: 20,
  },
  pickerItemText: {
    fontSize: 18,
    color: '#000',
  },
  selectedPickerItemText: {
    color: '#FFF',
    fontWeight: '600',
  },
});