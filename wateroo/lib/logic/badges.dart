/// Badges the user can unlock.
library;

class BadgeDef {
  const BadgeDef(this.id, this.name, this.hint);

  final String id;
  final String name;

  /// Shown while the badge is still locked.
  final String hint;
}

const List<BadgeDef> allBadges = [
  BadgeDef('first_glass', 'First Glass', 'Log your first drink'),
  BadgeDef('glass_full', 'Glass Full', 'Reach your daily goal'),
  BadgeDef('early_bird', 'Early Bird', 'Drink before 9 am'),
  BadgeDef('streak_3', '3-Day Streak', 'Goal 3 days in a row'),
  BadgeDef('streak_7', '7-Day Streak', 'Goal 7 days in a row'),
  BadgeDef('streak_30', '30-Day Legend', 'Goal 30 days in a row'),
];

BadgeDef badgeById(String id) => allBadges.firstWhere((b) => b.id == id);

/// Which badges the current situation earns. The caller filters out the ones
/// already unlocked.
Set<String> earnedBadges({
  required bool hasDrunk,
  required DateTime drinkTime,
  required int goalDayCount,
  required int streak,
}) {
  return {
    if (hasDrunk) 'first_glass',
    if (hasDrunk && drinkTime.hour < 9) 'early_bird',
    if (goalDayCount >= 1) 'glass_full',
    if (streak >= 3) 'streak_3',
    if (streak >= 7) 'streak_7',
    if (streak >= 30) 'streak_30',
  };
}
