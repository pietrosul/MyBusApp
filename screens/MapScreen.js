import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import MapView from 'react-native-maps';
import { stbApi } from '../services/stbApi';

export default function MapScreen({ navigation }) {
  const [networkInfo, setNetworkInfo] = useState('');

  useEffect(() => {
    const analyzeNetwork = async () => {
      try {
        const info = await stbApi.captureNetworkRequests();
        setNetworkInfo(JSON.stringify(info, null, 2));
      } catch (error) {
        setNetworkInfo('Eroare: ' + error.message);
      }
    };

    analyzeNetwork();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 44.4268,
          longitude: 26.1025,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />
      <ScrollView style={styles.debugContainer}>
        <Text style={styles.debugText}>{networkInfo}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '50%',
  },
  debugContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
}); 