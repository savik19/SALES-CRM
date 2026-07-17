// ---------------------------------------------------------------------------
// Greeting + daily motivational thought for the Lead Table (the landing screen).
// Pure helpers — a time-based greeting and a thought that changes every day and
// differs per user (so two people, or the same person on two days, see different
// ones). Deterministic, no Math.random.
// ---------------------------------------------------------------------------

// 30 short, energetic thoughts — one surfaces per day, rotated per person.
export const THOUGHTS = [
  "Every call is a chance to change someone's day — and your month.",
  "Small consistent effort beats a big burst of motivation. Keep going.",
  "You don't have to be great to start, but you have to start to be great.",
  "The lead you follow up today is the deal you close tomorrow.",
  "Discipline is choosing what you want most over what you want now.",
  "Rejection is just redirection. Next call, fresh start.",
  "Your energy introduces you before you even speak.",
  "Progress, not perfection. One good conversation at a time.",
  "The best salespeople listen twice as much as they talk.",
  "A goal without a follow-up is just a wish. Chase it.",
  "Show up today like the person you're becoming.",
  "Consistency compounds. Today's effort pays off next quarter.",
  "Confidence comes from preparation. Know your pitch, own the call.",
  "Someone out there needs exactly what you offer — go find them.",
  "You miss 100% of the follow-ups you don't make.",
  "Turn 'no' into 'not yet' and keep the relationship warm.",
  "Great closers were once nervous beginners. Keep dialing.",
  "Your attitude, not your aptitude, sets your altitude.",
  "Focus on helping, and the selling takes care of itself.",
  "Momentum is built one small win at a time. Bank one now.",
  "Be so good at the follow-up they can't forget you.",
  "The harder you work for something, the greater you'll feel achieving it.",
  "Today's effort is tomorrow's result. Plant the seeds.",
  "Stay curious — the best questions open the biggest doors.",
  "Winners are just losers who tried one more time.",
  "Make the call you're avoiding. That's usually the one that matters.",
  "Enthusiasm is contagious. Start yours, spread it to your prospects.",
  "You are one conversation away from a completely different month.",
  "Master the basics daily and the big results follow.",
  "Believe in your product, and your prospects will too.",
];

// "Good morning / afternoon / evening" for the given time.
export function greetingFor(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Day of the year (1–366) — the daily rotation index.
function dayOfYear(now) {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

// Simple stable hash of a string (so each user gets a different rotation).
function hash(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// The thought to show for a user on a given day. Changes daily; differs per
// user. `now` is injectable for deterministic tests.
export function thoughtOfTheDay(userId, now = new Date()) {
  const idx = (dayOfYear(now) + hash(userId)) % THOUGHTS.length;
  return THOUGHTS[idx];
}
