import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';
import { stbApi } from './services/stbApi';

export default function App() {
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);

  const getVehicleTypeName = (type) => {
    switch (type) {
      case 'TRAM':
        return 'Tramvaiul';
      case 'CABLE_CAR':
        return 'Troleibuzul';
      case 'BUS':
        return 'Autobuzul';
      case 'SUBWAY':
        return 'Metroul';
      default:
        return type;
    }
  };

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const linesData = await stbApi.getLines();
        setLines(linesData);
        console.log('Linii găsite:', linesData.length);
      } catch (error) {
        setError(error.message);
        console.error('Eroare la preluarea liniilor:', error);
      }
    };

    fetchLines();
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
      <ScrollView style={styles.linesContainer}>
        {error ? (
          <Text style={styles.errorText}>Eroare: {error}</Text>
        ) : (
          lines.map(line => (
            <View key={line.id} style={styles.lineItem}>
              <Text style={[styles.lineName, { color: line.color }]}>
                {getVehicleTypeName(line.type)} {line.name}
              </Text>
            </View>
          ))
        )}
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
    height: '60%',
  },
  linesContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  lineItem: {
    padding: 10,
    marginBottom: 5,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  lineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    padding: 10,
  },
});
