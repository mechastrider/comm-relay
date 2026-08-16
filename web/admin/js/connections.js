import * as dom from './dom.js';

export const CONNECTIONS_SECTIONS = ['twitch', 'youtube', 'vk', 'network'];

const FIELD_SECTIONS = {
  twitch_channel: 'twitch',
  network_socks5_address: 'network',
  vk_channel: 'vk',
  youtube_video_input: 'youtube',
  youtube_channel_handle: 'youtube',
  youtube_connection_mode: 'youtube',
};

function connectionsTab(section) {
  return document.getElementById('connections-' + section + '-tab');
}

function connectionsPanel(section) {
  return document.getElementById('connections-' + section + '-panel');
}

export function connectionsSectionForFieldKey(fieldKey) {
  return FIELD_SECTIONS[fieldKey] || null;
}

export function connectionsSectionForElement(el) {
  if (!el) {
    return null;
  }

  const panel = el.closest('[data-connections-panel]');
  if (panel) {
    return panel.dataset.connectionsPanel || null;
  }

  for (const [fieldKey, input] of Object.entries(dom.fieldInputs)) {
    if (input === el) {
      return connectionsSectionForFieldKey(fieldKey);
    }
  }

  return null;
}

export function setConnectionsSection(section, options) {
  if (!dom.connectionsDialog || CONNECTIONS_SECTIONS.indexOf(section) === -1) {
    return;
  }

  CONNECTIONS_SECTIONS.forEach(function (id) {
    const tab = connectionsTab(id);
    const panel = connectionsPanel(id);
    if (!tab || !panel) {
      return;
    }
    const selected = id === section;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  });

  if (options && options.focusTab) {
    const tab = connectionsTab(section);
    if (tab) {
      tab.focus();
    }
  }
}

export function focusConnectionsField(el) {
  if (!el) {
    return;
  }
  const section = connectionsSectionForElement(el);
  if (section) {
    setConnectionsSection(section, { focusTab: false });
  }
}

export function initConnectionsTabs() {
  if (!dom.connectionsDialog) {
    return;
  }

  setConnectionsSection('twitch');

  dom.connectionsDialog.querySelectorAll('[data-connections-section]').forEach(function (button) {
    button.addEventListener('click', function () {
      setConnectionsSection(button.dataset.connectionsSection, {
        focusTab: button.getAttribute('role') !== 'tab',
      });
    });
  });

  const tabs = CONNECTIONS_SECTIONS.map(connectionsTab).filter(Boolean);
  tabs.forEach(function (tab, index) {
    tab.addEventListener('keydown', function (event) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') {
        nextIndex = index === 0 ? tabs.length - 1 : index - 1;
      } else if (event.key === 'ArrowRight') {
        nextIndex = index === tabs.length - 1 ? 0 : index + 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }
      setConnectionsSection(CONNECTIONS_SECTIONS[nextIndex], { focusTab: true });
    });
  });
}
