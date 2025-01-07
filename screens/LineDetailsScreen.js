import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function LineDetailsScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text>Detalii Linie</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 