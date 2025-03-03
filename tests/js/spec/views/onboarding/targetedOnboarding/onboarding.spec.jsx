import {initializeOrg} from 'sentry-test/initializeOrg';
import {render, screen} from 'sentry-test/reactTestingLibrary';

import OrganizationStore from 'sentry/stores/organizationStore';
import {PersistedStoreProvider} from 'sentry/stores/persistedStore';
import ProjectsStore from 'sentry/stores/projectsStore';
import Onboarding from 'sentry/views/onboarding/targetedOnboarding/onboarding';
import {OrganizationContext} from 'sentry/views/organizationContext';

describe('Onboarding', function () {
  it('renders the welcome page', function () {
    const {organization, router, routerContext} = initializeOrg({
      router: {
        params: {
          step: 'welcome',
        },
      },
    });
    render(
      <OrganizationContext.Provider value={organization}>
        <Onboarding {...router} />
      </OrganizationContext.Provider>,
      {
        context: routerContext,
      }
    );
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByLabelText('Invite Team')).toBeInTheDocument();
  });
  it('renders the select platform step', async () => {
    const {organization, router, routerContext} = initializeOrg({
      router: {
        params: {
          step: 'select-platform',
        },
      },
    });
    MockApiClient.addMockResponse({
      url: `/organizations/${organization.slug}/client-state/`,
      body: {},
    });
    OrganizationStore.onUpdate(organization);
    render(
      <OrganizationContext.Provider value={organization}>
        <PersistedStoreProvider>
          <Onboarding {...router} />
        </PersistedStoreProvider>
      </OrganizationContext.Provider>,
      {
        context: routerContext,
      }
    );
    expect(
      await screen.findByText('Select all your projects platform')
    ).toBeInTheDocument();
    MockApiClient.clearMockResponses();
  });
  it('renders the setup docs step', async () => {
    const projects = [
      TestStubs.Project({
        platform: 'javascript-react',
        id: '4',
        slug: 'javascript-reactslug',
      }),
      TestStubs.Project({platform: 'ruby', id: '5', slug: 'ruby-slug'}),
      TestStubs.Project({
        platform: 'javascript-nextjs',
        id: '6',
        slug: 'javascript-nextslug',
      }),
    ];
    const {organization, router, routerContext} = initializeOrg({
      projects,
      router: {
        params: {
          step: 'setup-docs',
        },
      },
    });
    MockApiClient.addMockResponse({
      url: `/organizations/${organization.slug}/client-state/`,
      body: {
        onboarding: {
          platformToProjectIdMap: {
            'javascript-react': projects[0].slug,
            ruby: projects[1].slug,
            'javascript-nextjs': projects[2].slug,
          },
          selectedPlatforms: ['ruby', 'javascript-nextjs'],
        },
      },
    });
    MockApiClient.addMockResponse({
      url: `/projects/${organization.slug}/javascript-nextslug/`,
      body: {
        firstEvent: false,
      },
    });
    MockApiClient.addMockResponse({
      url: `/projects/${organization.slug}/javascript-nextslug/docs/javascript-nextjs/`,
      body: null,
    });
    ProjectsStore.loadInitialData(projects);
    OrganizationStore.onUpdate(organization);
    render(
      <OrganizationContext.Provider value={organization}>
        <PersistedStoreProvider>
          <Onboarding {...router} />
        </PersistedStoreProvider>
      </OrganizationContext.Provider>,
      {
        context: routerContext,
      }
    );
    expect(await screen.findAllByTestId('sidebar-error-indicator')).toHaveLength(2);
    MockApiClient.clearMockResponses();
  });
});
