import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Dimensions } from 'react-native';
import { TimePickerModal } from './TimePickerModal';

const { width } = Dimensions.get('window');

interface ScheduleTime {
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface DayScheduleRowProps {
  day: string;
  schedule: ScheduleTime;
  onUpdateSchedule: (day: string, field: keyof ScheduleTime, value: string | boolean) => void;
}

export function DayScheduleRow({ day, schedule, onUpdateSchedule }: DayScheduleRowProps) {
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');

  // Calculate responsive dimensions
  const dayLabelWidth = Math.max(width * 0.13, 45); // Minimum 45px, 12% of screen width
  const timeButtonMinWidth = Math.max(width * 0.18, 80); // Minimum 80px, 18% of screen width
  const horizontalMargin = Math.max(width * 0.03, 12); // Minimum 12px, 3% of screen width
  const separatorMargin = Math.max(width * 0.02, 8); // Minimum 8px, 2% of screen width
  const switchMargin = Math.max(width * 0.025, 10); // Minimum 10px, 2.5% of screen width

  // Responsive font sizes
  const dayLabelFontSize = Math.min(width * 0.04, 16); // Maximum 16px, 4% of screen width
  const timeFontSize = Math.min(width * 0.04, 16); // Maximum 16px, 4% of screen width
  const separatorFontSize = Math.min(width * 0.04, 16); // Maximum 16px, 4% of screen width

  const handleTimePress = (type: 'start' | 'end') => {
    setTimePickerType(type);
    setTimePickerVisible(true);
  };

  const handleTimeSelect = (time: string) => {
    if (timePickerType === 'start') {
      onUpdateSchedule(day, 'startTime', time);
    } else {
      onUpdateSchedule(day, 'endTime', time);
    }
    setTimePickerVisible(false);
  };

  return (
    <>
      <View style={styles.row}>
        <Text style={[
          styles.dayLabel, 
          { 
            width: dayLabelWidth,
            fontSize: dayLabelFontSize,
          }
        ]}>
          {day}
        </Text>

        <View style={[
          styles.timeContainer, 
          { 
            marginHorizontal: horizontalMargin 
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              {
                minWidth: timeButtonMinWidth,
                paddingHorizontal: Math.max(width * 0.025, 12), // Responsive horizontal padding
                paddingVertical: Math.max(width * 0.015, 8), // Responsive vertical padding
              }
            ]}
            onPress={() => handleTimePress('start')}
          >
            <Text style={[
              styles.timeText,
              { fontSize: timeFontSize }
            ]}>
              {schedule.startTime}
            </Text>
          </TouchableOpacity>

          <Text style={[
            styles.timeSeparator,
            {
              fontSize: separatorFontSize,
              marginHorizontal: separatorMargin,
            }
          ]}>
            -
          </Text>

          <TouchableOpacity
            style={[
              styles.timeButton,
              {
                minWidth: timeButtonMinWidth,
                paddingHorizontal: Math.max(width * 0.025, 12), // Responsive horizontal padding
                paddingVertical: Math.max(width * 0.015, 8), // Responsive vertical padding
              }
            ]}
            onPress={() => handleTimePress('end')}
          >
            <Text style={[
              styles.timeText,
              { fontSize: timeFontSize }
            ]}>
              {schedule.endTime}
            </Text>
          </TouchableOpacity>
        </View>

        <Switch
          style={{ 
            marginLeft: switchMargin,
            transform: [{ 
              scale: Math.min(width * 0.002, 1) // Scale switch on very small screens
            }] 
          }}
          value={schedule.enabled}
          onValueChange={(value) => onUpdateSchedule(day, 'enabled', value)}
          trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
          thumbColor="#FFF"
          ios_backgroundColor="#E5E5EA"
        />
      </View>

      <TimePickerModal
        visible={timePickerVisible}
        currentTime={timePickerType === 'start' ? schedule.startTime : schedule.endTime}
        onTimeSelect={handleTimeSelect}
        onClose={() => setTimePickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0, // Remove any horizontal padding
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 60, // Ensure minimum touch target height
  },
  dayLabel: {
    color: '#000',
    fontWeight: '400',
    textAlign: 'left', // Changed from 'center' to 'left'
    marginLeft: 0, // Ensure it starts at the very left
  },
  timeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40, // Ensure minimum touch target height
  },
  timeText: {
    color: '#000',
    fontWeight: '400',
  },
  timeSeparator: {
    color: '#8E8E93',
  },
});