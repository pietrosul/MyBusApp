import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useState, useEffect, useRef } from 'react';
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
  const [selectedStation, setSelectedStation] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const timeoutRef = useRef(null);
  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

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

  const ZOOM_THRESHOLD = {
    MIN: 0.03,
    MAX: 0.2
  };

  const updateStationsForRegion = (newRegion) => {
    try {
      // Prevenim actualizări multiple simultane
      if (isUpdating) {
        return;
      }

      // Nu încărcăm stații dacă zoom-ul e prea mare
      if (newRegion.latitudeDelta >= ZOOM_THRESHOLD.MIN) {
        setStations([]);
        return;
      }

      setIsUpdating(true);

      const bounds = {
        north: newRegion.latitude + newRegion.latitudeDelta,
        south: newRegion.latitude - newRegion.latitudeDelta,
        east: newRegion.longitude + newRegion.longitudeDelta,
        west: newRegion.longitude - newRegion.longitudeDelta
      };

      const visibleStations = stbApi.getStationsInBounds(bounds);
      const maxStations = 150;
      const limitedStations = visibleStations.slice(0, maxStations);
      
      setStations(limitedStations);
      
      // Resetăm flag-ul după un scurt delay
      timeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
      }, 300);

    } catch (error) {
      console.error('Eroare la actualizarea stațiilor:', error);
      setStations([]);
      setIsUpdating(false);
    }
  };

  const onRegionChangeComplete = (newRegion) => {
    try {
      if (!newRegion || typeof newRegion.latitudeDelta !== 'number') {
        return;
      }

      // Curățăm timeout-ul anterior dacă există
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Verificăm dacă dăm zoom out și avem stații vizibile
      if (stations.length > 0 && newRegion.latitudeDelta > region.latitudeDelta) {
        setStations([]);
        setRegion(newRegion);
        return;
      }

      setRegion(newRegion);
      
      // Adăugăm un mic delay înainte de a încărca stațiile
      timeoutRef.current = setTimeout(() => {
        if (newRegion.latitudeDelta < ZOOM_THRESHOLD.MIN) {
          updateStationsForRegion(newRegion);
        }
      }, 100);

    } catch (error) {
      console.error('Eroare la actualizarea regiunii:', error);
    }
  };

  // Curățăm timeout-ul când componenta este demontată
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
      case 'REGIONAL_BUS':
        return 'Autobuzul regional';
      case 'SUBWAY':
        return 'Metroul';
      default:
        return type;
    }
  };

  const deselectStation = () => {
    setSelectedStation(null);
  };

  useEffect(() => {
    const fetchArrivals = async () => {
      if (selectedStation) {
        setLoadingArrivals(true);
        try {
          const arrivalTimes = await stbApi.getRealTimeArrivals(selectedStation.id, selectedStation.lines);
          setArrivals(arrivalTimes);
        } catch (error) {
          console.error('Eroare la obținerea timpilor de sosire:', error);
        } finally {
          setLoadingArrivals(false);
        }
      }
    };

    fetchArrivals();
  }, [selectedStation]);

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
        minZoomLevel={8}
        maxZoomLevel={18}
        moveOnMarkerPress={false}
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled={true}
        zoomTapEnabled={true}
      >
        {stations?.length > 0 && stations.map(station => {
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
              onPress={() => setSelectedStation(station)}
              ref={(ref) => { station.markerRef = ref }}
            >
              <View style={styles.stationMarker}>
                <View style={[
                  styles.stationDot,
                  { backgroundColor: stbApi.vehicleColors[station.type] || '#999999' }
                ]} />
              </View>
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <View style={styles.callout}>
                    <View style={styles.calloutHeader}>
                      <View style={styles.stationInfo}>
                        <Text style={styles.stationName}>{station.name || 'Stație necunoscută'}</Text>
                        <Text style={styles.stationAddress}>Șos. București-Ploiești, București</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedStation(null);
                          station.markerRef?.hideCallout();
                        }}
                        style={styles.closeButtonContainer}
                      >
                        <Text style={styles.calloutCloseButton}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {station.lines?.length > 0 ? (
                      <ScrollView style={styles.arrivalsList}>
                        {loadingArrivals ? (
                          <ActivityIndicator size="small" color="#666" />
                        ) : (
                          arrivals.map((lineInfo, index) => (
                            <View key={index} style={styles.arrivalItem}>
                              <View style={[styles.lineSquare, { backgroundColor: stbApi.vehicleColors[lineInfo.type] }]}>
                                <Text style={styles.lineNumber}>{lineInfo.line}</Text>
                              </View>
                              <View style={styles.lineDetails}>
                                <Text style={styles.destinationText}>→ {lineInfo.destination}</Text>
                                <View style={styles.arrivalTimes}>
                                  {lineInfo.arrivals.map((time, idx) => (
                                    <View key={idx} style={styles.timeChip}>
                                      <Text style={styles.timeText}>
                                        {time} min
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    ) : (
                      <Text style={styles.noLinesText}>Nu există informații despre linii</Text>
                    )}
                  </View>
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
    borderRadius: 16,
    padding: 20,
    width: 300,
    maxHeight: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  calloutCloseButton: {
    fontSize: 20,
    color: '#666',
    fontWeight: '500',
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#666',
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
  arrivalsList: {
    maxHeight: 300,
  },
  arrivalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  arrivalTimes: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: '#666',
  },
  lineSquare: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lineNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lineDetails: {
    flex: 1,
  },
  destinationText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  noLinesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  closeButtonContainer: {
    padding: 4,
  },
  calloutContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -150 }, // Jumătate din width
      { translateY: -200 }  // Ajustează pentru centrare verticală
    ],
  },
});
