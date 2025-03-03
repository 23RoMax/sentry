import {Fragment} from 'react';
import styled from '@emotion/styled';
import {motion, Variants} from 'framer-motion';

import Button from 'sentry/components/button';
import ButtonBar from 'sentry/components/buttonBar';
import Link from 'sentry/components/links/link';
import {IconCheckmark} from 'sentry/icons';
import {t} from 'sentry/locale';
import pulsingIndicatorStyles from 'sentry/styles/pulsingIndicator';
import space from 'sentry/styles/space';
import {Group, Organization, Project} from 'sentry/types';
import trackAdvancedAnalyticsEvent from 'sentry/utils/analytics/trackAdvancedAnalyticsEvent';
import EventWaiter from 'sentry/utils/eventWaiter';
import testableTransition from 'sentry/utils/testableTransition';
import CreateSampleEventButton from 'sentry/views/onboarding/createSampleEventButton';

import GenericFooter from './genericFooter';

interface FirstEventFooterProps {
  handleFirstIssueReceived: () => void;
  hasFirstEvent: boolean;
  isLast: boolean;
  onClickSetupLater: () => void;
  organization: Organization;
  project: Project;
}

export default function FirstEventFooter({
  organization,
  project,
  onClickSetupLater,
  isLast,
  hasFirstEvent,
  handleFirstIssueReceived,
}: FirstEventFooterProps) {
  const source = 'targeted_onboarding_first_event_footer';

  const getSecondaryCta = () => {
    // if hasn't sent first event, allow skiping
    if (!hasFirstEvent) {
      return <Button onClick={onClickSetupLater}>{t('Setup Later')}</Button>;
    }
    // if last, no secondary cta
    if (isLast) {
      return null;
    }
    return <Button onClick={onClickSetupLater}>{t('Next Platform')}</Button>;
  };

  const getPrimaryCta = ({firstIssue}: {firstIssue: null | true | Group}) => {
    // if hasn't sent first event, allow creation of sample error
    if (!hasFirstEvent) {
      return (
        <CreateSampleEventButton
          project={project}
          source="targted-onboarding"
          priority="primary"
        >
          {t('View Sample Error')}
        </CreateSampleEventButton>
      );
    }

    return (
      <Button
        to={`/organizations/${organization.slug}/issues/${
          firstIssue !== true && firstIssue !== null ? `${firstIssue.id}/` : ''
        }`}
        priority="primary"
      >
        {t('Take me to my error')}
      </Button>
    );
  };

  return (
    <GridFooter>
      <SkipOnboardingLink
        onClick={() =>
          trackAdvancedAnalyticsEvent('growth.onboarding_clicked_skip', {
            organization,
            source,
          })
        }
        to={`/organizations/${organization.slug}/issues/`}
      >
        {t('Skip Onboarding')}
      </SkipOnboardingLink>
      <EventWaiter
        eventType="error"
        onIssueReceived={handleFirstIssueReceived}
        {...{project, organization}}
      >
        {({firstIssue}) => (
          <Fragment>
            <StatusWrapper>
              {hasFirstEvent ? (
                <IconCheckmark isCircled color="green400" />
              ) : (
                <WaitingIndicator />
              )}
              <AnimatedText errorReceived={hasFirstEvent}>
                {hasFirstEvent ? t('Error Received') : t('Waiting for error')}
              </AnimatedText>
            </StatusWrapper>
            <OnboardingButtonBar gap={2}>
              {getSecondaryCta()}
              {getPrimaryCta({firstIssue})}
            </OnboardingButtonBar>
          </Fragment>
        )}
      </EventWaiter>
    </GridFooter>
  );
}

const OnboardingButtonBar = styled(ButtonBar)`
  margin: ${space(2)} ${space(4)};
  justify-self: end;
`;

const AnimatedText = styled(motion.div, {
  shouldForwardProp: prop => prop !== 'errorReceived',
})<{errorReceived: boolean}>`
  margin-left: ${space(1)};
  color: ${p =>
    p.errorReceived ? p.theme.successText : p.theme.charts.getColorPalette(5)[4]};
`;

const indicatorAnimation: Variants = {
  initial: {opacity: 0, y: -10},
  animate: {opacity: 1, y: 0},
  exit: {opacity: 0, y: 10},
};

AnimatedText.defaultProps = {
  variants: indicatorAnimation,
  transition: testableTransition(),
};

const WaitingIndicator = styled(motion.div)`
  ${pulsingIndicatorStyles};
  background-color: ${p => p.theme.charts.getColorPalette(5)[4]};
`;

WaitingIndicator.defaultProps = {
  variants: indicatorAnimation,
  transition: testableTransition(),
};

const StatusWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  font-size: ${p => p.theme.fontSizeMedium};
  justify-content: center;
`;

StatusWrapper.defaultProps = {
  initial: 'initial',
  animate: 'animate',
  exit: 'exit',
  variants: {
    initial: {opacity: 0, y: -10},
    animate: {
      opacity: 1,
      y: 0,
      transition: testableTransition({when: 'beforeChildren', staggerChildren: 0.35}),
    },
    exit: {opacity: 0, y: 10},
  },
};

const SkipOnboardingLink = styled(Link)`
  margin: auto ${space(4)};
`;

const GridFooter = styled(GenericFooter)`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
`;
