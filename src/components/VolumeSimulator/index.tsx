import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import VolumeAnimatedIcon from '../VolumeAnimatedIcon'; 
import { Minus, Plus } from 'lucide-react-native';

export default function VolumeSimulator() {
  const [volume, setVolume] = useState(0.5);

  const adjustVolume = (delta: number) => {
    setVolume(prev => Math.max(0, Math.min(1, prev + delta)));
  };

  const presetVolumes = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={styles.container}>
      <VolumeAnimatedIcon volume={volume} />
      
      <View style={styles.controls}>
        <Text style={styles.volumeText}>
          Volume: {Math.round(volume * 100)}%
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.adjustButton}
            onPress={() => adjustVolume(-0.1)}
          >
            <Minus size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.adjustButton}
            onPress={() => adjustVolume(0.1)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.presetRow}>
          {presetVolumes.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                volume === preset && styles.activePreset
              ]}
              onPress={() => setVolume(preset)}
            >
              <Text style={[
                styles.presetText,
                volume === preset && styles.activePresetText
              ]}>
                {Math.round(preset * 100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  controls: {
    marginTop: 40,
    alignItems: 'center',
  },
  volumeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  adjustButton: {
    backgroundColor: '#4A90E2',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  presetButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  activePreset: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  presetText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  activePresetText: {
    color: '#ffffff',
  },
});