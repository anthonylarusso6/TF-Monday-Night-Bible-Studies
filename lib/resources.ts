export interface Resource {
  type: "book" | "podcast" | "video" | "app";
  title: string;
  author: string;
  description: string;
  link?: string;
}

export interface ResourceCategory {
  name: string;
  icon: string;
  description: string;
  resources: Resource[];
}

export const RESOURCE_LIBRARY: ResourceCategory[] = [
  {
    name: "Leading Bible Study Discussions",
    icon: "💬",
    description: "How to ask better questions and get students actually talking",
    resources: [
      {
        type: "book",
        title: "Good Questions Have Groups Talking",
        author: "Josh Hunt",
        description: "The practical guide to leading discussions that actually go somewhere. Simple but game-changing.",
      },
      {
        type: "book",
        title: "The Art of Facilitation",
        author: "Dale Hunter",
        description: "How to guide a room without dominating it. Essential for any small group leader.",
      },
      {
        type: "book",
        title: "Lead Small",
        author: "Reggie Joiner & Tom Shefchunas",
        description: "Specifically written for people leading small groups of teenagers. Practical and direct.",
      },
      {
        type: "podcast",
        title: "The Small Group Network Podcast",
        author: "Michael Mack",
        description: "Real conversations about what works (and what doesn't) in small group ministry.",
      },
    ],
  },
  {
    name: "Working With Teenagers",
    icon: "🏃",
    description: "Understanding the teenage brain, culture, and how to actually reach them",
    resources: [
      {
        type: "book",
        title: "Hurt 2.0",
        author: "Chap Clark",
        description: "The most honest and research-backed look at what teenagers are actually going through. Required reading.",
      },
      {
        type: "book",
        title: "Sticky Faith",
        author: "Kara Powell & Chap Clark",
        description: "Why most students walk away from faith after high school — and what actually makes faith stick.",
      },
      {
        type: "book",
        title: "The Back Door to Your Teen's Heart",
        author: "Melissa Trevathan & Sissy Goff",
        description: "How to build the kind of relationship where a teenager will actually talk to you.",
      },
      {
        type: "podcast",
        title: "The Rooted Ministry Podcast",
        author: "Rooted Ministry",
        description: "Theologically deep, practically grounded — one of the best resources for discipling teenagers.",
      },
      {
        type: "video",
        title: "Understanding the Teenage Brain",
        author: "Sarah-Jayne Blakemore (TED Talk)",
        description: "15 minutes that will change how you interpret why teenagers do what they do. Watch this.",
        link: "https://www.ted.com/talks/sarah_jayne_blakemore_the_mysterious_workings_of_the_adolescent_brain",
      },
    ],
  },
  {
    name: "Small Group Ministry",
    icon: "🤝",
    description: "Building community, structure, and culture within a small group",
    resources: [
      {
        type: "book",
        title: "Creating Community",
        author: "Andy Stanley & Bill Willits",
        description: "Clear framework for what small group ministry should look like and why community matters.",
      },
      {
        type: "book",
        title: "Leading Small Groups with Purpose",
        author: "Steve Gladen",
        description: "Saddleback's approach to small groups — purpose-driven, practical, and scalable.",
      },
      {
        type: "book",
        title: "The Connecting Church 2.0",
        author: "Randy Frazee",
        description: "Why authentic community is harder than we think and how to build it on purpose.",
      },
      {
        type: "podcast",
        title: "Groups.Church Podcast",
        author: "Allen White",
        description: "Everything about building and growing a small group ministry. Especially good for new coaches.",
      },
    ],
  },
  {
    name: "Personal Spiritual Growth",
    icon: "🌱",
    description: "Growing as a disciple before growing as a leader",
    resources: [
      {
        type: "book",
        title: "Spiritual Leadership",
        author: "Oswald Sanders",
        description: "The classic. Every serious leader should read this. Short, dense, and convicting.",
      },
      {
        type: "book",
        title: "The Making of a Leader",
        author: "Robert Clinton",
        description: "How God develops leaders over a lifetime. Changes how you see hard seasons.",
      },
      {
        type: "book",
        title: "Lectures to My Students",
        author: "Charles Spurgeon",
        description: "150 years old and still the sharpest thing written about pastoral ministry and communication.",
      },
      {
        type: "podcast",
        title: "Craig Groeschel Leadership Podcast",
        author: "Craig Groeschel",
        description: "Bi-weekly episodes on leadership that are concise, practical, and faith-grounded.",
      },
      {
        type: "podcast",
        title: "Matt Chandler Sermons",
        author: "The Village Church",
        description: "Deep, honest, high-caliber preaching. Feeds your soul before you feed others.",
      },
    ],
  },
  {
    name: "Bible Study Methods",
    icon: "📖",
    description: "How to dig into Scripture yourself and teach others to do the same",
    resources: [
      {
        type: "book",
        title: "Living by the Book",
        author: "Howard & William Hendricks",
        description: "The best book ever written on how to study the Bible. Observation → Interpretation → Application. Period.",
      },
      {
        type: "book",
        title: "How to Read the Bible for All Its Worth",
        author: "Gordon Fee & Douglas Stuart",
        description: "Genre by genre guide to reading Scripture in context. Clears up 90% of confusion.",
      },
      {
        type: "app",
        title: "Blue Letter Bible",
        author: "Blue Letter Bible Ministries",
        description: "Free app with commentaries, original language tools, and concordances. Use it while prepping every study.",
        link: "https://www.blueletterbible.org",
      },
      {
        type: "app",
        title: "YouVersion Bible App",
        author: "Life.Church",
        description: "Multiple translations, reading plans, and the ability to share verses. Great for students too.",
        link: "https://www.youversion.com",
      },
    ],
  },
  {
    name: "Sports Ministry",
    icon: "🏆",
    description: "Using athletics as a platform for faith and character development",
    resources: [
      {
        type: "book",
        title: "Game Plan for Life",
        author: "Joe Gibbs",
        description: "Super Bowl coach on faith, leadership, and what winning actually looks like.",
      },
      {
        type: "book",
        title: "The Competitor's Edge",
        author: "Dan Britton & Jimmy Page",
        description: "Devotional guide specifically for athletes and sports coaches. Direct and practical.",
      },
      {
        type: "book",
        title: "Playing with Purpose",
        author: "Mike Yorkey",
        description: "Athletes using their platform — story-driven and motivating for the coaches who lead them.",
      },
      {
        type: "podcast",
        title: "Sports Spectrum Podcast",
        author: "Sports Spectrum",
        description: "Athletes and coaches talking about faith honestly. Great content to share with students too.",
      },
    ],
  },
];
