import axios from 'axios';

class STBApi {
  constructor() {
    this.axios = axios.create({
      baseURL: 'https://info.stbsa.ro',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'InfoTB/1.0',
      }
    });
  }

  // Obține toate liniile STB
  async getLines() {
    try {
      const response = await this.axios.get('/rp/api/lines');
      return response.data.lines;
    } catch (error) {
      console.error('Error fetching lines:', error);
      throw error;
    }
  }

  // Obține detalii despre o linie specifică
  async getLineDetails(lineId) {
    try {
      const response = await this.axios.get(`/rp/api/lines/${lineId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching line ${lineId} details:`, error);
      throw error;
    }
  }

  // Obține vehiculele pentru o linie
  async getLineVehicles(lineId) {
    try {
      const response = await this.axios.get(`/rp/api/vehicles/line/${lineId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching vehicles for line ${lineId}:`, error);
      throw error;
    }
  }

  // Obține timpii de sosire pentru o stație
  async getStationTimes(stationId) {
    try {
      const response = await this.axios.get(`/rp/api/times/station/${stationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching times for station ${stationId}:`, error);
      throw error;
    }
  }
}

export const stbApi = new STBApi(); 