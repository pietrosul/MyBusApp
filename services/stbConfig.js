export const STB_API_CONFIG = {
  BASE_URL: 'https://info.stbsa.ro/rp/api',
  ENDPOINTS: {
    STOPS_IN_BOUNDS: '/lines/home/stops/{south}/{west}/{north}/{east}',
    ARRIVALS: '/lines/stations/{stationId}/arrivals',
    VEHICLES: '/vehicles/positions',
    LINES: '/lines'
  },
  DEFAULT_PARAMS: {
    lang: 'ro'
  }
}; 