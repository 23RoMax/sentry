import {browserHistory} from 'react-router';
import {createStore, StoreDefinition} from 'reflux';

import OrganizationsActions from 'sentry/actions/organizationsActions';
import getGuidesContent from 'sentry/components/assistant/getGuidesContent';
import {Guide, GuidesContent, GuidesServerData} from 'sentry/components/assistant/types';
import {IS_ACCEPTANCE_TEST} from 'sentry/constants';
import ConfigStore from 'sentry/stores/configStore';
import {trackAnalyticsEvent} from 'sentry/utils/analytics';
import {
  cleanupActiveRefluxSubscriptions,
  makeSafeRefluxStore,
} from 'sentry/utils/makeSafeRefluxStore';

function guidePrioritySort(a: Guide, b: Guide) {
  const a_priority = a.priority ?? Number.MAX_SAFE_INTEGER;
  const b_priority = b.priority ?? Number.MAX_SAFE_INTEGER;
  if (a_priority === b_priority) {
    return a.guide.localeCompare(b.guide);
  }
  // lower number takes priority
  return a_priority - b_priority;
}

export type GuideStoreState = {
  /**
   * Anchors that are currently mounted
   */
  anchors: Set<string>;
  /**
   * The current guide
   */
  currentGuide: Guide | null;
  /**
   * Current step of the current guide
   */
  currentStep: number;
  /**
   * Hides guides that normally would be shown
   */
  forceHide: boolean;
  /**
   * We force show a guide if the URL contains #assistant
   */
  forceShow: boolean;
  /**
   * All tooltip guides
   */
  guides: Guide[];
  /**
   * Current organization id
   */
  orgId: string | null;
  /**
   * Current organization slug
   */
  orgSlug: string | null;
  /**
   * The previously shown guide
   */
  prevGuide: Guide | null;
};

const defaultState: GuideStoreState = {
  forceHide: false,
  guides: [],
  anchors: new Set(),
  currentGuide: null,
  currentStep: 0,
  orgId: null,
  orgSlug: null,
  forceShow: false,
  prevGuide: null,
};

interface GuideStoreDefinition extends StoreDefinition {
  browserHistoryListener: null | (() => void);

  fetchSucceeded(data: GuidesServerData): void;
  nextStep(): void;
  recordCue(guide: string): void;
  registerAnchor(target: string): void;
  setForceHide(forceHide: boolean): void;
  state: GuideStoreState;
  unregisterAnchor(target: string): void;
  updatePrevGuide(nextGuide: Guide | null): void;
}

const storeConfig: GuideStoreDefinition = {
  state: defaultState,
  unsubscribeListeners: [],
  browserHistoryListener: null,

  init() {
    this.state = defaultState;

    this.unsubscribeListeners.push(
      this.listenTo(OrganizationsActions.setActive, this.onSetActiveOrganization)
    );

    window.addEventListener('load', this.onURLChange, false);
    this.browserHistoryListener = browserHistory.listen(() => this.onURLChange());
  },

  teardown() {
    cleanupActiveRefluxSubscriptions(this.unsubscribeListeners);
    window.removeEventListener('load', this.onURLChange);

    if (this.browserHistoryListener) {
      this.browserHistoryListener();
    }
  },

  onURLChange() {
    this.state.forceShow = window.location.hash === '#assistant';
    this.updateCurrentGuide();
  },

  onSetActiveOrganization(data) {
    this.state.orgId = data ? data.id : null;
    this.state.orgSlug = data ? data.slug : null;
    this.updateCurrentGuide();
  },

  fetchSucceeded(data) {
    // It's possible we can get empty responses (seems to be Firefox specific)
    // Do nothing if `data` is empty
    // also, temporarily check data is in the correct format from the updated
    // assistant endpoint
    if (!data || !Array.isArray(data)) {
      return;
    }

    const guidesContent: GuidesContent = getGuidesContent(this.state.orgSlug);
    // map server guide state (i.e. seen status) with guide content
    const guides = guidesContent.reduce((acc: Guide[], content) => {
      const serverGuide = data.find(guide => guide.guide === content.guide);
      serverGuide &&
        acc.push({
          ...content,
          ...serverGuide,
        });
      return acc;
    }, []);

    this.state.guides = guides;
    this.updateCurrentGuide();
  },

  closeGuide(dismissed?: boolean) {
    const {currentGuide, guides} = this.state;
    // update the current guide seen to true or all guides
    // if markOthersAsSeen is true and the user is dismissing
    guides
      .filter(
        guide =>
          guide.guide === currentGuide?.guide ||
          (currentGuide?.markOthersAsSeen && dismissed)
      )
      .forEach(guide => (guide.seen = true));
    this.state.forceShow = false;
    this.updateCurrentGuide();
  },

  nextStep() {
    this.state.currentStep += 1;
    this.trigger(this.state);
  },

  toStep(step: number) {
    this.state.currentStep = step;
    this.trigger(this.state);
  },

  registerAnchor(target) {
    this.state.anchors.add(target);
    this.updateCurrentGuide();
  },

  unregisterAnchor(target) {
    this.state.anchors.delete(target);
    this.updateCurrentGuide();
  },

  setForceHide(forceHide) {
    this.state.forceHide = forceHide;
    this.trigger(this.state);
  },

  recordCue(guide) {
    const user = ConfigStore.get('user');
    if (!user) {
      return;
    }

    const data = {
      guide,
      eventKey: 'assistant.guide_cued',
      eventName: 'Assistant Guide Cued',
      organization_id: this.state.orgId,
      user_id: parseInt(user.id, 10),
    };
    trackAnalyticsEvent(data);
  },

  updatePrevGuide(nextGuide) {
    const {prevGuide} = this.state;
    if (!nextGuide) {
      return;
    }

    if (!prevGuide || prevGuide.guide !== nextGuide.guide) {
      this.recordCue(nextGuide.guide);
      this.state.prevGuide = nextGuide;
    }
  },

  /**
   * Logic to determine if a guide is shown:
   *
   *  - If any required target is missing, don't show the guide
   *  - If the URL ends with #assistant, show the guide
   *  - If the user has already seen the guide, don't show the guide
   *  - Otherwise show the guide
   */
  updateCurrentGuide() {
    const {anchors, guides, forceShow} = this.state;

    let guideOptions = guides
      .sort(guidePrioritySort)
      .filter(guide => guide.requiredTargets.every(target => anchors.has(target)));

    const user = ConfigStore.get('user');
    const assistantThreshold = new Date(2019, 6, 1);
    const userDateJoined = new Date(user?.dateJoined);

    if (!forceShow) {
      guideOptions = guideOptions.filter(({seen, dateThreshold}) => {
        if (seen) {
          return false;
        }
        if (user?.isSuperuser && !IS_ACCEPTANCE_TEST) {
          return true;
        }
        if (dateThreshold) {
          // Show the guide to users who've joined before the date threshold
          return userDateJoined < dateThreshold;
        }
        return userDateJoined > assistantThreshold;
      });
    }

    // Remove steps that are missing anchors, unless the anchor is included in
    // the expectedTargets and will appear at the step.
    const nextGuide =
      guideOptions.length > 0
        ? {
            ...guideOptions[0],
            steps: guideOptions[0].steps.filter(
              step =>
                anchors.has(step.target) ||
                guideOptions[0]?.expectedTargets?.includes(step.target)
            ),
          }
        : null;

    this.updatePrevGuide(nextGuide);
    this.state.currentStep =
      this.state.currentGuide &&
      nextGuide &&
      this.state.currentGuide.guide === nextGuide.guide
        ? this.state.currentStep
        : 0;
    this.state.currentGuide = nextGuide;
    this.trigger(this.state);
  },
};

const GuideStore = createStore(makeSafeRefluxStore(storeConfig));
export default GuideStore;
