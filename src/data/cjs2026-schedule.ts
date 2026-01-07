/**
 * Sample schedule data for CJS2026 (June 8-9, 2026)
 * This data can be replaced with live data from a CMS or API
 */

import { Session } from '../types/schedule';
import { VenueId } from '../types/venue';

/**
 * Helper to create Date objects for the conference
 * CJS2026: June 8-9, 2026
 */
function conferenceDate(
  day: 8 | 9,
  hour: number,
  minute: number = 0
): Date {
  return new Date(2026, 5, day, hour, minute, 0); // Month is 0-indexed (5 = June)
}

/**
 * Day 1 Sessions - June 8, 2026
 */
const day1Sessions: Session[] = [
  // Morning Keynote
  {
    id: 'keynote-opening',
    title: 'Opening Keynote: The Future of Local News',
    description:
      'Join us as we explore the evolving landscape of local journalism and the technologies shaping its future. This keynote will set the stage for two days of learning, networking, and collaboration.',
    speaker: 'Maria Rodriguez',
    speakerTitle: 'Executive Director, Local News Initiative',
    startTime: conferenceDate(8, 9, 0),
    endTime: conferenceDate(8, 10, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Main Hall',
    track: 'keynote',
    tags: ['local-news', 'innovation', 'opening'],
    capacity: 500,
  },

  // Morning Breakout Session 1 (10:15 - 11:15)
  {
    id: 'session-ai-newsroom',
    title: 'AI in the Newsroom: Practical Applications',
    description:
      'Learn how newsrooms are successfully integrating AI tools into their workflows without compromising editorial integrity. We will cover content generation, fact-checking, and audience engagement.',
    speaker: 'James Chen',
    speakerTitle: 'Tech Editor, Metro News Network',
    startTime: conferenceDate(8, 10, 15),
    endTime: conferenceDate(8, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['ai', 'technology', 'workflow'],
    capacity: 75,
  },
  {
    id: 'session-community-engagement',
    title: 'Community Engagement Strategies That Work',
    description:
      'Discover proven methods for building meaningful connections with your audience. From events to social media, learn what actually drives engagement in 2026.',
    speaker: 'Aisha Patel',
    speakerTitle: 'Engagement Director, The Charlotte Observer',
    startTime: conferenceDate(8, 10, 15),
    endTime: conferenceDate(8, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['engagement', 'community', 'social-media'],
    capacity: 50,
  },
  {
    id: 'workshop-podcast',
    title: 'Workshop: Launch Your Newsroom Podcast',
    description:
      'Hands-on session covering equipment, software, distribution, and monetization for news podcasts. Bring your laptop!',
    speaker: 'Marcus Williams',
    speakerTitle: 'Audio Producer, PRX',
    startTime: conferenceDate(8, 10, 15),
    endTime: conferenceDate(8, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Workshop Room 1',
    track: 'workshop',
    tags: ['podcast', 'audio', 'hands-on'],
    capacity: 30,
  },

  // Morning Breakout Session 2 (11:30 - 12:30)
  {
    id: 'session-revenue',
    title: 'Revenue Diversification: Beyond Subscriptions',
    description:
      'Explore multiple revenue streams including memberships, events, sponsored content, and grants. Real case studies from successful local outlets.',
    speaker: 'Dr. Sandra Kim',
    speakerTitle: 'Director, Media Revenue Lab',
    startTime: conferenceDate(8, 11, 30),
    endTime: conferenceDate(8, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['revenue', 'business', 'sustainability'],
    capacity: 75,
  },
  {
    id: 'session-data-journalism',
    title: 'Data Journalism on a Local Budget',
    description:
      'You do not need a large data team to do impactful data journalism. Learn free tools and techniques for compelling data stories.',
    speaker: 'Tom Alvarez',
    speakerTitle: 'Data Reporter, The Texas Tribune',
    startTime: conferenceDate(8, 11, 30),
    endTime: conferenceDate(8, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['data', 'tools', 'investigation'],
    capacity: 50,
  },
  {
    id: 'workshop-newsletter',
    title: 'Workshop: Newsletter Mastery',
    description:
      'Build and grow email newsletters that readers actually open. Covers design, cadence, segmentation, and conversion.',
    speaker: 'Emily Foster',
    speakerTitle: 'Newsletter Strategist, Substack',
    startTime: conferenceDate(8, 11, 30),
    endTime: conferenceDate(8, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Workshop Room 1',
    track: 'workshop',
    tags: ['newsletter', 'email', 'audience'],
    capacity: 30,
  },

  // Lunch Break
  {
    id: 'lunch-day1',
    title: 'Lunch Break',
    description:
      'Enjoy lunch in the dining hall and connect with fellow attendees. Vegetarian, vegan, and gluten-free options available.',
    startTime: conferenceDate(8, 12, 30),
    endTime: conferenceDate(8, 13, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Dining Hall',
    track: 'break',
    isBreak: true,
  },

  // Sponsor Demo Block (1:30 - 2:30)
  {
    id: 'sponsor-demo-1',
    title: 'Sponsor Demo: NewsGuard Enterprise',
    description:
      'See how NewsGuard is helping newsrooms combat misinformation with AI-powered credibility tools.',
    speaker: 'Rachel Stone',
    speakerTitle: 'VP Partnerships, NewsGuard',
    startTime: conferenceDate(8, 13, 30),
    endTime: conferenceDate(8, 14, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Demo Theater',
    track: 'sponsor',
    tags: ['sponsor', 'misinformation', 'tools'],
    capacity: 40,
  },
  {
    id: 'sponsor-demo-2',
    title: 'Sponsor Demo: Chartbeat Analytics',
    description:
      'Real-time audience insights that help you create more engaging content.',
    speaker: 'Mike Patterson',
    speakerTitle: 'Solutions Engineer, Chartbeat',
    startTime: conferenceDate(8, 14, 0),
    endTime: conferenceDate(8, 14, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Demo Theater',
    track: 'sponsor',
    tags: ['sponsor', 'analytics', 'audience'],
    capacity: 40,
  },

  // Afternoon Breakout Session 1 (2:45 - 3:45)
  {
    id: 'session-video-strategy',
    title: 'Video Strategy for Local News',
    description:
      'From TikTok to YouTube, learn how local newsrooms are reaching new audiences with video content.',
    speaker: 'Jessica Park',
    speakerTitle: 'Video Director, WRAL',
    startTime: conferenceDate(8, 14, 45),
    endTime: conferenceDate(8, 15, 45),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['video', 'social-media', 'audience'],
    capacity: 75,
  },
  {
    id: 'session-trust-building',
    title: 'Rebuilding Trust in Local Media',
    description:
      'Strategies for overcoming skepticism and building lasting trust with your community.',
    speaker: 'Dr. Angela Howard',
    speakerTitle: 'Professor, UNC School of Media',
    startTime: conferenceDate(8, 14, 45),
    endTime: conferenceDate(8, 15, 45),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['trust', 'community', 'credibility'],
    capacity: 50,
  },
  {
    id: 'workshop-seo',
    title: 'Workshop: SEO for News Sites',
    description:
      'Technical SEO strategies specifically for news sites. Google News optimization, schema markup, and more.',
    speaker: 'David Martinez',
    speakerTitle: 'SEO Lead, Gannett',
    startTime: conferenceDate(8, 14, 45),
    endTime: conferenceDate(8, 15, 45),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Workshop Room 1',
    track: 'workshop',
    tags: ['seo', 'technical', 'google'],
    capacity: 30,
  },

  // Coffee Break
  {
    id: 'coffee-day1',
    title: 'Coffee Break',
    description:
      'Grab a coffee and network in the sponsor expo area.',
    startTime: conferenceDate(8, 15, 45),
    endTime: conferenceDate(8, 16, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Expo Hall',
    track: 'break',
    isBreak: true,
  },

  // Afternoon Breakout Session 2 (4:15 - 5:15)
  {
    id: 'session-elections',
    title: 'Covering Elections in the AI Age',
    description:
      'Preparing your newsroom for 2026 midterms: deepfakes, misinformation, and voter engagement.',
    speaker: 'Patricia Grant',
    speakerTitle: 'Political Editor, AP',
    startTime: conferenceDate(8, 16, 15),
    endTime: conferenceDate(8, 17, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['elections', 'politics', 'misinformation'],
    capacity: 75,
  },
  {
    id: 'session-nonprofit-news',
    title: 'The Nonprofit News Model',
    description:
      'How nonprofit newsrooms are finding sustainable paths forward. Funding, governance, and editorial independence.',
    speaker: 'Richard Torres',
    speakerTitle: 'CEO, Institute for Nonprofit News',
    startTime: conferenceDate(8, 16, 15),
    endTime: conferenceDate(8, 17, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['nonprofit', 'funding', 'sustainability'],
    capacity: 50,
  },

  // Closing Keynote Day 1
  {
    id: 'keynote-day1-closing',
    title: 'Closing Keynote: Stories That Changed Communities',
    description:
      'Hear from journalists whose local reporting led to real policy changes and community impact.',
    speaker: 'Omar Jackson',
    speakerTitle: 'Pulitzer Prize-winning Reporter',
    startTime: conferenceDate(8, 17, 30),
    endTime: conferenceDate(8, 18, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Main Hall',
    track: 'keynote',
    tags: ['impact', 'storytelling', 'inspiration'],
    capacity: 500,
  },

  // Evening Networking
  {
    id: 'networking-reception',
    title: 'Welcome Reception',
    description:
      'Join us for appetizers, drinks, and networking on the rooftop terrace. Cash bar available.',
    startTime: conferenceDate(8, 19, 0),
    endTime: conferenceDate(8, 21, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Rooftop Terrace',
    track: 'networking',
    tags: ['networking', 'social', 'evening'],
  },
];

/**
 * Day 2 Sessions - June 9, 2026
 */
const day2Sessions: Session[] = [
  // Morning Keynote
  {
    id: 'keynote-day2-opening',
    title: 'Day 2 Keynote: Building Sustainable Newsrooms',
    description:
      'A deep dive into the business models, partnerships, and innovations keeping local journalism alive and thriving.',
    speaker: 'Linda Cho',
    speakerTitle: 'Founder, Sustainable News Initiative',
    startTime: conferenceDate(9, 9, 0),
    endTime: conferenceDate(9, 10, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Main Hall',
    track: 'keynote',
    tags: ['sustainability', 'business', 'opening'],
    capacity: 500,
  },

  // Morning Breakout Session 1 (10:15 - 11:15)
  {
    id: 'session-collaborative-journalism',
    title: 'Collaborative Journalism Networks',
    description:
      'How newsrooms are sharing resources, stories, and expertise to do more with less.',
    speaker: 'Hannah Brooks',
    speakerTitle: 'Director, Center for Cooperative Media',
    startTime: conferenceDate(9, 10, 15),
    endTime: conferenceDate(9, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['collaboration', 'partnership', 'resources'],
    capacity: 75,
  },
  {
    id: 'session-mobile-first',
    title: 'Mobile-First News Design',
    description:
      'Your audience is on mobile. Is your content? UX principles for mobile news consumption.',
    speaker: 'Kevin Wu',
    speakerTitle: 'Product Director, The Athletic',
    startTime: conferenceDate(9, 10, 15),
    endTime: conferenceDate(9, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['mobile', 'design', 'ux'],
    capacity: 50,
  },
  {
    id: 'workshop-fundraising',
    title: 'Workshop: Grant Writing for Newsrooms',
    description:
      'Practical grant writing workshop with real application exercises. Bring a project idea!',
    speaker: 'Nancy Reynolds',
    speakerTitle: 'Grant Specialist, Knight Foundation',
    startTime: conferenceDate(9, 10, 15),
    endTime: conferenceDate(9, 11, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Workshop Room 1',
    track: 'workshop',
    tags: ['grants', 'funding', 'writing'],
    capacity: 30,
  },

  // Morning Breakout Session 2 (11:30 - 12:30)
  {
    id: 'session-climate',
    title: 'Covering Climate at the Local Level',
    description:
      'Making climate change relevant and actionable for local audiences. Story angles and data sources.',
    speaker: 'Dr. Michael Green',
    speakerTitle: 'Environment Reporter, NPR',
    startTime: conferenceDate(9, 11, 30),
    endTime: conferenceDate(9, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['climate', 'environment', 'local'],
    capacity: 75,
  },
  {
    id: 'session-dei-coverage',
    title: 'Equity in Coverage and Newsrooms',
    description:
      'Ensuring your coverage and hiring reflect your community. Strategies for meaningful change.',
    speaker: 'Jasmine Washington',
    speakerTitle: 'DEI Director, Poynter Institute',
    startTime: conferenceDate(9, 11, 30),
    endTime: conferenceDate(9, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['dei', 'equity', 'representation'],
    capacity: 50,
  },
  {
    id: 'workshop-social',
    title: 'Workshop: Social Media Strategy',
    description:
      'Platform-by-platform breakdown of what works in 2026. Algorithm tips and content planning.',
    speaker: 'Tyler Johnson',
    speakerTitle: 'Social Media Manager, Vox Media',
    startTime: conferenceDate(9, 11, 30),
    endTime: conferenceDate(9, 12, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Workshop Room 1',
    track: 'workshop',
    tags: ['social-media', 'strategy', 'platforms'],
    capacity: 30,
  },

  // Lunch Break
  {
    id: 'lunch-day2',
    title: 'Lunch Break & Roundtables',
    description:
      'Themed roundtable discussions during lunch. Sign up at the registration desk for your preferred topic.',
    startTime: conferenceDate(9, 12, 30),
    endTime: conferenceDate(9, 13, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Dining Hall',
    track: 'break',
    isBreak: true,
  },

  // Lightning Talks (1:30 - 2:30)
  {
    id: 'lightning-talks',
    title: 'Lightning Talks: Innovation Showcase',
    description:
      'Rapid-fire 5-minute presentations from newsrooms trying bold new things. Audience voting for best idea!',
    startTime: conferenceDate(9, 13, 30),
    endTime: conferenceDate(9, 14, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Main Hall',
    track: 'main',
    tags: ['innovation', 'ideas', 'showcase'],
    capacity: 500,
  },

  // Afternoon Breakout Session 1 (2:45 - 3:45)
  {
    id: 'session-audience-research',
    title: 'Understanding Your Audience (Really)',
    description:
      'Move beyond demographics to understand what your community actually needs from local news.',
    speaker: 'Carmen Diaz',
    speakerTitle: 'Research Director, American Press Institute',
    startTime: conferenceDate(9, 14, 45),
    endTime: conferenceDate(9, 15, 45),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room A',
    track: 'main',
    tags: ['audience', 'research', 'engagement'],
    capacity: 75,
  },
  {
    id: 'session-freelance',
    title: 'Building a Freelance Network',
    description:
      'How small newsrooms can work effectively with freelancers. Budgeting, editing, and relationship building.',
    speaker: 'Robert Kim',
    speakerTitle: 'Managing Editor, Billy Penn',
    startTime: conferenceDate(9, 14, 45),
    endTime: conferenceDate(9, 15, 45),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Room B',
    track: 'main',
    tags: ['freelance', 'management', 'budget'],
    capacity: 50,
  },

  // Coffee Break
  {
    id: 'coffee-day2',
    title: 'Coffee Break',
    description:
      'Last chance to visit sponsor booths and collect your swag!',
    startTime: conferenceDate(9, 15, 45),
    endTime: conferenceDate(9, 16, 15),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Expo Hall',
    track: 'break',
    isBreak: true,
  },

  // Unconference / Open Sessions (4:15 - 5:00)
  {
    id: 'unconference',
    title: 'Unconference Sessions',
    description:
      'Attendee-led discussions on topics you choose. Check the board in the lobby for room assignments.',
    startTime: conferenceDate(9, 16, 15),
    endTime: conferenceDate(9, 17, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Various Rooms',
    track: 'networking',
    tags: ['unconference', 'discussion', 'community'],
  },

  // Closing Keynote
  {
    id: 'keynote-closing',
    title: 'Closing Keynote: The Road Ahead',
    description:
      'A look at what is next for local journalism, featuring announcements about next year\'s conference and new CJS initiatives.',
    speaker: 'Dr. Patricia Morrison',
    speakerTitle: 'Dean, Columbia Journalism School',
    startTime: conferenceDate(9, 17, 0),
    endTime: conferenceDate(9, 18, 0),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Main Hall',
    track: 'keynote',
    tags: ['closing', 'future', 'announcements'],
    capacity: 500,
  },

  // Farewell Reception
  {
    id: 'farewell-reception',
    title: 'Farewell Reception',
    description:
      'Say goodbye to new friends and make plans for next year. Light refreshments provided.',
    startTime: conferenceDate(9, 18, 0),
    endTime: conferenceDate(9, 19, 30),
    venueId: VenueId.CHAPEL_HILL,
    room: 'Lobby',
    track: 'networking',
    tags: ['networking', 'farewell', 'closing'],
  },
];

/**
 * Complete CJS2026 schedule
 */
export const cjs2026Schedule: Session[] = [...day1Sessions, ...day2Sessions];

/**
 * Get all unique rooms from the schedule
 */
export function getScheduleRooms(venueId?: VenueId): string[] {
  const sessions = venueId
    ? cjs2026Schedule.filter((s) => s.venueId === venueId)
    : cjs2026Schedule;

  const rooms = new Set(sessions.map((s) => s.room).filter(Boolean) as string[]);
  return Array.from(rooms).sort();
}

/**
 * Get all unique tracks from the schedule
 */
export function getScheduleTracks(): string[] {
  const tracks = new Set(
    cjs2026Schedule.map((s) => s.track).filter(Boolean) as string[]
  );
  return Array.from(tracks).sort();
}

/**
 * Get conference dates
 */
export const conferenceInfo = {
  name: 'CJS2026',
  dates: {
    day1: new Date(2026, 5, 8),
    day2: new Date(2026, 5, 9),
  },
  timezone: 'America/New_York',
};
