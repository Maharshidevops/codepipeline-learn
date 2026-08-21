import { useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { paths } from '@/routes/paths';
import AppearanceSection from '@/features/settings/AppearanceSection';
import ProfileTab from '@/features/settings/ProfileTab';
import ApiKeysTab from '@/features/settings/ApiKeysTab';
import '@/styles/pages/settings.css';

type SettingsTab = 'api-keys' | 'profile' | 'appearance';

const TAB_COPY: Record<SettingsTab, { title: string; subtitle: string }> = {
  'api-keys': {
    title: 'API Keys',
    subtitle:
      'Bring your own API keys for each provider. Your keys take precedence over org-level defaults and are used exclusively for your own runs.',
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Manage your personal profile and preferences.',
  },
  appearance: {
    title: 'Appearance',
    subtitle: 'Choose your preferred theme for the interface.',
  },
};

function isSettingsTab(tab: string | undefined): tab is SettingsTab {
  return tab === 'api-keys' || tab === 'profile' || tab === 'appearance';
}

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSettingsTab(tab)) {
      navigate(paths.settings.apiKeys, { replace: true });
    }
  }, [tab, navigate]);

  const copy = isSettingsTab(tab) ? TAB_COPY[tab] : TAB_COPY['api-keys'];

  return (
    <div className="settings-page">
      <div className="container settings-container">
        <div className="settings-header-container">
          <div className="settings-header">
            <div className="settings-title-section">
              <span className="settings-eyebrow">SETTINGS</span>
              <h1 className="settings-title page-title">{copy.title}</h1>
              <p className="settings-subtitle">{copy.subtitle}</p>
            </div>
          </div>

          <ul className="nav nav-tabs settings-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <NavLink
                to={paths.settings.apiKeys}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                role="tab"
              >
                API Keys
              </NavLink>
            </li>
            <li className="nav-item" role="presentation">
              <NavLink
                to={paths.settings.profile}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                role="tab"
              >
                My Profile
              </NavLink>
            </li>
            <li className="nav-item" role="presentation">
              <NavLink
                to={paths.settings.appearance}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                role="tab"
              >
                Appearance
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="settings-content">
          {tab === 'api-keys' && <ApiKeysTab />}
          {tab === 'profile' && <ProfileTab />}
          {tab === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}
