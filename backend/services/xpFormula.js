// Central XP formula & constants (can be tuned)
module.exports = {
  STUDY_MINUTE_XP: 1, // provisional
  QUESTION_CORRECT_XP: 6,
  QUESTION_WRONG_XP: 1,
  QUESTION_BLANK_XP: 0,
  DAILY_CHALLENGE_CLAIM_MULTIPLIER: 1,
  streakBonus(base, streak) {
    return Math.round(base * Math.min(streak, 10) * 0.05); // up to 50% bonus
  }
};
