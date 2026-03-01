import { onReady } from '../base/init.js';

onReady(() => {
  const root = document.querySelector('.tires');
  if (!root) return;

  const cards = Array.from(root.querySelectorAll('.js-filter-card'));
  const seasonButtons = Array.from(root.querySelectorAll('.js-select-season'));
  const diameterSelect = root.querySelector('.js-select-diameter');
  const profileSelect = root.querySelector('.js-select-profile');
  const widthSelect = root.querySelector('.js-select-width');
  const emptyState = root.querySelector('.js-filter-empty');

  const includesToken = (source, token) => {
    if (!token) return true;
    return (source || '').includes(`|${token}|`);
  };

  const applyFilter = () => {
    const activeSeasonBtn = seasonButtons.find((btn) => btn.classList.contains('active'));
    const season = activeSeasonBtn ? activeSeasonBtn.dataset.season : '';
    const diameter = diameterSelect ? diameterSelect.value : '';
    const profile = profileSelect ? profileSelect.value : '';
    const width = widthSelect ? widthSelect.value : '';

    let visibleCount = 0;

    cards.forEach((card) => {
      let visible = true;
      const cardSeason = card.dataset.season || '|';
      const cardDiameter = card.dataset.diameter || '|';
      const cardProfile = card.dataset.profile || '|';
      const cardWidth = card.dataset.width || '|';

      if (season && !includesToken(cardSeason, season)) visible = false;
      if (diameter && !includesToken(cardDiameter, diameter)) visible = false;
      if (profile && !includesToken(cardProfile, profile)) visible = false;
      if (width && !includesToken(cardWidth, width)) visible = false;

      card.classList.toggle('hidden', !visible);
      if (visible) visibleCount += 1;
    });

    if (emptyState) {
      emptyState.classList.toggle('hidden', visibleCount > 0);
    }
  };

  seasonButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.classList.contains('disabled')) return;
      const wasActive = btn.classList.contains('active');
      seasonButtons.forEach((item) => item.classList.remove('active'));
      if (!wasActive) btn.classList.add('active');
      applyFilter();
    });
  });

  [diameterSelect, profileSelect, widthSelect].forEach((select) => {
    if (!select) return;
    select.addEventListener('change', applyFilter);
  });
});
