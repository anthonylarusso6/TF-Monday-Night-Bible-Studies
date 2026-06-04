export interface TopicItem {
  label: string;
}

export interface TopicCategory {
  name: string;
  icon: string;
  topics: string[];
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: "Identity & Worth",
    icon: "🪞",
    topics: [
      "Identity — Who You Are in Christ",
      "Anxiety & Worry",
      "Depression & Dark Seasons",
      "Perfectionism: When Good Enough Feels Like Never Enough",
      "Comparison & Jealousy",
      "Body Image & Insecurity",
      "Grief & Loss",
      "Healing — Emotional & Spiritual",
      "Loneliness & Feeling Unseen",
    ],
  },
  {
    name: "Faith & Prayer",
    icon: "🙏",
    topics: [
      "Prayer — Actually Talking to God",
      "Faith Over Fear",
      "Doubt & Unanswered Questions",
      "Trust — When Life Doesn't Make Sense",
      "Surrender — Letting Go & Letting God",
      "Reading the Bible — Making It Real",
      "Conviction vs. Condemnation",
      "Hearing God's Voice",
    ],
  },
  {
    name: "Character & Discipline",
    icon: "⚔️",
    topics: [
      "Integrity When No One Is Watching",
      "Discipline That Develops You",
      "Anger & Self-Control",
      "Handling Temptation — Standing Strong",
      "Handling Failure & Mistakes",
      "Humility in Victory and Defeat",
      "The Tongue & Self-Control",
      "Work Ethic — Training Like It Matters",
    ],
  },
  {
    name: "Relationships",
    icon: "🤝",
    topics: [
      "Friendships That Build or Break You",
      "Forgiveness — Giving It & Receiving It",
      "Accountability That Develops You",
      "Accountability That Protects Your Heart",
      "Honoring Your Parents",
      "Conflict Resolution",
      "Social Media & the Highlight Reel",
      "Dating & Relationships Done Right",
    ],
  },
  {
    name: "Sports & Competition",
    icon: "🏆",
    topics: [
      "Serving Others Before Yourself",
      "Leadership On and Off the Field",
      "Being a Good Teammate",
      "Winning with Humility",
      "Handling Pressure & High Expectations",
      "Standing Up for What's Right",
      "Using Your Platform for Good",
      "When the Game Doesn't Go Your Way",
    ],
  },
  {
    name: "Purpose & Future",
    icon: "🧭",
    topics: [
      "Purpose & Calling",
      "Strength in Weakness",
      "Gratitude: A Weapon, Not Just a Feeling",
      "Surrender — Letting Go & Letting God",
      "Fear of the Future",
      "What Happens After High School",
      "Making Decisions with God",
      "Leaving a Legacy",
    ],
  },
];

// Flat list for backward compatibility
export const TOPICS = TOPIC_CATEGORIES.flatMap((c) => c.topics);

export const SERIES_OPTIONS = [
  "Faith & Character",
  "Identity & Worth",
  "Relationships",
  "Heart & Posture",
];
