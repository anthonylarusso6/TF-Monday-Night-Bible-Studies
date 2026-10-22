/**
 * Starting material for each topic on the Topic Ideas screen: passages that fit it and the pieces of a study built the
 * way Anthony builds them. References only (no verse text), so nothing here can misquote Scripture; the study itself
 * pulls the full text when it is written.
 *
 * Per topic:
 *  - verses: three passages. The first is the natural anchor, the other two are supporting verses.
 *  - flip:   the common assumption the Big Idea turns over in its first or second sentence.
 *  - scene:  a concrete moment for the "Real-life example" callout (a text, a game, scrolling at night).
 *  - ask:    one personal, specific discussion question (never "what does this mean to you").
 */

export interface TopicGuide {
  verses: [string, string][];
  flip: string;
  scene: string;
  ask: string;
}

const g = (verses: [string, string][], flip: string, scene: string, ask: string): TopicGuide => ({ verses, flip, scene, ask });

export const TOPIC_GUIDES: Record<string, TopicGuide> = {
  "Identity — Who You Are in Christ": g(
    [["2 Corinthians 5:17", "A new creation: the old label does not get the last word"], ["Ephesians 2:10", "You are God's workmanship, made on purpose"], ["Psalm 139:13-14", "Wonderfully made before you did anything"]],
    "Your identity is not what you do or what people say; it is what God already said.",
    "A bad game, a bad grade, a comment in a group chat. By night you are calling yourself the label they gave you.",
    "What is the label you believe about yourself that God never said?"
  ),
  "Anxiety & Worry": g(
    [["Philippians 4:6-7", "Prayer with thanks replaces worry with peace"], ["1 Peter 5:7", "Hand it over; He cares"], ["Matthew 6:25-34", "Worry adds nothing; the Father already knows"]],
    "Worry feels like preparing; it is actually carrying something you were told to hand over.",
    "It is 11pm, you are replaying tomorrow's game or test, and your chest is tight.",
    "What are you carrying right now that you have never actually handed to God?"
  ),
  "Depression & Dark Seasons": g(
    [["Psalm 34:17-18", "God is close to the crushed in spirit"], ["Psalm 42:5", "Talking to your own soul in the dark"], ["1 Kings 19:1-8", "Elijah is fed and rested before he is lectured"]],
    "Dark seasons are not proof something is wrong with your faith.",
    "You smile at practice and go home and cannot say why everything feels heavy.",
    "Who do you actually tell when you are not okay?"
  ),
  "Perfectionism: When Good Enough Feels Like Never Enough": g(
    [["Galatians 3:3", "Finishing by your own effort what grace started"], ["2 Corinthians 12:9", "Power shows up in weakness"], ["Ephesians 2:8-9", "Saved by grace, not performance"]],
    "Perfectionism looks like high standards; it is actually fear of being rejected.",
    "You hit a personal best and the first thing you say is what you missed.",
    "When did you last feel proud of something without adding a but?"
  ),
  "Comparison & Jealousy": g(
    [["Galatians 6:4-5", "Test your own work, not your neighbor's"], ["Proverbs 14:30", "A calm heart gives life; envy rots the bones"], ["John 21:20-22", "Peter is told to follow Jesus, not to watch John"]],
    "Comparison is not motivation; it is stealing joy from your own lane.",
    "You open Instagram and see a teammate's offer, a post, a highlight, and the whole mood of your day changes.",
    "Whose life do you check on most, and what does it do to you?"
  ),
  "Body Image & Insecurity": g(
    [["1 Samuel 16:7", "People look at the outside, God looks at the heart"], ["Psalm 139:14", "Fearfully and wonderfully made"], ["1 Corinthians 6:19-20", "Your body is not a project to fix, it is a place God lives"]],
    "Your body is not a scoreboard.",
    "Locker room, mirror, a comment about size or weight that has stuck for years.",
    "What did someone say about your body that you still hear?"
  ),
  "Grief & Loss": g(
    [["John 11:32-36", "Jesus weeps with them before anything else"], ["Psalm 34:18", "Near to the brokenhearted"], ["Matthew 5:4", "Blessed are those who mourn"]],
    "Grief is not a lack of faith; it is what love looks like when it has nowhere to go.",
    "A teammate's loss, a grandparent, a move. Everyone returns to normal and you are not there yet.",
    "Who have you not let yourself miss out loud?"
  ),
  "Healing — Emotional & Spiritual": g(
    [["Psalm 147:3", "He heals the brokenhearted and binds up wounds"], ["James 5:16", "Confess to each other and be healed"], ["Isaiah 53:5", "By His wounds we are healed"]],
    "Healing is not pretending it did not happen; it is letting it be treated.",
    "An old hurt from a coach, a friend or a family member that still shows up when you least expect it.",
    "What are you still covering up that needs to be treated, not hidden?"
  ),
  "Loneliness & Feeling Unseen": g(
    [["Genesis 16:13", "Hagar calls Him the God who sees me"], ["Psalm 25:16-17", "Turn to me, I am lonely and afflicted"], ["Hebrews 13:5", "I will never leave you"]],
    "You can be in a room full of people and still be unseen, and God has never once looked past you.",
    "Lunch table, group chat that goes quiet, a weekend with nothing to do.",
    "Who in this room might feel unseen right now, and what could you do this week?"
  ),
  "Prayer — Actually Talking to God": g(
    [["Matthew 6:5-13", "Not a performance; a pattern: the Lord's Prayer"], ["Luke 11:1-4", "The disciples ask to be taught"], ["1 Thessalonians 5:16-18", "Pray continually"]],
    "Prayer is not a speech; it is a conversation with someone who already knows.",
    "You say the same three sentences before every meal and before every game.",
    "When was the last time you told God exactly how you feel, with no cleaned-up words?"
  ),
  "Faith Over Fear": g(
    [["Joshua 1:9", "Be strong and courageous, He is with you"], ["Isaiah 41:10", "Do not fear, I will strengthen you"], ["2 Timothy 1:7", "Not a spirit of fear but of power"]],
    "Courage is not the absence of fear; it is moving while afraid.",
    "Walking out for a tryout, a hard conversation, a shot with the game on the line.",
    "What is one thing you are avoiding because of fear, not because of wisdom?"
  ),
  "Doubt & Unanswered Questions": g(
    [["Mark 9:24", "I believe, help my unbelief"], ["John 20:24-29", "Thomas asks and Jesus answers him"], ["Psalm 13:1-6", "How long? and still trusting"]],
    "Doubt is not the opposite of faith; silence is.",
    "A friend asks you a question about God in the locker room and you have nothing.",
    "What question have you been afraid to ask out loud?"
  ),
  "Trust — When Life Doesn't Make Sense": g(
    [["Proverbs 3:5-6", "Lean not on your own understanding"], ["Romans 8:28", "He works all things for good for those who love Him"], ["Genesis 50:20", "What was meant for evil, God meant for good"]],
    "Trust is not knowing why; it is knowing who.",
    "An injury, a cut, a family situation that none of your plans covered.",
    "What do you trust yourself to figure out that God is asking you to hand over?"
  ),
  "Surrender — Letting Go & Letting God": g(
    [["Luke 22:42", "Not my will but Yours"], ["Romans 12:1", "Offer yourself as a living sacrifice"], ["Proverbs 16:3", "Commit your work to the Lord"]],
    "Surrender is not giving up; it is giving over.",
    "You have worked on something for months and still cannot make it happen.",
    "What are you gripping that you know you should open your hand on?"
  ),
  "Reading the Bible — Making It Real": g(
    [["Psalm 119:105", "A lamp for my feet"], ["Hebrews 4:12", "Living and active"], ["James 1:22-25", "Do not just hear, do it"]],
    "The Bible is not a rulebook you get through; it is a voice you answer.",
    "You open it, read a chapter, close it, and could not tell anyone what it said.",
    "What is one verse you could actually do this week?"
  ),
  "Conviction vs. Condemnation": g(
    [["Romans 8:1", "No condemnation for those in Christ"], ["John 16:8", "The Spirit convicts"], ["2 Corinthians 7:10", "Godly sorrow leads to repentance"]],
    "Conviction says what you did is wrong; condemnation says you are.",
    "You mess up and the voice in your head does not stop for three days.",
    "Which voice is louder in your head right now, and where do you think it comes from?"
  ),
  "Hearing God's Voice": g(
    [["1 Kings 19:11-13", "Not in the wind or fire but a gentle whisper"], ["John 10:27", "My sheep listen to My voice"], ["1 Samuel 3:1-10", "Samuel learns to recognize the voice"]],
    "Hearing from God is rarely loud; it is usually quiet and consistent.",
    "A nudge to text someone, to apologize, to stay after and help clean up.",
    "When did you last do something because you thought God was asking you to?"
  ),
  "Integrity When No One Is Watching": g(
    [["Proverbs 10:9", "Whoever walks in integrity walks securely"], ["Luke 16:10", "Faithful in little, faithful in much"], ["Daniel 6:3-5", "Nothing to accuse him of"]],
    "Your character is not what you show; it is what you do when no one can check.",
    "A rep you could skip, a score you could round, a phone you could check.",
    "Where do you act different when nobody is looking?"
  ),
  "Discipline That Develops You": g(
    [["Hebrews 12:11", "No discipline seems pleasant, but it brings a harvest"], ["1 Corinthians 9:24-27", "Run to win; train with purpose"], ["Proverbs 12:1", "Whoever loves discipline loves knowledge"]],
    "Discipline is not punishment; it is training for who you are becoming.",
    "A 6am lift you did not want to do and did anyway, and what it did to the rest of your day.",
    "What is one habit you keep starting and stopping, and why?"
  ),
  "Anger & Self-Control": g(
    [["James 1:19-20", "Quick to listen, slow to anger"], ["Proverbs 15:1", "A gentle answer turns away wrath"], ["Ephesians 4:26-27", "In your anger do not sin"]],
    "Anger is not the sin; what you do with it is.",
    "A bad call, a teammate's comment, a sibling at home, and you say something you cannot take back.",
    "What sets you off fastest, and what do you do in the first ten seconds?"
  ),
  "Handling Temptation — Standing Strong": g(
    [["1 Corinthians 10:13", "God provides a way out"], ["Matthew 4:1-11", "Jesus answers each temptation with Scripture"], ["James 4:7", "Submit to God, resist the devil"]],
    "Temptation is not a sign you are weak; it is a sign you are in a real fight.",
    "A phone in your room at 1am, a party you know you should skip, a group chat.",
    "What is the way out God has already shown you that you keep ignoring?"
  ),
  "Handling Failure & Mistakes": g(
    [["Proverbs 24:16", "The righteous fall seven times and rise again"], ["1 John 1:9", "Confess and be forgiven"], ["John 21:15-19", "Peter's restoration after denying Jesus"]],
    "Failure is not the end of your story; quitting is.",
    "A dropped ball, a missed free throw, a failed test, a choice you cannot undo.",
    "What failure have you let define you longer than God has?"
  ),
  "Humility in Victory and Defeat": g(
    [["Philippians 2:3-4", "Count others more significant"], ["James 4:6", "God opposes the proud and gives grace to the humble"], ["Proverbs 16:18", "Pride goes before destruction"]],
    "Humility is not thinking less of yourself; it is thinking of yourself less.",
    "A big win where the credit goes to you, or a loss where you blame everyone else.",
    "How do you act after a win, and how do you act after a loss?"
  ),
  "The Tongue & Self-Control": g(
    [["James 3:3-10", "A small tongue steers the whole body"], ["Proverbs 18:21", "Death and life are in the power of the tongue"], ["Ephesians 4:29", "Only what builds others up"]],
    "Words are not small; they are the steering wheel.",
    "A joke at someone's expense in the locker room, or a message you fire off in anger.",
    "What did you say this week that you would not say with that person standing there?"
  ),
  "Work Ethic — Training Like It Matters": g(
    [["Colossians 3:23", "Work with all your heart, as for the Lord"], ["Proverbs 14:23", "All hard work brings a profit"], ["1 Corinthians 15:58", "Your labor is not in vain"]],
    "Hard work is not just for a scoreboard; it is worship.",
    "A normal Tuesday workout where nobody is watching and nothing is on the line.",
    "Who are you training for, and would your effort change if that were true?"
  ),
  "Friendships That Build or Break You": g(
    [["Proverbs 13:20", "Walk with the wise and become wise"], ["1 Corinthians 15:33", "Bad company corrupts good character"], ["Proverbs 27:17", "Iron sharpens iron"]],
    "You become like the people you spend the most time with, whether you decide to or not.",
    "A friend group chat where you act like someone you are not.",
    "Which friend makes you better, and which one makes it easier to be worse?"
  ),
  "Forgiveness — Giving It & Receiving It": g(
    [["Colossians 3:13", "Forgive as the Lord forgave you"], ["Matthew 18:21-35", "The servant forgiven much who would not forgive little"], ["Ephesians 4:32", "Kind and compassionate, forgiving one another"]],
    "Forgiveness is not letting someone off the hook; it is cutting yourself free.",
    "A friend who talked behind your back, a parent who let you down, a coach who cut you.",
    "Who do you need to forgive, and what has holding it cost you?"
  ),
  "Accountability That Develops You": g(
    [["Proverbs 27:17", "Iron sharpens iron"], ["Hebrews 10:24-25", "Spur one another on toward love and good deeds"], ["Ecclesiastes 4:9-10", "Two are better than one"]],
    "Accountability is not someone policing you; it is someone investing in who you are becoming.",
    "A teammate who tells you the truth about your effort when nobody else will.",
    "Who has permission to tell you the truth, and when did you last listen?"
  ),
  "Accountability That Protects Your Heart": g(
    [["Proverbs 4:23", "Guard your heart, everything flows from it"], ["James 5:16", "Confess your sins to each other"], ["Galatians 6:1-2", "Carry each other's burdens"]],
    "Secrets get stronger in the dark and weaker in the light.",
    "Something you have kept hidden on your phone, in your head, or at night.",
    "What are you hiding that would lose its power if one person knew?"
  ),
  "Honoring Your Parents": g(
    [["Ephesians 6:1-3", "Honor your father and mother"], ["Proverbs 1:8", "Listen to your father's instruction"], ["Exodus 20:12", "The first commandment with a promise"]],
    "Honor is not agreeing with everything; it is respecting the people God put over you.",
    "An eye roll, a snippy text, a ride home after a game you did not play well.",
    "When did you last thank your parents for something they never got credit for?"
  ),
  "Conflict Resolution": g(
    [["Matthew 18:15", "Go to them privately first"], ["Romans 12:18", "As far as it depends on you, live at peace"], ["Proverbs 15:1", "A gentle answer"]],
    "Avoiding the conflict is not peace; it is just delay.",
    "Two teammates who stopped talking after a hard practice and let it sit for weeks.",
    "Who have you been avoiding instead of talking to?"
  ),
  "Social Media & the Highlight Reel": g(
    [["Galatians 1:10", "Pleasing God, not people"], ["Matthew 6:1", "Doing good to be seen"], ["Psalm 101:3", "I will not look at anything vile"]],
    "Everyone is posting their best moments and comparing them to your worst.",
    "Scrolling at 1am, counting likes, deleting a post that did not get enough.",
    "How do you feel after thirty minutes on your phone, and what does that tell you?"
  ),
  "Dating & Relationships Done Right": g(
    [["Proverbs 4:23", "Guard your heart"], ["1 Timothy 4:12", "Set an example in purity"], ["2 Corinthians 6:14", "Do not be unequally yoked"]],
    "The goal is not finding someone; it is becoming someone worth finding.",
    "A relationship that moves faster than your convictions.",
    "What standard have you already decided before you are in the moment?"
  ),
  "Serving Others Before Yourself": g(
    [["Mark 10:43-45", "Whoever wants to be great must serve"], ["John 13:1-17", "Jesus washes the disciples' feet"], ["Philippians 2:5-8", "The mindset of Christ"]],
    "Greatness is not being served; it is serving.",
    "Staying after to pick up equipment, carrying someone else's bag, encouraging a younger teammate.",
    "Who could you serve this week who cannot do anything for you?"
  ),
  "Leadership On and Off the Field": g(
    [["1 Timothy 4:12", "Set an example"], ["Mark 10:42-45", "Servant leadership"], ["Proverbs 11:14", "Plans fail for lack of counsel"]],
    "Leadership is not the loudest voice; it is the consistent one.",
    "The captain who is the same person at practice, at school and online.",
    "Who is following your example right now, whether you asked them to or not?"
  ),
  "Being a Good Teammate": g(
    [["Romans 12:10", "Honor one another above yourselves"], ["1 Corinthians 12:12-26", "One body with many parts"], ["Ecclesiastes 4:9-12", "A cord of three strands"]],
    "A good teammate is not the best player; it is the one the others want beside them.",
    "A bench player who still celebrates the starter's play.",
    "What does the person next to you need from you that you are not giving?"
  ),
  "Winning with Humility": g(
    [["Proverbs 27:2", "Let someone else praise you"], ["1 Corinthians 4:7", "What do you have that you did not receive?"], ["James 4:10", "Humble yourselves before the Lord"]],
    "Winning is a gift, not a verdict on who you are.",
    "A trophy, a stat line, a post about how good you are.",
    "How do you act around the team you just beat?"
  ),
  "Handling Pressure & High Expectations": g(
    [["Isaiah 40:30-31", "Those who hope in the Lord renew their strength"], ["Matthew 11:28-30", "Come to Me and rest"], ["Psalm 18:2", "The Lord is my rock"]],
    "Pressure does not create who you are; it shows it.",
    "The last two minutes, with everyone watching and your stomach in knots.",
    "Whose expectations are you carrying that God never gave you?"
  ),
  "Standing Up for What's Right": g(
    [["Daniel 3:16-18", "Even if He does not, we will not bow"], ["Proverbs 28:1", "The righteous are bold as a lion"], ["Joshua 24:15", "As for me and my house"]],
    "Standing up is not about being loud; it is about being steady when it costs you.",
    "A joke or a comment in the group that you know is wrong and everybody laughs.",
    "What is the moment you stayed quiet that you wish you had spoken up?"
  ),
  "Using Your Platform for Good": g(
    [["Matthew 5:14-16", "Let your light shine before others"], ["Esther 4:14", "For such a time as this"], ["1 Peter 4:10", "Use your gift to serve others"]],
    "Your platform is not for you; it is something you are stewarding.",
    "Being known at school or online for what you do and who is watching.",
    "Who is watching you that you do not know about?"
  ),
  "When the Game Doesn't Go Your Way": g(
    [["Romans 5:3-5", "Suffering produces perseverance"], ["James 1:2-4", "Trials develop endurance"], ["Philippians 4:11-13", "Content in any situation"]],
    "How you handle a loss shows more than how you handle a win.",
    "Benched, cut, blown call, a season that fell apart.",
    "What did your last disappointment teach you that a win could not?"
  ),
  "Purpose & Calling": g(
    [["Jeremiah 29:11", "Plans to give you a hope and a future"], ["Ephesians 2:10", "Created for good works prepared in advance"], ["Proverbs 19:21", "The Lord's purpose prevails"]],
    "Calling is not a job title; it is who you are serving with what you have.",
    "A senior asked what they want to be and having no answer.",
    "What is one thing you are good at that could serve someone else?"
  ),
  "Strength in Weakness": g(
    [["2 Corinthians 12:9-10", "My power is made perfect in weakness"], ["Isaiah 40:29", "He gives strength to the weary"], ["Psalm 73:26", "God is the strength of my heart"]],
    "Strength is not never needing help; it is knowing where to go for it.",
    "An injury that made you stop, or a thing you were embarrassed to ask for help with.",
    "What weakness are you hiding that God could use?"
  ),
  "Gratitude: A Weapon, Not Just a Feeling": g(
    [["1 Thessalonians 5:18", "Give thanks in all circumstances"], ["Psalm 100:4", "Enter His gates with thanksgiving"], ["Philippians 4:6", "Thanksgiving with your requests"]],
    "Gratitude is not a feeling you wait for; it is a decision you make.",
    "A rough day where you listed what went wrong and never what went right.",
    "What are three things you have that you used to pray for?"
  ),
  "Fear of the Future": g(
    [["Jeremiah 29:11", "God has a plan"], ["Matthew 6:34", "Do not worry about tomorrow"], ["Proverbs 16:9", "You plan your way, the Lord establishes your steps"]],
    "You do not need to see the whole road; you need to take the next step.",
    "A recruiting offer, a college choice, a thing coming up you cannot control.",
    "What is the next step you are avoiding because you cannot see the whole thing?"
  ),
  "What Happens After High School": g(
    [["Proverbs 3:5-6", "Trust Him with the path"], ["Psalm 37:4-5", "Commit your way to the Lord"], ["Ecclesiastes 11:9-10", "Rejoice and remember"]],
    "After graduation, you keep the habits you build now, not the ones you plan to.",
    "A first week of college with no coach, no parent, no schedule.",
    "What habit are you building now that will still be with you at 19?"
  ),
  "Making Decisions with God": g(
    [["James 1:5", "If you lack wisdom, ask"], ["Proverbs 11:14", "Many advisers bring victory"], ["Psalm 32:8", "I will instruct you and teach you"]],
    "A good decision is not just what feels right; it is what you would still make if God were in the room.",
    "A choice between two good things, or a decision made in a rush.",
    "Who do you ask before you decide, and who do you avoid asking?"
  ),
  "Leaving a Legacy": g(
    [["Psalm 78:4", "Telling the next generation"], ["Proverbs 13:22", "A good person leaves an inheritance"], ["2 Timothy 2:2", "Pass it on to faithful people"]],
    "Legacy is not what you accomplish; it is who you shaped.",
    "A younger kid who copies the way you carry yourself.",
    "If your life ended today, what would people say you stood for?"
  ),
};

/** The study, step by step the way Anthony builds them. Same for every topic; the guide above fills in the topic. */
export const BUILD_STEPS: { title: string; how: string }[] = [
  { title: "1. Pick the anchor verse", how: "Choose one verse that carries the whole point. The first passage listed is the natural one; the other two become your supporting verses." },
  { title: "2. Write the Big Idea (4-5 sentences)", how: "Flip a common assumption in the first or second sentence, land the spiritual truth in the middle, and end on one short punch. State it; never open with a question or “in today's world”." },
  { title: "3. Break the anchor into phrases", how: "Take 2-3 phrases from the verse. Under each, 2-3 points: first what it literally means, then one sharp sentence applying it to their life. Use dashes for rhythm." },
  { title: "4. Add a callout to each phrase", how: "Either “Say this to your students” (2-3 sentences you would actually say out loud) or “Real-life example” (a specific moment: a text, a game, scrolling at night). Always end on a question or a landing line." },
  { title: "5. Break down the supporting verses", how: "2-3 sentences each: what the verse says, how it connects to the theme, what it means for them." },
  { title: "6. Write six discussion questions", how: "Personal and specific, never “what does this mean to you”. Give yourself a two-sentence answer for each, and end the last one with a coaching note like “Give them space.”" },
  { title: "7. Finish with three takeaways", how: "A bold 6-12 word title each, then 1-2 sentences that expand it. The “not X, it is Y” contrast works well." },
];
