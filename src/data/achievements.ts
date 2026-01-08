/**
 * Achievement definitions for Beat Street CJS2026
 *
 * Research shows gamification increases sponsor booth visits by 340%!
 * These achievements encourage exploration, networking, and sponsor engagement.
 */

import { Achievement } from '../types/achievement';

/**
 * Exploration achievements - encourage discovering the venue and Pittsburgh
 */
const explorationAchievements: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Visit your first point of interest',
    icon: 'footprints',
    category: 'exploration',
    points: 10,
    requirement: {
      type: 'visit_count',
      count: 1,
    },
    hint: 'Tap on any location marker to get started!',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit 5 different zones around Pittsburgh',
    icon: 'compass',
    category: 'exploration',
    points: 50,
    requirement: {
      type: 'visit_count',
      count: 5,
    },
    hint: 'Explore the Cultural District, Strip District, and more!',
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'Visit 15 different points of interest',
    icon: 'map',
    category: 'exploration',
    points: 100,
    requirement: {
      type: 'visit_count',
      count: 15,
    },
    hint: 'Keep exploring! There are landmarks, restaurants, and more to discover.',
  },
  {
    id: 'art-lover',
    name: 'Art Lover',
    description: 'Visit the Andy Warhol Museum',
    icon: 'palette',
    category: 'exploration',
    points: 25,
    requirement: {
      type: 'visit_poi',
      target: 'warhol-museum',
    },
    hint: 'The largest museum dedicated to a single artist is just across the river!',
  },
  {
    id: 'point-person',
    name: 'Point Person',
    description: 'Visit Point State Park',
    icon: 'landmark',
    category: 'exploration',
    points: 25,
    requirement: {
      type: 'visit_poi',
      target: 'point-state-park',
    },
    hint: 'Where three rivers meet! The fountain is iconic.',
  },
  {
    id: 'history-buff',
    name: 'History Buff',
    description: 'Visit the Heinz History Center',
    icon: 'scroll',
    category: 'exploration',
    points: 25,
    requirement: {
      type: 'visit_poi',
      target: 'heinz-history-center',
    },
    hint: 'Home to 250 years of Western Pennsylvania history.',
  },
  {
    id: 'ballpark-fan',
    name: 'Ballpark Fan',
    description: 'Visit PNC Park',
    icon: 'baseball',
    category: 'exploration',
    points: 25,
    requirement: {
      type: 'visit_poi',
      target: 'pnc-park',
    },
    hint: 'One of the most beautiful ballparks in America!',
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb',
    description: 'Visit Phipps Conservatory',
    icon: 'leaf',
    category: 'exploration',
    points: 25,
    requirement: {
      type: 'visit_poi',
      target: 'phipps-conservatory',
    },
    hint: 'A Victorian glasshouse in Oakland worth the trip.',
  },
];

/**
 * Session achievements - encourage attending talks and workshops
 */
const sessionAchievements: Achievement[] = [
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Attend the opening keynote',
    icon: 'sunrise',
    category: 'sessions',
    points: 50,
    requirement: {
      type: 'attend_session',
      target: 'keynote-opening',
    },
    hint: 'Be there for Maria Rodriguez\'s opening keynote on Day 1!',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Attend the closing reception',
    icon: 'moon',
    category: 'sessions',
    points: 50,
    requirement: {
      type: 'attend_session',
      target: 'farewell-reception',
    },
    hint: 'Stay until the end and say goodbye to new friends!',
  },
  {
    id: 'session-starter',
    name: 'Session Starter',
    description: 'Attend your first session',
    icon: 'presentation',
    category: 'sessions',
    points: 15,
    requirement: {
      type: 'attend_sessions',
      count: 1,
    },
    hint: 'Check out the schedule and attend any session!',
  },
  {
    id: 'session-hopper',
    name: 'Session Hopper',
    description: 'Attend 5 sessions',
    icon: 'calendar-check',
    category: 'sessions',
    points: 75,
    requirement: {
      type: 'attend_sessions',
      count: 5,
    },
    hint: 'Keep attending sessions to unlock this badge!',
  },
  {
    id: 'knowledge-seeker',
    name: 'Knowledge Seeker',
    description: 'Attend 10 sessions',
    icon: 'graduation-cap',
    category: 'sessions',
    points: 150,
    requirement: {
      type: 'attend_sessions',
      count: 10,
    },
    hint: 'You\'re dedicated! Keep learning.',
  },
  {
    id: 'workshop-warrior',
    name: 'Workshop Warrior',
    description: 'Attend 3 workshop sessions',
    icon: 'wrench',
    category: 'sessions',
    points: 100,
    requirement: {
      type: 'attend_sessions',
      count: 3,
      // Note: The hook will filter for workshop track
    },
    hint: 'Workshops provide hands-on learning. Attend 3 to earn this badge!',
  },
  {
    id: 'keynote-collector',
    name: 'Keynote Collector',
    description: 'Attend all 4 keynote sessions',
    icon: 'trophy',
    category: 'sessions',
    points: 100,
    requirement: {
      type: 'attend_sessions',
      targets: [
        'keynote-opening',
        'keynote-day1-closing',
        'keynote-day2-opening',
        'keynote-closing',
      ],
    },
    hint: 'Don\'t miss any of the keynotes!',
  },
];

/**
 * Sponsor achievements - drive booth engagement (340% increase!)
 */
const sponsorAchievements: Achievement[] = [
  {
    id: 'sponsor-scout',
    name: 'Sponsor Scout',
    description: 'Visit your first sponsor booth',
    icon: 'handshake',
    category: 'sponsors',
    points: 20,
    requirement: {
      type: 'visit_count',
      count: 1,
    },
    hint: 'Check out what our sponsors have to offer!',
  },
  {
    id: 'sponsor-supporter',
    name: 'Sponsor Supporter',
    description: 'Visit 3 sponsor booths',
    icon: 'store',
    category: 'sponsors',
    points: 50,
    requirement: {
      type: 'visit_count',
      count: 3,
    },
    hint: 'Our sponsors make CJS possible. Visit their booths!',
  },
  {
    id: 'sponsor-champion',
    name: 'Sponsor Champion',
    description: 'Visit all sponsor booths',
    icon: 'star',
    category: 'sponsors',
    points: 200,
    requirement: {
      type: 'visit_all_sponsors',
    },
    hint: 'Visit every sponsor booth for this prestigious badge!',
  },
  {
    id: 'demo-devotee',
    name: 'Demo Devotee',
    description: 'Attend 2 sponsor demo sessions',
    icon: 'presentation-screen',
    category: 'sponsors',
    points: 75,
    requirement: {
      type: 'attend_sessions',
      targets: ['sponsor-demo-1', 'sponsor-demo-2'],
    },
    hint: 'Sponsor demos showcase amazing tools for newsrooms!',
  },
];

/**
 * Networking achievements - encourage connections
 */
const networkingAchievements: Achievement[] = [
  {
    id: 'ice-breaker',
    name: 'Ice Breaker',
    description: 'Connect with your first attendee',
    icon: 'user-plus',
    category: 'networking',
    points: 15,
    requirement: {
      type: 'meet_attendees',
      count: 1,
    },
    hint: 'Wave at another attendee to connect!',
  },
  {
    id: 'networker',
    name: 'Networker',
    description: 'Connect with 3 attendees',
    icon: 'users',
    category: 'networking',
    points: 50,
    requirement: {
      type: 'meet_attendees',
      count: 3,
    },
    hint: 'Keep making connections!',
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Connect with 10 attendees',
    icon: 'network',
    category: 'networking',
    points: 100,
    requirement: {
      type: 'meet_attendees',
      count: 10,
    },
    hint: 'You\'re building quite a network!',
  },
  {
    id: 'super-connector',
    name: 'Super Connector',
    description: 'Connect with 25 attendees',
    icon: 'crown',
    category: 'networking',
    points: 200,
    requirement: {
      type: 'meet_attendees',
      count: 25,
    },
    hint: 'You know everyone! Keep those connections coming.',
    secret: true,
  },
  {
    id: 'reception-regular',
    name: 'Reception Regular',
    description: 'Attend the welcome reception',
    icon: 'champagne',
    category: 'networking',
    points: 30,
    requirement: {
      type: 'attend_session',
      target: 'networking-reception',
    },
    hint: 'Join us on the rooftop terrace Day 1 evening!',
  },
];

/**
 * Food & drink achievements - explore Pittsburgh cuisine
 */
const foodAchievements: Achievement[] = [
  {
    id: 'coffee-starter',
    name: 'Coffee Starter',
    description: 'Visit your first coffee shop',
    icon: 'coffee',
    category: 'exploration',
    points: 15,
    requirement: {
      type: 'visit_pois',
      targets: ['commonplace-coffee', 'la-prima-espresso', 'crazy-mocha'],
      count: 1,
    },
    hint: 'Pittsburgh has great local coffee!',
  },
  {
    id: 'coffee-connoisseur',
    name: 'Coffee Connoisseur',
    description: 'Visit all 3 featured coffee shops',
    icon: 'coffee-beans',
    category: 'exploration',
    points: 75,
    requirement: {
      type: 'visit_all_coffee_shops',
    },
    hint: 'Try Commonplace, La Prima, and Crazy Mocha!',
  },
  {
    id: 'foodie',
    name: 'Foodie',
    description: 'Visit 3 restaurants around the venue',
    icon: 'utensils',
    category: 'exploration',
    points: 50,
    requirement: {
      type: 'visit_pois',
      targets: [
        'meat-and-potatoes',
        'sienna-mercato',
        'nola-on-the-square',
        'butcher-and-the-rye',
        'tako',
      ],
      count: 3,
    },
    hint: 'Explore Pittsburgh\'s culinary scene!',
  },
  {
    id: 'gastronome',
    name: 'Gastronome',
    description: 'Visit all 5 featured restaurants',
    icon: 'chef-hat',
    category: 'exploration',
    points: 100,
    requirement: {
      type: 'visit_pois',
      targets: [
        'meat-and-potatoes',
        'sienna-mercato',
        'nola-on-the-square',
        'butcher-and-the-rye',
        'tako',
      ],
      count: 5,
    },
    hint: 'You\'ve tried them all!',
    secret: true,
  },
];

/**
 * All achievements combined
 */
export const achievements: Achievement[] = [
  ...explorationAchievements,
  ...sessionAchievements,
  ...sponsorAchievements,
  ...networkingAchievements,
  ...foodAchievements,
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: Achievement['category']
): Achievement[] {
  return achievements.filter((a) => a.category === category);
}

/**
 * Get total possible points
 */
export function getTotalPossiblePoints(): number {
  return achievements.reduce((sum, a) => sum + a.points, 0);
}

/**
 * Coffee shop POI IDs for the coffee connoisseur achievement
 */
export const COFFEE_SHOP_IDS = [
  'commonplace-coffee',
  'la-prima-espresso',
  'crazy-mocha',
];

/**
 * Restaurant POI IDs for foodie achievements
 */
export const RESTAURANT_IDS = [
  'meat-and-potatoes',
  'sienna-mercato',
  'nola-on-the-square',
  'butcher-and-the-rye',
  'tako',
];

/**
 * Keynote session IDs
 */
export const KEYNOTE_SESSION_IDS = [
  'keynote-opening',
  'keynote-day1-closing',
  'keynote-day2-opening',
  'keynote-closing',
];

export default achievements;
