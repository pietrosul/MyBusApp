import axios from 'axios';

class STBApi {
  constructor() {
    this.axios = axios.create({
      baseURL: 'https://infotransport.ro',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  }

  async testEndpoints() {
    const endpoints = [
      '/line-stations/1',          // Test pentru o linie specifică (1)
      '/station-lines/1234',       // Test pentru o stație specifică (1234)
      '/station-timetable/1234/1', // Test pentru programul unei linii la o stație
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const response = await this.axios.get(endpoint);
        results[endpoint] = {
          status: response.status,
          data: response.data
        };
      } catch (error) {
        results[endpoint] = {
          error: true,
          status: error.response?.status,
          message: error.message
        };
      }
    }

    return results;
  }

  // Metode specifice pentru fiecare tip de request
  async getLineStations(lineId) {
    try {
      const response = await this.axios.get(`/line-stations/${lineId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting line stations for line ${lineId}:`, error);
      throw error;
    }
  }

  async getStationLines(stationId) {
    try {
      const response = await this.axios.get(`/station-lines/${stationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting station lines for station ${stationId}:`, error);
      throw error;
    }
  }

  async getStationTimetable(stationId, lineId) {
    try {
      const response = await this.axios.get(`/station-timetable/${stationId}/${lineId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting timetable for station ${stationId} and line ${lineId}:`, error);
      throw error;
    }
  }
}

export const stbApi = new STBApi(); 