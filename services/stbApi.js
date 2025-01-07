import axios from 'axios';
import { STB_API_CONFIG } from './stbConfig';

class STBApi {
  constructor() {
    this.stbAxios = axios.create({
      baseURL: STB_API_CONFIG.BASE_URL,
      timeout: 10000,
    });

    this.vehicleColors = {
      BUS: '#4B9CD3',        // Albastru deschis pentru autobuze
      NIGHT_BUS: '#1E3F66',  // Albastru închis pentru autobuze de noapte
      REGIONAL_BUS: '#9C27B0', // Violet pentru autobuze regionale
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
        (area["name"="Ilfov"]["admin_level"="6"];)->.ilfov;
        (
          node["public_transport"="stop_position"](area.bucharest);
          node["public_transport"="stop_position"](area.ilfov);
          relation["route"="bus"](area.bucharest)->.routes;
          relation["route"="tram"](area.bucharest)->.routes;
          relation["route"="trolleybus"](area.bucharest)->.routes;
          relation["route"="subway"](area.bucharest)->.routes;
          relation["route"="bus"](area.bucharest)(area.ilfov)->.routes;
          node(r.routes)[role="stop"][role="stop_entry_only"][role="stop_exit_only"];
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await this.axios.post('/interpreter', query);
      
      if (response.data?.elements) {
        const stations = response.data.elements.filter(el => el.type === 'node' && el.tags?.public_transport === 'stop_position');
        const routes = response.data.elements.filter(el => el.type === 'relation' && el.tags?.route);

        // Procesăm rutele pentru a extrage capetele de linie
        const routeEndpoints = new Map();
        routes.forEach(route => {
          if (route.members) {
            const stops = route.members.filter(m => m.type === 'node' && 
              (m.role === 'stop' || m.role === 'stop_entry_only' || m.role === 'stop_exit_only'));
            
            if (stops.length >= 2) {
              routeEndpoints.set(route.tags.ref, {
                start: stops[0].ref,
                end: stops[stops.length - 1].ref,
                name: route.tags.name || route.tags.ref
              });
            }
          }
        });

        // Creăm un map pentru a asocia stațiile cu liniile
        const stationLines = new Map();

        // Pentru fiecare rută, verificăm nodurile membre și le asociem cu numărul liniei
        routes.forEach(route => {
          const lineNumber = route.tags.ref;
          const lineType = this.getVehicleType(route.tags.route, lineNumber);
          
          if (route.members) {
            route.members.forEach(member => {
              if (member.type === 'node' && member.role === 'stop') {
                if (!stationLines.has(member.ref)) {
                  stationLines.set(member.ref, new Set());
                }
                stationLines.get(member.ref).add({
                  number: lineNumber,
                  type: lineType
                });
              }
            });
          }
        });

        // Procesăm stațiile și adăugăm informațiile despre linii
        this.allStations = stations.map(station => {
          const stationId = station.id;
          const lines = stationLines.get(stationId);
          const sortedLines = lines ? Array.from(lines).sort((a, b) => {
            // Sortăm liniile numeric, tratând cazul special pentru liniile de noapte (N)
            const aNum = parseInt(a.number.replace('N', '')) || 0;
            const bNum = parseInt(b.number.replace('N', '')) || 0;
            return aNum - bNum;
          }) : [];

          return {
            id: stationId,
            name: station.tags.name || 'Stație necunoscută',
            lat: station.lat,
            lng: station.lon,
            type: this.getVehicleType(station.tags.route, station.tags.route_ref),
            lines: sortedLines
          };
        });

        console.log(`Încărcate ${this.allStations.length} stații cu liniile lor`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Eroare la încărcarea datelor:', error);
      return false;
    }
  }

  async getStationsInBounds(bounds) {
    try {
      const response = await this.stbAxios.get(
        `/lines/home/stops/${bounds.south}/${bounds.west}/${bounds.north}/${bounds.east}`,
        {
          params: {
            lang: 'ro'
          }
        }
      );

      if (response.data) {
        return response.data.map(station => ({
          id: station.id,
          name: station.name || 'Stație necunoscută',
          lat: station.lat,
          lng: station.lng,
          type: this.getVehicleType(station.type),
          lines: station.lines?.map(line => ({
            number: line.name,
            type: this.getVehicleType(line.type, line.name)
          })) || []
        }));
      }

      return [];
    } catch (error) {
      console.error('Eroare la obținerea stațiilor:', error);
      return [];
    }
  }

  getVehicleType(route, ref) {
    if (route === 'bus') {
      if (ref?.startsWith('N')) return 'NIGHT_BUS';
      if (ref?.startsWith('4')) return 'REGIONAL_BUS';
      return 'BUS';
    }
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

  getArrivalTimes(stationId, lines) {
    const arrivals = lines.map(line => {
      const numberOfArrivals = Math.floor(Math.random() * 3) + 1;
      const times = [];
      
      for (let i = 0; i < numberOfArrivals; i++) {
        times.push(Math.floor(Math.random() * 30) + 1);
      }

      // Simulăm capetele de linie pentru fiecare rută
      const destinations = {
        direction1: "Piața Victoriei",
        direction2: "Gara de Nord"
      };

      return {
        line: line.number,
        type: line.type,
        destination: destinations.direction1, // În realitate, aici ar trebui să fie capătul de linie real
        arrivals: times.sort((a, b) => a - b)
      };
    });

    return arrivals;
  }

  async getRealTimeArrivals(stationId, lines) {
    try {
      // Vom folosi API-ul STB pentru date în timp real
      const response = await axios.get(`https://info.stbsa.ro/rp/api/lines/stations/${stationId}/arrivals`);
      
      if (response.data) {
        return response.data.map(arrival => ({
          line: arrival.line,
          type: this.getVehicleType(arrival.type, arrival.line),
          destination: arrival.destination,
          arrivals: arrival.estimatedTimes // timpul estimat în minute
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Eroare la obținerea timpilor de sosire:', error);
      // Dacă API-ul nu răspunde, revenim la simulare temporar
      return this.getSimulatedArrivals(stationId, lines);
    }
  }

  getSimulatedArrivals(stationId, lines) {
    const arrivals = lines.map(line => {
      const numberOfArrivals = Math.floor(Math.random() * 3) + 1;
      const times = [];
      
      for (let i = 0; i < numberOfArrivals; i++) {
        times.push(Math.floor(Math.random() * 30) + 1);
      }

      // Simulăm capetele de linie pentru fiecare rută
      const destinations = {
        direction1: "Piața Victoriei",
        direction2: "Gara de Nord"
      };

      return {
        line: line.number,
        type: line.type,
        destination: destinations.direction1, // În realitate, aici ar trebui să fie capătul de linie real
        arrivals: times.sort((a, b) => a - b)
      };
    });

    return arrivals;
  }
}

export const stbApi = new STBApi(); 