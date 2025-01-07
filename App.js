import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import MapView from 'react-native-maps';
import { useState, useEffect } from 'react';
import { stbApi } from './services/stbApi';

export default function App() {
  const [networkInfo, setNetworkInfo] = useState({});

  useEffect(() => {
    const testApi = async () => {
      try {
        const results = await stbApi.testEndpoints();
        setNetworkInfo(results);
      } catch (error) {
        setNetworkInfo({ error: error.message });
      }
    };

    testApi();
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
        {Object.entries(networkInfo).map(([endpoint, info]) => (
          <View key={endpoint} style={styles.endpointContainer}>
            <Text style={styles.endpointText}>Endpoint: {endpoint}</Text>
            <Text style={styles.statusText}>
              Status: {info.status || 'Error'}
            </Text>
            {info.data && (
              <Text style={styles.dataText}>
                Data: {JSON.stringify(info.data).substring(0, 100)}...
              </Text>
            )}
            {info.error && (
              <Text style={styles.errorText}>
                Error: {info.message}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
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
  endpointContainer: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  endpointText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  dataText: {
    fontSize: 12,
    color: '#008000',
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#ff0000',
    marginTop: 5,
  },
});
