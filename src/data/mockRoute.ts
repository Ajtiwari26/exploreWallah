/**
 * ExploreWallah - Mock Route Data
 * 
 * Realistic Himalayan trek route data for prototype testing.
 * This simulates the API response from /packages/:slug/route.
 * Route: Shimla → Kufri → Narkanda → Hatu Peak → Sarahan
 */

import type { RouteData } from '../types';

export const mockRouteData: RouteData = {
  id: 1,
  slug: 'kedarkantha-trek',
  title: 'Shimla Ridge to Sarahan Temple Trek',
  duration: '5 Days / 4 Nights',
  difficulty: 'Easy',
  price: '₹8,500',
  thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  category: 'Treks',
  season: 'Summer',
  state: 'Himachal Pradesh',
  description:
    'A breathtaking 5-day trek through the heart of Himachal Pradesh, passing through dense cedar forests, apple orchards, and ancient temple towns with panoramic views of the Greater Himalayan range.',
  route_geometry: {
    type: 'LineString',
    coordinates: [
      // Shimla (Start)
      [77.1734, 31.1048],
      [77.1801, 31.1095],
      [77.1889, 31.1132],
      // Transition to Kufri
      [77.2012, 31.1178],
      [77.2134, 31.1201],
      [77.2267, 31.1189],
      [77.2389, 31.1098],
      // Kufri
      [77.2620, 31.0962],
      [77.2798, 31.0878],
      // Transition to Narkanda
      [77.3012, 31.0912],
      [77.3245, 31.1023],
      [77.3489, 31.1156],
      [77.3712, 31.1289],
      [77.3956, 31.1389],
      [77.4189, 31.1456],
      [77.4423, 31.1512],
      // Narkanda
      [77.4567, 31.1567],
      // Transition to Hatu Peak
      [77.4689, 31.1623],
      [77.4812, 31.1689],
      [77.4923, 31.1756],
      [77.5034, 31.1834],
      // Hatu Peak
      [77.5123, 31.1912],
      // Transition to Sarahan
      [77.5289, 31.2034],
      [77.5467, 31.2156],
      [77.5634, 31.2289],
      [77.5812, 31.2423],
      [77.5989, 31.2534],
      [77.6167, 31.2612],
      [77.6345, 31.2689],
      [77.6512, 31.2756],
      [77.6689, 31.2834],
      [77.6856, 31.2912],
      [77.7012, 31.3023],
      [77.7189, 31.3112],
      [77.7345, 31.3189],
      [77.7512, 31.3267],
      [77.7689, 31.3345],
      // Sarahan (End)
      [77.7956, 31.5134],
    ],
  },
  waypoints: [
    {
      id: 1,
      name: 'Shimla',
      order: 1,
      description:
        'The "Queen of Hills" — starting point of the trek. Explore the Ridge, Mall Road, and Christ Church before the journey begins.',
      accommodation: 'Hotel Combermere, Shimla',
      coordinates: [77.1734, 31.1048],
    },
    {
      id: 2,
      name: 'Kufri',
      order: 2,
      description:
        'A small hill station famous for its stunning views and the Himalayan Nature Park. Elevation: 2,622m.',
      accommodation: 'Royal Tulip Kufri',
      coordinates: [77.2620, 31.0962],
    },
    {
      id: 3,
      name: 'Narkanda',
      order: 3,
      description:
        'Perched at 2,708m surrounded by apple orchards and thick deodar forests. The Hatu Temple sits on the summit above.',
      accommodation: 'HPTDC Hotel Hatu, Narkanda',
      coordinates: [77.4567, 31.1567],
    },
    {
      id: 4,
      name: 'Hatu Peak',
      order: 4,
      description:
        'The highest peak in the region at 3,400m. Home to the ancient Hatu Mata Temple with 360° views of snow-capped peaks.',
      accommodation: 'Forest Rest House, Hatu',
      coordinates: [77.5123, 31.1912],
    },
    {
      id: 5,
      name: 'Sarahan',
      order: 5,
      description:
        'Final destination — home to the magnificent Bhimakali Temple, a UNESCO-recognized architectural gem nestled at 2,165m.',
      accommodation: 'Hotel Shrikhand, Sarahan',
      coordinates: [77.7956, 31.5134],
    },
  ],
};
