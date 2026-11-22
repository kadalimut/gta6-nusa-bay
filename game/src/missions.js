// The story of Nusa Bay: three jobs for Raka, a driver who came home to the
// coastal city and owes a debt to the harbour crew. Each mission is a chain of
// steps with a place to reach, a thing to do there, and a payout.
import { LANDMARKS } from './city.js';

export const HERO = { name: 'Raka', home: 'Nusa Bay' };
export const CONTACT = { name: 'Dara', place: 'Cafe Dara' };

export const MISSIONS = [
  {
    id: 'first-job',
    title: 'Job 1 — First Job',
    story: 'Dara needs a driver she can trust. Pick up the parcel at Cafe Dara and deliver it to Pasar Senja before the harbour crew notices.',
    payout: 400,
    steps: [
      { kind: 'go', text: 'Go to Cafe Dara and talk to Dara (press E)', target: LANDMARKS.cafe, radius: 90 },
      { kind: 'go', text: 'Deliver the parcel to Pasar Senja', target: LANDMARKS.market, radius: 90 },
    ],
  },
  {
    id: 'harbour-run',
    title: 'Job 2 — Harbour Run',
    story: 'Three crates are waiting at Dermaga Timur. The police are watching the docks, so grab them fast and bring them to Bengkel Jaya.',
    payout: 800,
    steps: [
      { kind: 'collect', text: 'Collect 3 crates at Dermaga Timur (press E at each crate)', target: LANDMARKS.dock, radius: 130, count: 3 },
      { kind: 'go', text: 'Deliver the crates to Bengkel Jaya', target: LANDMARKS.garage, radius: 90 },
    ],
  },
  {
    id: 'bay-getaway',
    title: 'Job 3 — Bay Getaway',
    story: 'The debt is paid, but the police want Raka now. Lose the chase and reach the boat at Marina Teluk — the tide waits for no one.',
    payout: 1500,
    steps: [
      { kind: 'escape', text: 'Reach the boat at Marina Teluk — police are on your tail!', target: LANDMARKS.marina, radius: 100 },
    ],
  },
];

export function missionObjective(mission, stepIndex, collected) {
  const step = mission.steps[stepIndex];
  if (!step) return 'All jobs done — Nusa Bay is yours, Raka.';
  if (step.kind === 'collect') return `${step.text} (${collected}/3)`;
  return step.text;
}
