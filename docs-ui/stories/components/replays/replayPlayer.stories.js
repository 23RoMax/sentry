import {Provider as ReplayContextProvider} from 'sentry/components/replays/replayContext';
import ReplayPlayer from 'sentry/components/replays/replayPlayer';

import events from './example_events.json';

export default {
  title: 'Components/Replays/ReplayPlayer',
  component: ReplayPlayer,
};

export const ScaledReplayPlayer = () => (
  <ReplayContextProvider events={events}>
    <ReplayPlayer />
  </ReplayContextProvider>
);
