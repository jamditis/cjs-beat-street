/**
 * Pittsburgh POI seed data for Beat Street CJS2026
 * Conference dates: June 8-9, 2026
 *
 * This is a simplified version for Cloud Functions that doesn't depend on
 * the main src/types imports. The full version with types is in:
 * src/data/pittsburgh-pois.ts
 */

/**
 * POI Type enum (must match src/types/poi.ts)
 */
export enum POIType {
  SESSION = "session",
  SPONSOR = "sponsor",
  FOOD = "food",
  LANDMARK = "landmark",
  SOCIAL = "social",
  INFO = "info",
}

/**
 * Venue ID enum (must match src/types/venue.ts)
 */
export enum VenueId {
  CHAPEL_HILL = "chapel-hill",
  PITTSBURGH = "pittsburgh",
  PHILADELPHIA = "philadelphia",
}

/**
 * POI data interface for seeding
 */
export interface POIData {
  id: string;
  type: POIType;
  name: string;
  description?: string;
  position: {
    x: number;
    y: number;
    floor?: number;
    zone?: string;
    venueId?: VenueId;
    mapId?: string;
  };
  floor?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  isPulsing?: boolean;
  venueId?: VenueId;
  mapId?: string;
}

/**
 * Zone definitions for Pittsburgh downtown area
 */
export const PITTSBURGH_ZONES = {
  CONVENTION_CENTER: "convention-center",
  CULTURAL_DISTRICT: "cultural-district",
  STRIP_DISTRICT: "strip-district",
  DOWNTOWN: "downtown",
  NORTH_SHORE: "north-shore",
  POINT_STATE_PARK: "point-state-park",
  OAKLAND: "oakland",
} as const;

/**
 * Conference venues - main conference locations
 */
const conferenceVenues: POIData[] = [
  {
    id: "dlcc-main",
    type: POIType.LANDMARK,
    name: "David L. Lawrence Convention Center",
    description:
      "Main venue for CJS2026. LEED-certified green building with spectacular views of the Allegheny River. Sessions in Halls A-D and meeting rooms.",
    position: {
      x: 500,
      y: 300,
      zone: PITTSBURGH_ZONES.CONVENTION_CENTER,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Opened in 2003, the DLCC is one of the largest green convention centers in the world, featuring a naturally ventilated exhibit hall.",
      photoOpportunity: true,
    },
  },
  {
    id: "westin-hotel",
    type: POIType.LANDMARK,
    name: "Westin Convention Center Pittsburgh",
    description:
      "Connected directly to the convention center via skywalk. Official conference hotel with special CJS2026 rates.",
    position: {
      x: 450,
      y: 280,
      zone: PITTSBURGH_ZONES.CONVENTION_CENTER,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Modern hotel connected to DLCC, featuring 616 guest rooms and suites.",
      photoOpportunity: false,
    },
  },
  {
    id: "omni-william-penn",
    type: POIType.LANDMARK,
    name: "Omni William Penn Hotel",
    description:
      "Historic overflow hotel in the heart of downtown. Opened in 1916, this landmark hotel offers old-world elegance.",
    position: {
      x: 520,
      y: 450,
      zone: PITTSBURGH_ZONES.DOWNTOWN,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Built by Henry Clay Frick in 1916, the William Penn has hosted every U.S. president since Teddy Roosevelt.",
      photoOpportunity: true,
    },
  },
];

/**
 * Restaurants near the Convention Center
 */
const restaurants: POIData[] = [
  {
    id: "meat-and-potatoes",
    type: POIType.FOOD,
    name: "Meat & Potatoes",
    description:
      "Upscale gastropub known for creative American comfort food and craft cocktails. Great for networking dinners.",
    position: {
      x: 480,
      y: 380,
      zone: PITTSBURGH_ZONES.CULTURAL_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "American gastropub",
      dietaryOptions: ["vegetarian", "gluten-free options"],
      hours: "Mon-Thu 5pm-10pm, Fri-Sat 5pm-11pm, Sun 10am-2pm & 5pm-9pm",
    },
  },
  {
    id: "sienna-mercato",
    type: POIType.FOOD,
    name: "Sienna Mercato",
    description:
      "Three-story Italian marketplace with meatball shop (ground floor), pizzeria (second floor), and rooftop bar.",
    position: {
      x: 490,
      y: 390,
      zone: PITTSBURGH_ZONES.CULTURAL_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Italian",
      dietaryOptions: ["vegetarian", "vegan options"],
      hours: "Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 11am-9pm",
    },
  },
  {
    id: "nola-on-the-square",
    type: POIType.FOOD,
    name: "Nola on the Square",
    description:
      "New Orleans-inspired Southern cuisine in the heart of Market Square. Live jazz on weekends.",
    position: {
      x: 510,
      y: 420,
      zone: PITTSBURGH_ZONES.DOWNTOWN,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Southern/Cajun",
      dietaryOptions: ["gluten-free options"],
      hours: "Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 10am-9pm",
    },
  },
  {
    id: "butcher-and-the-rye",
    type: POIType.FOOD,
    name: "Butcher and the Rye",
    description:
      "Award-winning whiskey bar and restaurant with over 500 whiskeys. Industrial-chic atmosphere perfect for evening networking.",
    position: {
      x: 470,
      y: 400,
      zone: PITTSBURGH_ZONES.CULTURAL_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "American contemporary",
      dietaryOptions: ["vegetarian", "gluten-free options"],
      hours: "Mon-Thu 5pm-10pm, Fri-Sat 5pm-11pm, Sun closed",
    },
  },
  {
    id: "tako",
    type: POIType.FOOD,
    name: "Tako",
    description:
      "Modern Mexican street food with creative tacos and margaritas. Casual spot for quick lunches.",
    position: {
      x: 485,
      y: 375,
      zone: PITTSBURGH_ZONES.CULTURAL_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Mexican",
      dietaryOptions: ["vegetarian", "vegan options", "gluten-free options"],
      hours: "Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 11am-9pm",
    },
  },
];

/**
 * Pittsburgh attractions
 */
const attractions: POIData[] = [
  {
    id: "point-state-park",
    type: POIType.LANDMARK,
    name: "Point State Park",
    description:
      "Iconic park at the confluence of three rivers with the famous 150-foot fountain. 10-minute walk from the convention center.",
    position: {
      x: 300,
      y: 500,
      zone: PITTSBURGH_ZONES.POINT_STATE_PARK,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Site of Fort Pitt (1758) and Fort Duquesne. The fountain operates April-October.",
      photoOpportunity: true,
    },
  },
  {
    id: "warhol-museum",
    type: POIType.LANDMARK,
    name: "Andy Warhol Museum",
    description:
      "The largest museum dedicated to a single artist in North America. Andy Warhol was born in Pittsburgh.",
    position: {
      x: 520,
      y: 200,
      zone: PITTSBURGH_ZONES.NORTH_SHORE,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Seven floors of Warhol art, archives, and installations. The Silver Clouds room is a must-see.",
      photoOpportunity: true,
    },
  },
  {
    id: "heinz-history-center",
    type: POIType.LANDMARK,
    name: "Heinz History Center",
    description:
      "Smithsonian affiliate exploring 250 years of Western Pennsylvania history. Home of the Western Pennsylvania Sports Museum.",
    position: {
      x: 600,
      y: 350,
      zone: PITTSBURGH_ZONES.STRIP_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Located in a restored ice house from 1898. Features Mister Rogers Neighborhood exhibit.",
      photoOpportunity: true,
    },
  },
  {
    id: "pnc-park",
    type: POIType.LANDMARK,
    name: "PNC Park",
    description:
      "Home of the Pittsburgh Pirates. Consistently ranked as one of the best ballparks in America with stunning city views.",
    position: {
      x: 480,
      y: 150,
      zone: PITTSBURGH_ZONES.NORTH_SHORE,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Opened in 2001, seats 38,362 fans. The Roberto Clemente Bridge closes to traffic on game days.",
      photoOpportunity: true,
    },
  },
  {
    id: "phipps-conservatory",
    type: POIType.LANDMARK,
    name: "Phipps Conservatory",
    description:
      "One of the greenest facilities in the world. Beautiful Victorian glasshouse with stunning botanical displays.",
    position: {
      x: 800,
      y: 600,
      zone: PITTSBURGH_ZONES.OAKLAND,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      historicalInfo:
        "Gift to the city from steel magnate Henry Phipps in 1893. The Tropical Forest Conservatory is spectacular.",
      photoOpportunity: true,
    },
  },
];

/**
 * Coffee shops near the Convention Center
 */
const coffeeShops: POIData[] = [
  {
    id: "commonplace-coffee",
    type: POIType.FOOD,
    name: "Commonplace Coffee",
    description:
      "Local Pittsburgh roaster with excellent single-origin coffees. Multiple downtown locations.",
    position: {
      x: 530,
      y: 360,
      zone: PITTSBURGH_ZONES.CULTURAL_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Coffee shop",
      dietaryOptions: ["vegan milk options", "gluten-free pastries"],
      hours: "Mon-Fri 7am-6pm, Sat-Sun 8am-5pm",
    },
  },
  {
    id: "la-prima-espresso",
    type: POIType.FOOD,
    name: "La Prima Espresso",
    description:
      "Pittsburgh institution since 1988. Italian-style espresso bar in the Strip District. Worth the walk!",
    position: {
      x: 620,
      y: 320,
      zone: PITTSBURGH_ZONES.STRIP_DISTRICT,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Italian espresso bar",
      dietaryOptions: ["vegan milk options"],
      hours: "Mon-Fri 6am-4pm, Sat 7am-4pm, Sun 8am-3pm",
    },
  },
  {
    id: "crazy-mocha",
    type: POIType.FOOD,
    name: "Crazy Mocha",
    description:
      "Local chain with a convenient downtown location. Good wifi and comfortable seating for work sessions.",
    position: {
      x: 495,
      y: 430,
      zone: PITTSBURGH_ZONES.DOWNTOWN,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      menuType: "Coffee shop",
      dietaryOptions: ["vegan milk options", "vegetarian food"],
      hours: "Mon-Fri 6:30am-7pm, Sat 7am-6pm, Sun 8am-5pm",
    },
  },
];

/**
 * Conference info points
 */
const infoPOIs: POIData[] = [
  {
    id: "registration-desk",
    type: POIType.INFO,
    name: "CJS2026 Registration",
    description:
      "Main registration desk for badge pickup and information. Located in DLCC Hall A lobby.",
    position: {
      x: 500,
      y: 310,
      zone: PITTSBURGH_ZONES.CONVENTION_CENTER,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      services: [
        "badge pickup",
        "schedule info",
        "lost and found",
        "accessibility assistance",
      ],
      hours: "June 8: 7am-6pm, June 9: 7:30am-4pm",
    },
  },
  {
    id: "media-room",
    type: POIType.INFO,
    name: "Media Room",
    description:
      "Workspace for journalists covering CJS2026. Power outlets, wifi, and quiet work space.",
    position: {
      x: 510,
      y: 320,
      zone: PITTSBURGH_ZONES.CONVENTION_CENTER,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      services: ["wifi", "power outlets", "printing", "interview space"],
      hours: "June 8-9: 7am-7pm",
    },
  },
];

/**
 * Social/networking spaces
 */
const socialPOIs: POIData[] = [
  {
    id: "networking-lounge",
    type: POIType.SOCIAL,
    name: "Networking Lounge",
    description:
      "Casual meetup space in DLCC for spontaneous conversations. Coffee and light snacks available.",
    position: {
      x: 490,
      y: 330,
      zone: PITTSBURGH_ZONES.CONVENTION_CENTER,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      capacity: 100,
      amenities: ["seating", "coffee", "charging stations", "coat check nearby"],
    },
  },
  {
    id: "market-square",
    type: POIType.SOCIAL,
    name: "Market Square",
    description:
      "Historic public square surrounded by restaurants and shops. Popular evening gathering spot for conference attendees.",
    position: {
      x: 515,
      y: 440,
      zone: PITTSBURGH_ZONES.DOWNTOWN,
      venueId: VenueId.PITTSBURGH,
      mapId: "outdoor",
    },
    isActive: true,
    metadata: {
      capacity: 500,
      amenities: ["outdoor seating", "restaurants", "public wifi"],
    },
  },
];

/**
 * All Pittsburgh POIs combined
 */
export const pittsburghPOIs: POIData[] = [
  ...conferenceVenues,
  ...restaurants,
  ...attractions,
  ...coffeeShops,
  ...infoPOIs,
  ...socialPOIs,
];

export default pittsburghPOIs;
