import axios from 'axios';

class STBApi {
  constructor() {
    this.axios = axios.create({
      baseURL: 'https://overpass-api.de/api',
      timeout: 25000,
    });

    this.vehicleColors = {
      BUS: '#4B9CD3',        // Albastru deschis pentru autobuze
      NIGHT_BUS: '#1E3F66',  // Albastru închis pentru autobuze de noapte
      TRAM: '#BE1622',       // Roșu închis pentru tramvaie
      TROLLEY: '#2E7D32',    // Verde pentru troleibuze
      SUBWAY: '#000000',     // Negru pentru metrou
    };

    this.allStations = null;
  }

  async loadAllData() {
    try {
      const query = `
        [out:json][timeout:50];
        area["name"="București"]["admin_level"="4"]->.bucharest;
        (
          node["public_transport"="stop_position"](area.bucharest);
        );
        out body;
      `;

      const response = await this.axios.post('/interpreter', query);
      
      if (response.data?.elements) {
        this.allStations = response.data.elements.map(element => ({
          id: element.id,
          name: element.tags.name || 'Stație necunoscută',
          lat: element.lat,
          lng: element.lon,
          type: this.getVehicleType(element.tags.route, element.tags.route_ref),
          lines: element.tags.route_ref ? element.tags.route_ref.split(';') : []
        }));

        console.log(`Încărcate ${this.allStations.length} stații`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Eroare la încărcarea datelor:', error.message);
      return false;
    }
  }

  getStationsInBounds(bounds) {
    if (!this.allStations) return [];
    
    return this.allStations.filter(station => 
      station.lat >= bounds.south &&
      station.lat <= bounds.north &&
      station.lng >= bounds.west &&
      station.lng <= bounds.east
    );
  }

  getVehicleType(route, ref) {
    if (route === 'bus') return ref?.startsWith('N') ? 'NIGHT_BUS' : 'BUS';
    if (route === 'tram') return 'TRAM';
    if (route === 'trolleybus') return 'TROLLEY';
    if (route === 'subway') return 'SUBWAY';
    return 'BUS';
  }

  async getLines() {
    try {
      const query = `
        [out:json][timeout:25];
        area["name"="București"]["admin_level"="4"]->.bucharest;
        (
          relation["route"="bus"](area.bucharest);
          relation["route"="tram"](area.bucharest);
          relation["route"="trolleybus"](area.bucharest);
          relation["route"="subway"](area.bucharest);
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await this.axios.post('/interpreter', query);
      
      if (response.data?.elements) {
        return response.data.elements
          .filter(el => el.type === 'relation' && el.tags?.ref)
          .map(el => ({
            id: el.id,
            name: el.tags.ref,
            type: this.getVehicleType(el.tags.route, el.tags.ref),
            color: this.vehicleColors[this.getVehicleType(el.tags.route, el.tags.ref)],
            has_notifications: false,
            price_ticket: "3 lei"
          }));
      }
      return [];
    } catch (error) {
      console.error('Eroare la încărcarea liniilor:', error.message);
      return [];
    }
  }
}

export const stbApi = new STBApi(); 