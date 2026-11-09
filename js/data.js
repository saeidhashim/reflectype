/*
  Content and settings for Reflectype v1.
  Technology & AI has one real video. All other genres still use PLACEHOLDERS.
  To add a real video, set `youtubeId` on an entry (only videos that allow embedding)
  and replace the placeholder title/tags.
*/
window.REFLECTYPE_CONFIG = {
  // Saeid's pick for now (2026-11-09); swap for the real LinkedIn page username once it exists.
  brandHandle: "@reflectype",
  genres: [
    { id: "technology", name: "Technology & AI", hue: 262, tags: ["Technology", "AI", "Innovation", "Future", "Tech"] },
    { id: "science", name: "Science & Space", hue: 215, tags: ["Science", "Space", "Discovery", "Curiosity", "Research"] },
    { id: "business", name: "Business & Startups", hue: 28, tags: ["Business", "Startups", "Entrepreneurship", "Leadership", "Growth"] },
    { id: "money", name: "Money & Economics", hue: 150, tags: ["Money", "Economics", "Finance", "Markets", "Investing"] },
    { id: "psychology", name: "Psychology", hue: 330, tags: ["Psychology", "Mindset", "Habits", "Behaviour", "Learning"] },
    { id: "history", name: "History & Culture", hue: 18, tags: ["History", "Culture", "Society", "Stories", "Learning"] },
    { id: "sports", name: "Sports", hue: 120, tags: ["Sports", "Performance", "Teamwork", "Discipline", "Athletes"] },
    { id: "health", name: "Health & Fitness", hue: 175, tags: ["Health", "Fitness", "Wellbeing", "Sleep", "Habits"] },
    { id: "design", name: "Design & Creativity", hue: 300, tags: ["Design", "Creativity", "Art", "Craft", "Inspiration"] },
    { id: "nature", name: "Nature", hue: 100, tags: ["Nature", "Environment", "Wildlife", "Climate", "Sustainability"] },
    { id: "society", name: "Society & Ethics", hue: 45, tags: ["Society", "Ethics", "Debate", "Perspective", "Thinking"] },
    { id: "cyber", name: "Cybersecurity", hue: 245, tags: ["Cybersecurity", "Privacy", "InfoSec", "Security", "Technology"] },
    { id: "music", name: "Music", hue: 285, tags: ["Music", "Songs", "Artists", "Albums", "Culture"] },
    { id: "gaming", name: "Gaming", hue: 350, tags: ["Gaming", "VideoGames", "Games", "Esports", "Play"] },
    { id: "food", name: "Food & Cooking", hue: 35, tags: ["Food", "Cooking", "Recipes", "Cuisine", "Taste"] },
    { id: "travel", name: "Travel", hue: 195, tags: ["Travel", "Adventure", "Places", "Explore", "Wanderlust"] },
    { id: "movies", name: "Movies & TV", hue: 255, tags: ["Movies", "TV", "Film", "Cinema", "Storytelling"] },
    { id: "philosophy", name: "Philosophy", hue: 80, tags: ["Philosophy", "Ideas", "Thinking", "Wisdom", "Questions"] }
  ]
};

// Three placeholder entries per genre so the daily rotation can be seen working.
window.REFLECTYPE_CONFIG.genres.forEach(function (g) {
  g.videos = [1, 2, 3].map(function (n) {
    return { title: "Sample video " + n + ": " + g.name, youtubeId: "", tags: g.tags, placeholder: true };
  });
});

// Technology & AI: one real video (3Blue1Brown, embedding confirmed via YouTube oEmbed 2026-11-09).
window.REFLECTYPE_CONFIG.genres[0].videos = [
  {
    title: "But what is a neural network? | Deep learning chapter 1",
    youtubeId: "aircAruvnKk",
    tags: ["Technology", "AI", "NeuralNetworks", "MachineLearning", "DeepLearning"]
  }
];
