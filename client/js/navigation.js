/**
 * RouteReady Campus - Dynamic Navigation & Header
 */

import { auth } from './auth.js';
import { initIcons } from './components/ui.js';

export function renderHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const user = auth.getUser();
  const isAdmin = auth.isAdmin();
  const currentPath = window.location.pathname;

  header.innerHTML = `
    <div class="container header-inner">
      <a href="/index.html" class="brand-link">
        <i data-lucide="bus" style="width: 24px; height: 24px; color: var(--color-primary);"></i>
        <span>RouteReady<span style="color: var(--color-accent); font-weight: 500;">Campus</span></span>
        <span class="demo-pill" title="Populated with demonstration data. Editable after administrator sign-in.">
          <i data-lucide="info" style="width: 12px; height: 12px;"></i> Demo Data
        </span>
      </a>

      <button class="mobile-menu-btn" id="mobile-toggle" aria-label="Toggle navigation menu">
        <i data-lucide="menu"></i>
      </button>

      <nav class="site-nav" id="site-nav">
        <a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
        <a href="/find-bus.html" class="nav-link ${currentPath.includes('find-bus') ? 'active' : ''}">Find Your Bus</a>
        <a href="/routes.html" class="nav-link ${currentPath.includes('routes') ? 'active' : ''}">Routes</a>
        <a href="/timetables.html" class="nav-link ${currentPath.includes('timetables') ? 'active' : ''}">Timetables</a>
        <a href="/announcements.html" class="nav-link ${currentPath.includes('announcements') ? 'active' : ''}">Announcements</a>
        ${isAdmin ? `<a href="/admin/index.html" class="nav-link ${currentPath.includes('/admin') ? 'active' : ''}" style="color: var(--color-accent); font-weight: 600;">Admin Dashboard</a>` : ''}
      </nav>

      <div class="header-actions">
        ${user ? `
          <a href="/dashboard.html" class="user-menu-pill">
            <div class="user-avatar-circle">${user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</div>
            <span>${user.full_name || 'My Account'}</span>
          </a>
          <button id="header-logout-btn" class="btn btn-outline btn-sm" title="Sign out">
            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
          </button>
        ` : `
          <a href="/login.html" class="btn btn-primary btn-sm">
            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
            <span>Sign In</span>
          </a>
        `}
      </div>
    </div>
  `;

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const siteNav = document.getElementById('site-nav');
  if (mobileToggle && siteNav) {
    mobileToggle.addEventListener('click', () => {
      siteNav.classList.toggle('open');
    });
  }

  // Logout action
  const logoutBtn = document.getElementById('header-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut();
    });
  }

  initIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
});

