/// Personal touches: this copy of Wateroo is made for Seda.
///
/// Change the name or rewrite the notes here – everything else in the app
/// picks them up automatically.
library;

const String friendName = 'Seda';

/// Love notes. Each day Seda fills her glass, the next note unlocks.
/// They stay collected in Rewards → "Notes for Seda".
const List<String> loveNotes = [
  'You did it, Seda! Glass full, heart full. I’m proud of you.',
  'Hydrated and beautiful – you nailed both today.',
  'Every sip is a tiny reminder that someone is thinking of you.',
  'Glass full! That earns you one big hug. Collect it in person.',
  'Your skin says thank you. And so do I.',
  'Three cheers for Seda – with water, of course.',
  'You’re doing amazing. Same time tomorrow?',
  'Fun fact: you’re even cuter when you’re hydrated.',
  'A full glass and a full week of you taking care of yourself. I love that.',
  'Ten full glasses! Pick a date night – you’ve earned it.',
];

/// Greeting for the time of day: "Good morning, Seda".
String greetingFor(DateTime now) {
  final h = now.hour;
  final part = h < 5
      ? 'Still up'
      : h < 12
      ? 'Good morning'
      : h < 18
      ? 'Good afternoon'
      : 'Good evening';
  return '$part, $friendName';
}
