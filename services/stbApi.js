import axios from 'axios';

class STBApi {
  constructor() {
    this.axios = axios.create({
      baseURL: 'https://info.tusm.ro',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  }

  async testEndpoints() {
    const endpoints = [
      '/api/stations',
      '/api/v1/stations',
      '/openapp/api/stations',
      '/openapp/api/station/222',
      '/api/station/222',
      '/api/lines',
      '/api/v1/lines'
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
}

export const stbApi = new STBApi(); 