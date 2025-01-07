import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useState, useEffect } from 'react';
import { stbApi } from './services/stbApi';

export default function App() {
  const [lines, setLines] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState({
    latitude: 44.4668,
    longitude: 26.0672,
    latitudeDelta: 0.0422,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // Încărcăm toate datele la pornirea aplicației
        const success = await stbApi.loadAllData();
        if (!success) {
          throw new Error('Nu am putut încărca datele');
        }
        
        const linesData = await stbApi.getLines();
        setLines(linesData);
        
        // Încărcăm stațiile pentru regiunea inițială
        updateStationsForRegion(region);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const updateStationsForRegion = (newRegion) => {
    try {
      // Verificăm mai întâi dacă zoom-ul este prea mare
      const isZoomedOut = newRegion.latitudeDelta > 0.02;
      
      if (isZoomedOut) {
        console.log('Se scot stațiile din vedere, deoarece utilizatorul a micșorat harta');
        // În loc să setăm direct array-ul gol, vom face asta într-un setTimeout
        // pentru a permite componentei să se actualizeze corect
        setTimeout(() => {
          setStations([]);
        }, 0);
        return;
      }

      const bounds = {
        north: newRegion.latitude + newRegion.latitudeDelta,
        south: newRegion.latitude - newRegion.latitudeDelta,
        east: newRegion.longitude + newRegion.longitudeDelta,
        west: newRegion.longitude - newRegion.longitudeDelta
      };

      const visibleStations = stbApi.getStationsInBounds(bounds);
      console.log(`Nivel zoom: ${newRegion.latitudeDelta.toFixed(4)}`);
      console.log(`S-au găsit ${visibleStations.length} stații în zona vizibilă`);
      
      // Folosim și aici setTimeout pentru a evita probleme de timing
      setTimeout(() => {
        setStations(visibleStations);
      }, 0);
    } catch (error) {
      console.error('Eroare la actualizarea stațiilor:', error);
      setTimeout(() => {
        setStations([]);
      }, 0);
    }
  };

  const onRegionChangeComplete = (newRegion) => {
    try {
      // Verificăm dacă noua regiune este validă
      if (!newRegion || typeof newRegion.latitudeDelta !== 'number') {
        console.error('Regiune invalidă:', newRegion);
        return;
      }

      // Limităm zoom-ul maxim și minim
      const limitedRegion = {
        ...newRegion,
        latitudeDelta: Math.min(Math.max(newRegion.latitudeDelta, 0.005), 0.1),
        longitudeDelta: Math.min(Math.max(newRegion.longitudeDelta, 0.005), 0.1)
      };

      // Folosim și aici setTimeout pentru actualizarea regiunii
      setTimeout(() => {
        setRegion(limitedRegion);
        updateStationsForRegion(limitedRegion);
      }, 0);
    } catch (error) {
      console.error('Eroare la actualizarea regiunii:', error);
    }
  };

  const getVehicleTypeName = (type) => {
    switch (type) {
      case 'TRAM':
        return 'Tramvaiul';
      case 'TROLLEY':
        return 'Troleibuzul';
      case 'BUS':
        return 'Autobuzul';
      case 'NIGHT_BUS':
        return 'Autobuzul de noapte';
      case 'SUBWAY':
        return 'Metroul';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BE1622" />
        <Text style={styles.loadingText}>Se încarcă stațiile și liniile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        minZoomLevel={12}
        maxZoomLevel={18}
      >
        {stations?.length > 0 && stations.map(station => {
          // Verificăm dacă stația are coordonate valide
          const lat = parseFloat(station.lat);
          const lng = parseFloat(station.lng);
          
          if (!lat || !lng) return null;
          
          return (
            <Marker
              key={station.id}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              title={station.name}
            >
              <View style={styles.stationMarker}>
                <View style={[
                  styles.stationDot,
                  { backgroundColor: stbApi.vehicleColors[station.type] || '#999999' }
                ]} />
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {station.name || 'Stație necunoscută'}
                  </Text>
                  <Text style={styles.calloutSubtitle}>
                    Linii: {station.lines?.length > 0 ? station.lines.join(', ') : 'Necunoscute'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
      <ScrollView style={styles.linesContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Se încarcă...</Text>
        ) : error ? (
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
  stationMarker: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
  },
  stationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#BE1622',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  callout: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  calloutSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  loadingText: {
    padding: 10,
    textAlign: 'center',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
