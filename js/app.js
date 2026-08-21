const App = {
  state: {
    cars: [],
    bookings: [],
    wishlist: new Set(),
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'featured',
    selectedCar: null,
    rentalDays: 3,
    promoDiscount: 0,
    currentUser: null,
    pendingAction: null, // e.g. 'add-car'
    signupData: { email: '', name: '' },
    signupVerificationToken: null,
    otpTimerInterval: null
  },

  // 1. Initialization
  async init() {
    this.loadState();
    this.populateLocations();
    this.setDefaultDates();
    this.bindEvents();
    this.renderCars();
    this.updateCounters();
    this.initCustomSelects();
    this.initCustomDatePickers();

    // Check Backend Auth Session
    const savedUser = Api.getUser();
    if (savedUser) {
      this.state.currentUser = savedUser;
      this.updateAuthUI(savedUser);
      // Validate in background
      Api.getMe().then(user => {
        if (user) {
          this.state.currentUser = user;
          this.updateAuthUI(user);
        }
      }).catch(() => {});
    } else if (typeof FirebaseAuth !== 'undefined') {
      FirebaseAuth.init();
      FirebaseAuth.onAuthStateChanged((user) => {
        if (user && !this.state.currentUser) {
          this.state.currentUser = user;
          this.updateAuthUI(user);
        }
      });
    }

    // Sync Fleet with Backend API
    try {
      const data = await Api.getCars();
      if (data && data.cars && data.cars.length > 0) {
        this.state.cars = data.cars;
        this.saveCars();
        this.renderCars();
      }
    } catch (e) {
      console.log('Using local fleet state:', e.message);
    }

    // Sync Bookings with Backend API
    try {
      const bData = await Api.getBookings();
      if (bData && Array.isArray(bData.bookings)) {
        this.state.bookings = bData.bookings.filter(b => b.id !== 'BK-1092');
        this.saveBookings();
        this.updateCounters();
      }
    } catch (e) {
      console.log('Using local bookings state:', e.message);
    }
  },

  // 2. Load LocalStorage or Defaults
  loadState() {
    // Load Cars
    const savedCars = localStorage.getItem('apex_cars');
    this.state.cars = savedCars ? JSON.parse(savedCars) : [...DEFAULT_CARS];

    // Load Bookings (Starts at 0, only added when a user reserves a vehicle)
    const savedBookings = localStorage.getItem('apex_bookings');
    this.state.bookings = savedBookings ? JSON.parse(savedBookings).filter(b => b.id !== 'BK-1092') : [];
    this.saveBookings();

    // Load Wishlist (Starts clean)
    const savedWishlist = localStorage.getItem('apex_wishlist');
    this.state.wishlist = savedWishlist ? new Set(JSON.parse(savedWishlist)) : new Set();
  },

  saveCars() {
    localStorage.setItem('apex_cars', JSON.stringify(this.state.cars));
  },

  saveBookings() {
    localStorage.setItem('apex_bookings', JSON.stringify(this.state.bookings));
  },

  saveWishlist() {
    localStorage.setItem('apex_wishlist', JSON.stringify(Array.from(this.state.wishlist)));
  },

  // 3. UI Helpers
  populateLocations() {
    const pickSelect = document.getElementById('search-pickup');
    const dropSelect = document.getElementById('search-dropoff');
    if (pickSelect && dropSelect) {
      const optionsHtml = LOCATIONS.map(loc => `<option value="${loc}">${loc}</option>`).join('');
      pickSelect.innerHTML = optionsHtml;
      dropSelect.innerHTML = optionsHtml;
      this.initCustomSelects();
    }
  },

  // ---------------------------------------------------------------------------
  // WEB-THEMED CUSTOM SELECT COMPONENT
  // ---------------------------------------------------------------------------
  initCustomSelects() {
    document.querySelectorAll('select.form-select').forEach(select => {
      const parent = select.parentElement;
      if (!parent) return;

      const existingWrap = parent.querySelector(`.custom-select-wrap[data-for="${select.id}"]`);
      if (existingWrap) existingWrap.remove();

      select.style.display = 'none';

      const wrap = document.createElement('div');
      wrap.className = 'custom-select-wrap';
      if (select.id) wrap.setAttribute('data-for', select.id);
      if (select.style.width) wrap.style.width = select.style.width;

      const selectedOpt = select.options[select.selectedIndex] || select.options[0];
      const currentText = selectedOpt ? selectedOpt.text : 'Select option';

      wrap.innerHTML = `
        <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
          <span class="custom-select-label">${currentText}</span>
          <svg class="custom-select-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="custom-select-dropdown" role="listbox">
          ${Array.from(select.options).map(opt => `
            <div class="custom-select-option ${opt.selected ? 'active' : ''}" data-value="${opt.value}">
              <span>${opt.text}</span>
              <svg class="custom-select-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          `).join('')}
        </div>
      `;

      const trigger = wrap.querySelector('.custom-select-trigger');
      const label = wrap.querySelector('.custom-select-label');
      const options = wrap.querySelectorAll('.custom-select-option');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('open');
        document.querySelectorAll('.custom-select-wrap.open').forEach(w => {
          if (w !== wrap) {
            w.classList.remove('open');
            w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
          }
        });
        wrap.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });

      options.forEach(optEl => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          select.value = val;
          label.textContent = optEl.querySelector('span').textContent;

          options.forEach(o => o.classList.remove('active'));
          optEl.classList.add('active');

          wrap.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');

          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      select.parentNode.insertBefore(wrap, select.nextSibling);
    });

    if (!window.customSelectListenerAttached) {
      window.customSelectListenerAttached = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrap.open').forEach(wrap => {
          wrap.classList.remove('open');
          wrap.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
        });
      });
    }
  },

  // Helper: Format Date to YYYY-MM-DD
  formatDate(date) {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  },

  // Helper: Format Display Date (e.g. "21 Aug 2026")
  formatDisplayDate(dateStr) {
    if (!dateStr) return 'Select Date';
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[month - 1]} ${year}`;
  },

  // Helper: Get next day string (YYYY-MM-DD)
  getNextDay(dateStr, addDays = 1) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + addDays);
    return this.formatDate(d);
  },

  // ---------------------------------------------------------------------------
  // WEB-THEMED CUSTOM CALENDAR / DATEPICKER COMPONENT
  // ---------------------------------------------------------------------------
  initCustomDatePickers() {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    document.querySelectorAll('input[type="date"]').forEach(input => {
      const parent = input.parentElement;
      if (!parent) return;

      const existingWrap = parent.querySelector(`.custom-datepicker-wrap[data-for="${input.id}"]`);
      if (existingWrap) existingWrap.remove();

      input.style.display = 'none';

      const wrap = document.createElement('div');
      wrap.className = 'custom-datepicker-wrap';
      if (input.id) wrap.setAttribute('data-for', input.id);

      let viewDate = input.value ? new Date(input.value + 'T00:00:00') : new Date();
      if (isNaN(viewDate.getTime())) viewDate = new Date();

      wrap.innerHTML = `
        <button type="button" class="custom-datepicker-trigger" aria-haspopup="dialog" aria-expanded="false">
          <span class="custom-datepicker-label">${this.formatDisplayDate(input.value)}</span>
          <svg class="custom-datepicker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </button>
        <div class="custom-datepicker-popover">
          <div class="cal-header">
            <button type="button" class="cal-nav-btn cal-prev-month" title="Previous Month">‹</button>
            <span class="cal-month-title"></span>
            <button type="button" class="cal-nav-btn cal-next-month" title="Next Month">›</button>
          </div>
          <div class="cal-weekdays-row">
            ${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}
          </div>
          <div class="cal-days-grid"></div>
          <div class="cal-shortcuts-row">
            <button type="button" class="cal-shortcut-btn" data-days="0">Today</button>
            <button type="button" class="cal-shortcut-btn" data-days="1">Tomorrow</button>
            <button type="button" class="cal-shortcut-btn" data-days="3">+3 Days</button>
            <button type="button" class="cal-shortcut-btn" data-days="7">+7 Days</button>
          </div>
        </div>
      `;

      const trigger = wrap.querySelector('.custom-datepicker-trigger');
      const label = wrap.querySelector('.custom-datepicker-label');
      const popover = wrap.querySelector('.custom-datepicker-popover');
      const titleEl = wrap.querySelector('.cal-month-title');
      const grid = wrap.querySelector('.cal-days-grid');
      const prevBtn = wrap.querySelector('.cal-prev-month');
      const nextBtn = wrap.querySelector('.cal-next-month');
      const shortcutBtns = wrap.querySelectorAll('.cal-shortcut-btn');

      const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        titleEl.textContent = `${MONTHS[month]} ${year}`;

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        const todayStr = this.formatDate(new Date());
        const selectedVal = input.value;
        const minVal = input.min || '';

        let cellsHtml = '';

        for (let i = 0; i < firstDayIndex; i++) {
          cellsHtml += `<div class="cal-day-cell empty"></div>`;
        }

        for (let day = 1; day <= totalDays; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedVal === dateStr;
          const isToday = todayStr === dateStr;
          const isDisabled = minVal && dateStr < minVal;

          cellsHtml += `
            <div class="cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}" data-date="${dateStr}">
              ${day}
            </div>
          `;
        }

        grid.innerHTML = cellsHtml;

        grid.querySelectorAll('.cal-day-cell:not(.disabled):not(.empty)').forEach(cell => {
          cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = cell.getAttribute('data-date');
            input.value = dateStr;
            label.textContent = this.formatDisplayDate(dateStr);
            wrap.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');

            input.dispatchEvent(new Event('change', { bubbles: true }));
            this.updateAllCustomDatePickerLabels();
          });
        });
      };

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('open');

        document.querySelectorAll('.custom-datepicker-wrap.open, .custom-select-wrap.open').forEach(w => {
          if (w !== wrap) {
            w.classList.remove('open');
            w.querySelector('.custom-datepicker-trigger, .custom-select-trigger')?.setAttribute('aria-expanded', 'false');
          }
        });

        if (!isOpen) {
          if (input.value) {
            viewDate = new Date(input.value + 'T00:00:00');
            if (isNaN(viewDate.getTime())) viewDate = new Date();
          }
          renderCalendar();
        }

        wrap.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewDate.setMonth(viewDate.getMonth() - 1);
        renderCalendar();
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewDate.setMonth(viewDate.getMonth() + 1);
        renderCalendar();
      });

      shortcutBtns.forEach(sBtn => {
        sBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const add = parseInt(sBtn.getAttribute('data-days'), 10) || 0;
          const baseDate = (input.min && input.min > this.formatDate(new Date())) ? new Date(input.min + 'T00:00:00') : new Date();
          baseDate.setDate(baseDate.getDate() + add);
          const dateStr = this.formatDate(baseDate);

          input.value = dateStr;
          label.textContent = this.formatDisplayDate(dateStr);
          wrap.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');

          input.dispatchEvent(new Event('change', { bubbles: true }));
          this.updateAllCustomDatePickerLabels();
        });
      });

      parent.insertBefore(wrap, input.nextSibling);
    });

    if (!window.customDatePickerListenerAttached) {
      window.customDatePickerListenerAttached = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-datepicker-wrap.open').forEach(wrap => {
          wrap.classList.remove('open');
          wrap.querySelector('.custom-datepicker-trigger')?.setAttribute('aria-expanded', 'false');
        });
      });
    }
  },

  updateAllCustomDatePickerLabels() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
      const parent = input.parentElement;
      if (!parent) return;
      const wrap = parent.querySelector(`.custom-datepicker-wrap[data-for="${input.id}"]`);
      if (wrap) {
        const label = wrap.querySelector('.custom-datepicker-label');
        if (label) label.textContent = this.formatDisplayDate(input.value);
      }
    });
  },

  setDefaultDates() {
    const today = new Date();
    const todayStr = this.formatDate(today);
    const pickStr = this.getNextDay(todayStr, 1);
    const retStr = this.getNextDay(pickStr, 3);

    const pickInput = document.getElementById('search-pickdate');
    const retInput = document.getElementById('search-retdate');

    if (pickInput && retInput) {
      // Pick-up cannot be in the past
      pickInput.min = todayStr;
      pickInput.value = pickStr;

      // Return date must be at least the day after pick-up
      retInput.min = this.getNextDay(pickStr, 1);
      retInput.value = retStr;
    }

    this.updateAllCustomDatePickerLabels();
  },

  bindEvents() {
    // Pick-up Date Change in Hero Search
    const searchPick = document.getElementById('search-pickdate');
    const searchRet = document.getElementById('search-retdate');

    if (searchPick && searchRet) {
      searchPick.addEventListener('change', () => {
        const pickVal = searchPick.value;
        if (!pickVal) return;

        const nextDay = this.getNextDay(pickVal, 1);
        searchRet.min = nextDay;

        // If return date is earlier than or same as pickup date, bump it forward
        if (!searchRet.value || searchRet.value <= pickVal) {
          searchRet.value = this.getNextDay(pickVal, 3);
          this.showToast('Return date updated to follow pickup date', 'info');
        }
        this.updateAllCustomDatePickerLabels();
      });

      searchRet.addEventListener('change', () => {
        const pickVal = searchPick.value;
        const retVal = searchRet.value;

        if (pickVal && retVal <= pickVal) {
          searchRet.value = this.getNextDay(pickVal, 1);
          this.showToast('Return date must be after pickup date', 'warning');
        }
        this.updateAllCustomDatePickerLabels();
      });
    }

    // Category Pills
    document.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.activeCategory = btn.getAttribute('data-cat');
        this.renderCars();
      });
    });

    // Search Input
    const searchInput = document.getElementById('car-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.trim().toLowerCase();
        this.renderCars();
      });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('car-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.renderCars();
      });
    }

    // Hero Search Form
    const heroSearch = document.getElementById('hero-search-form');
    if (heroSearch) {
      heroSearch.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (searchPick && searchRet && searchRet.value <= searchPick.value) {
          searchRet.value = this.getNextDay(searchPick.value, 1);
          this.showToast('Return date must be after pickup date', 'warning');
          return;
        }

        const fleetSection = document.getElementById('fleet');
        if (fleetSection) {
          fleetSection.scrollIntoView({ behavior: 'smooth' });
        }
        this.showToast('Updated car availability for selected dates!');
      });
    }
  },

  // 4. Filter & Render Vehicles
  getFilteredCars() {
    let list = [...this.state.cars];

    // Filter by category
    if (this.state.activeCategory !== 'all') {
      list = list.filter(c => c.category === this.state.activeCategory);
    }

    // Filter by search text
    if (this.state.searchQuery) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(this.state.searchQuery) ||
        c.brand.toLowerCase().includes(this.state.searchQuery)
      );
    }

    // Sorting
    if (this.state.sortBy === 'price-low') {
      list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    } else if (this.state.sortBy === 'price-high') {
      list.sort((a, b) => b.pricePerDay - a.pricePerDay);
    } else if (this.state.sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  },

  renderCars() {
    const grid = document.getElementById('cars-grid');
    if (!grid) return;

    const cars = this.getFilteredCars();

    if (cars.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
          <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No cars match your search</h3>
          <p style="color: var(--text-muted); margin-bottom: 1rem;">Try searching for another model or changing the category filter.</p>
          <button class="btn btn-secondary btn-sm" onclick="App.resetFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = cars.map(car => {
      const isFav = this.state.wishlist.has(car.id);
      const isUserOwner = Boolean(this.state.currentUser && (
        car.creatorUid === this.state.currentUser.uid || 
        (car.creatorEmail && this.state.currentUser.email && car.creatorEmail === this.state.currentUser.email)
      ));

      return `
        <div class="car-card">
          <div class="car-img-box">
            <img src="${car.image}" alt="${car.name}" class="car-img" loading="lazy" />
            <span class="car-badge">${car.category}</span>
            
            ${isUserOwner ? `
              <button class="car-delete-btn" onclick="event.stopPropagation(); App.removeUserCar('${car.id}')" title="Remove my listed vehicle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            ` : ''}

            <button class="car-fav-btn ${isFav ? 'is-fav' : ''}" onclick="App.toggleWishlist('${car.id}')" title="Save to favorites">
              <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
          </div>

          <div class="car-body">
            <div class="car-title-row">
              <h3 class="car-name">${car.name}</h3>
              <span class="star-rating-wrap">
                <svg class="star-icon-svg" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                ${car.rating}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <div class="car-location" style="margin-bottom: 0;">
                <svg class="location-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${car.location || 'Downtown Center'}
              </div>
              ${isUserOwner ? `
                <button class="btn btn-outline-danger btn-xs" onclick="event.stopPropagation(); App.removeUserCar('${car.id}')" title="Delete listing">
                  Remove
                </button>
              ` : ''}
            </div>

            <div class="car-specs">
              <div class="spec-item">
                <svg viewBox="0 0 24 24"><path d="M3 22v-8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"></path><path d="M13 10V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"></path><circle cx="8" cy="6" r="2"></circle></svg>
                ${car.fuel}
              </div>
              <div class="spec-item">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                ${car.transmission.split(' ')[0]}
              </div>
              <div class="spec-item">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                ${car.seats} Seats
              </div>
              <div class="spec-item">
                <svg viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>
                A/C
              </div>
            </div>

            <div class="car-foot">
              <div class="car-price">$${car.pricePerDay} <span>/ day</span></div>
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-secondary btn-sm" onclick="App.openDetailsModal('${car.id}')">Specs</button>
                <button class="btn btn-primary btn-sm" onclick="App.openBookingModal('${car.id}')">Book Now</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 5. Wishlist & Counters
  toggleWishlist(carId) {
    if (this.state.wishlist.has(carId)) {
      this.state.wishlist.delete(carId);
      this.showToast('Removed from saved cars');
    } else {
      this.state.wishlist.add(carId);
      this.showToast('Saved to your favorites');
    }
    this.saveWishlist();
    this.renderCars();
    this.updateCounters();
  },

  updateCounters() {
    const bookingPill = document.getElementById('my-bookings-count');
    const wishlistPill = document.getElementById('wishlist-count');

    if (bookingPill) bookingPill.textContent = this.state.bookings.length;
    if (wishlistPill) wishlistPill.textContent = this.state.wishlist.size;
  },

  resetFilters() {
    this.state.activeCategory = 'all';
    this.state.searchQuery = '';
    this.state.sortBy = 'featured';

    const searchInput = document.getElementById('car-search-input');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat') === 'all');
    });

    this.renderCars();
  },

  // 6. Booking Modal Flow (Auth-Protected)
  openBookingModal(carId) {
    // Check if user is logged in
    if (!this.state.currentUser) {
      this.state.pendingAction = { type: 'book', carId: carId };
      this.showToast('Please sign in or create an account to reserve this car', 'info');
      this.openAuthModal('login', 'Sign in required to reserve a vehicle');
      return;
    }

    const car = this.state.cars.find(c => c.id === carId);
    if (!car) return;

    this.state.selectedCar = car;
    this.state.rentalDays = 3;
    this.state.promoDiscount = 0;

    const modal = document.getElementById('booking-modal');
    const body = document.getElementById('booking-modal-body');

    const defaultName = this.state.currentUser ? (this.state.currentUser.name || this.state.currentUser.displayName || this.state.currentUser.email.split('@')[0]) : '';
    const defaultEmail = this.state.currentUser ? this.state.currentUser.email : '';

    body.innerHTML = `
      <div>
        <div style="display: flex; gap: 1rem; align-items: center; background: var(--bg-card-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <img src="${car.image}" style="width: 100px; height: 65px; object-fit: cover; border-radius: 6px;" alt="${car.name}"/>
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 700;">${car.name}</h4>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${car.fuel} • ${car.transmission} • ${car.seats} Seats</div>
            <div style="font-weight: 700; color: var(--primary); font-size: 1rem; margin-top: 0.2rem;">$${car.pricePerDay} / day</div>
          </div>
        </div>

        <form onsubmit="event.preventDefault(); App.confirmBooking();">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label">Pick-up Date</label>
              <input type="date" id="book-pick-date" class="form-input" required onchange="App.handleBookingPickDateChange()"/>
            </div>
            <div class="form-group">
              <label class="form-label">Return Date</label>
              <input type="date" id="book-ret-date" class="form-input" required onchange="App.handleBookingRetDateChange()"/>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Pick-up & Return Location</label>
            <select id="book-location" class="form-select">
              ${LOCATIONS.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; margin: 1.25rem 0 0.5rem;">Driver Information</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="book-name" class="form-input" required placeholder="John Doe" value="${defaultName}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="book-phone" class="form-input" required placeholder="+1 555-0199" value="+1 (555) 234-5678"/>
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Email Address</label>
              <input type="email" id="book-email" class="form-input" required placeholder="john@example.com" value="${defaultEmail}"/>
            </div>
          </div>

          <!-- Promo Code Box -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
            <input type="text" id="promo-input" class="form-input" placeholder="Promo code (e.g. DRIVE10, SAVE20)" style="text-transform: uppercase;"/>
            <button type="button" class="btn btn-secondary btn-sm" onclick="App.applyPromo()">Apply</button>
          </div>

          <!-- Price Summary Card -->
          <div style="background: var(--bg-card-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
              <span>Daily Rate ($${car.pricePerDay} × <span id="summary-days">3</span> days)</span>
              <span id="summary-base">$${car.pricePerDay * 3}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
              <span>Taxes & Standard Insurance</span>
              <span>Included ($0)</span>
            </div>
            <div id="summary-discount-row" style="display: none; justify-content: space-between; color: var(--accent-emerald); font-weight: 600; margin-bottom: 0.4rem;">
              <span>Promo Discount</span>
              <span id="summary-discount">-$0</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.15rem; border-top: 1px solid var(--border-color); padding-top: 0.6rem; margin-top: 0.6rem;">
              <span>Total Amount</span>
              <span style="color: var(--primary);" id="summary-total">$${car.pricePerDay * 3}</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem; font-size: 1.05rem;">
            Confirm Reservation & Instant Key
          </button>
        </form>
      </div>
    `;

    // Populate dates with strict min bounds
    const todayStr = this.formatDate(new Date());
    let pickVal = document.getElementById('search-pickdate')?.value || this.getNextDay(todayStr, 1);
    let retVal = document.getElementById('search-retdate')?.value || this.getNextDay(pickVal, 3);

    // Make sure return is strictly after pickup
    if (retVal <= pickVal) {
      retVal = this.getNextDay(pickVal, 3);
    }

    const bookPickInput = document.getElementById('book-pick-date');
    const bookRetInput = document.getElementById('book-ret-date');

    if (bookPickInput && bookRetInput) {
      bookPickInput.min = todayStr;
      bookPickInput.value = pickVal;

      bookRetInput.min = this.getNextDay(pickVal, 1);
      bookRetInput.value = retVal;
    }

    this.calculateBookingPrice();
    this.initCustomDatePickers();
    this.updateAllCustomDatePickerLabels();
    modal.classList.add('active');
  },

  handleBookingPickDateChange() {
    const pickInput = document.getElementById('book-pick-date');
    const retInput = document.getElementById('book-ret-date');
    if (!pickInput || !retInput) return;

    const pickVal = pickInput.value;
    if (!pickVal) return;

    const minReturn = this.getNextDay(pickVal, 1);
    retInput.min = minReturn;

    if (!retInput.value || retInput.value <= pickVal) {
      retInput.value = this.getNextDay(pickVal, 3);
      this.showToast('Return date adjusted to follow pickup date', 'info');
    }

    this.calculateBookingPrice();
  },

  handleBookingRetDateChange() {
    const pickInput = document.getElementById('book-pick-date');
    const retInput = document.getElementById('book-ret-date');
    if (!pickInput || !retInput) return;

    const pickVal = pickInput.value;
    const retVal = retInput.value;

    if (pickVal && retVal <= pickVal) {
      retInput.value = this.getNextDay(pickVal, 1);
      this.showToast('Return date must be after pickup date', 'warning');
    }

    this.calculateBookingPrice();
  },

  calculateBookingPrice() {
    const pickDate = document.getElementById('book-pick-date')?.value;
    const retDate = document.getElementById('book-ret-date')?.value;
    if (!pickDate || !retDate || !this.state.selectedCar) return;

    const diff = Math.ceil((new Date(retDate) - new Date(pickDate)) / (1000 * 60 * 60 * 24));
    this.state.rentalDays = diff > 0 ? diff : 1;

    const base = this.state.selectedCar.pricePerDay * this.state.rentalDays;
    let discount = 0;
    if (this.state.promoDiscount > 0) {
      if (this.state.promoDiscount < 1) {
        discount = Math.round(base * this.state.promoDiscount);
      } else {
        discount = Math.min(this.state.promoDiscount, base);
      }
    }

    const total = Math.max(0, base - discount);

    const daysEl = document.getElementById('summary-days');
    const baseEl = document.getElementById('summary-base');
    const totalEl = document.getElementById('summary-total');
    const discRow = document.getElementById('summary-discount-row');
    const discEl = document.getElementById('summary-discount');

    if (daysEl) daysEl.textContent = this.state.rentalDays;
    if (baseEl) baseEl.textContent = `$${base}`;
    if (totalEl) totalEl.textContent = `$${total}`;

    if (discRow && discEl) {
      if (discount > 0) {
        discRow.style.display = 'flex';
        discEl.textContent = `-$${discount}`;
      } else {
        discRow.style.display = 'none';
      }
    }
  },

  applyPromo() {
    const code = document.getElementById('promo-input')?.value.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      this.state.promoDiscount = PROMO_CODES[code];
      this.showToast(`Promo applied! Discount added.`, 'success');
      this.calculateBookingPrice();
    } else {
      this.showToast('Invalid promo code. Try DRIVE10 or SAVE20');
    }
  },

  confirmBooking() {
    if (!this.state.currentUser) {
      this.showToast('Please sign in or create an account to complete your booking', 'warning');
      this.closeModal('booking-modal');
      this.openAuthModal('login', 'Sign in required to confirm reservation');
      return;
    }

    const car = this.state.selectedCar;
    const name = document.getElementById('book-name')?.value || this.state.currentUser.name || 'Valued Driver';
    const pickDate = document.getElementById('book-pick-date')?.value;
    let retDate = document.getElementById('book-ret-date')?.value;
    const location = document.getElementById('book-location')?.value;

    // Safety validation
    if (!pickDate || !retDate || retDate <= pickDate) {
      retDate = this.getNextDay(pickDate || this.formatDate(new Date()), 1);
      const bookRetInput = document.getElementById('book-ret-date');
      if (bookRetInput) bookRetInput.value = retDate;
      this.calculateBookingPrice();
      this.showToast('Return date must be after pickup date', 'warning');
      return;
    }

    const base = car.pricePerDay * this.state.rentalDays;
    let discount = 0;
    if (this.state.promoDiscount > 0) {
      discount = this.state.promoDiscount < 1 ? Math.round(base * this.state.promoDiscount) : this.state.promoDiscount;
    }
    const total = Math.max(0, base - discount);

    const newBooking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      carId: car.id,
      carName: car.name,
      carImage: car.image,
      pickupDate: pickDate,
      returnDate: retDate,
      days: this.state.rentalDays,
      totalPrice: total,
      location: location,
      driverName: name,
      driverEmail: this.state.currentUser ? this.state.currentUser.email : '',
      status: 'Confirmed'
    };

    this.state.bookings.unshift(newBooking);
    this.saveBookings();
    this.updateCounters();

    // Persist to Firebase Realtime Database
    if (typeof FirebaseRTDB !== 'undefined') FirebaseRTDB.saveBooking(newBooking);

    Api.createBooking(newBooking).then(res => {
      if (res && res.booking) {
        console.log('✅ Booking successfully saved to Database:', res.booking.id);
      }
    }).catch(err => {
      console.warn('Booking API note:', err.message);
    });

    // Show voucher view in modal
    const body = document.getElementById('booking-modal-body');
    body.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.35rem;">Booking Confirmed!</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Your car reservation has been successfully booked.</p>

        <div class="voucher-card">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">Booking Reference</span>
            <strong style="color: var(--primary); font-family: monospace; font-size: 1.1rem;">#${newBooking.id}</strong>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: left; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-muted); display: block;">Vehicle</span>
              <strong>${newBooking.carName}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">Driver</span>
              <strong>${newBooking.driverName}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">Duration</span>
              <strong>${newBooking.days} Days ($${newBooking.totalPrice})</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block;">Pickup Station</span>
              <strong>${newBooking.location}</strong>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; justify-content: center;">
          <button class="btn btn-secondary btn-sm" onclick="window.print()" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Receipt
          </button>
          <button class="btn btn-primary btn-sm" onclick="App.closeModal('booking-modal'); App.openMyBookingsModal();">View in My Bookings</button>
        </div>
      </div>
    `;

    this.showToast('Reservation confirmed!');
  },

  // 7. Quick Specs Details Modal
  openDetailsModal(carId) {
    const car = this.state.cars.find(c => c.id === carId);
    if (!car) return;

    const isUserOwner = Boolean(this.state.currentUser && (
      car.creatorUid === this.state.currentUser.uid || 
      (car.creatorEmail && this.state.currentUser.email && car.creatorEmail === this.state.currentUser.email)
    ));

    const modal = document.getElementById('details-modal');
    const body = document.getElementById('details-modal-body');

    body.innerHTML = `
      <div>
        <img src="${car.image}" style="width: 100%; height: 240px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1.25rem;" alt="${car.name}"/>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 800;">${car.name}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.2rem;">
              <span>${car.brand}</span> • <span>${car.category.toUpperCase()}</span> • 
              <span class="star-rating-wrap">
                <svg class="star-icon-svg" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                ${car.rating} (${car.reviews} reviews)
              </span>
            </div>
            ${isUserOwner ? '<div style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem;">(Listed by You)</div>' : ''}
          </div>
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">$${car.pricePerDay} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">/day</span></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; background: var(--bg-card-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; font-size: 0.9rem;">
          <div><strong>Fuel:</strong> ${car.fuel}</div>
          <div><strong>Transmission:</strong> ${car.transmission}</div>
          <div><strong>Seating:</strong> ${car.seats} Passengers</div>
          <div><strong>Doors:</strong> ${car.doors} Doors</div>
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">Key Features:</h4>
        <ul style="list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
          ${(car.features || ['Air Conditioning', 'Bluetooth', 'Touchscreen']).map(f => `
            <li style="background: var(--bg-card-subtle); padding: 0.35rem 0.7rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--accent-emerald);"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ${f}
            </li>
          `).join('')}
        </ul>

        <div style="display: flex; gap: 0.75rem;">
          ${isUserOwner ? `
            <button class="btn btn-outline-danger" style="flex: 1;" onclick="App.removeUserCar('${car.id}')">
              Remove Listing
            </button>
          ` : ''}
          <button class="btn btn-primary" style="flex: 2;" onclick="App.closeModal('details-modal'); App.openBookingModal('${car.id}')">
            Book This Car
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  // 8. My Bookings Modal
  openMyBookingsModal() {
    const modal = document.getElementById('my-bookings-modal');
    const body = document.getElementById('my-bookings-modal-body');

    if (this.state.bookings.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-card-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <h4 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem;">No Active Bookings</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem;">You haven't reserved any vehicles yet.</p>
        </div>
      `;
    } else {
      body.innerHTML = this.state.bookings.map(b => `
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <img src="${b.carImage}" style="width: 75px; height: 50px; object-fit: cover; border-radius: 6px;" alt="${b.carName}"/>
            <div>
              <div style="font-weight: 700; font-size: 1rem;">${b.carName}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Ref: #${b.id} • ${b.pickupDate} to ${b.returnDate}</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary); margin-top: 0.15rem;">$${b.totalPrice} (${b.days} Days)</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="App.cancelBooking('${b.id}')" style="color: var(--accent-rose);">
            Cancel Booking
          </button>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  },

  cancelBooking(bookingId) {
    if (confirm('Cancel this car rental reservation?')) {
      this.state.bookings = this.state.bookings.filter(b => b.id !== bookingId);
      this.saveBookings();
      this.updateCounters();
      this.openMyBookingsModal();
      this.showToast('Reservation cancelled');

      Api.cancelBooking(bookingId).then(() => {
      console.log('✅ Booking cancelled in Firebase Realtime Database:', bookingId);
    }).catch(err => {console.warn('Cancel API note:', err.message);});
    }
  },

  // 9. AUTH-GATED ADD CAR SYSTEM (User must be logged in!)
  openAddCarModal() {
    // Check if user is logged in
    if (!this.state.currentUser) {
      this.state.pendingAction = 'add-car';
      this.showToast('Please sign in or create an account to list a car');
      this.openAuthModal('login', 'Sign in required to list a vehicle to the fleet');
      return;
    }

    const modal = document.getElementById('add-car-modal');
    modal.classList.add('active');
    this.initCustomSelects();
  },

  async saveNewCar() {
    if (!this.state.currentUser) {
      this.showToast('Authentication required to add a car');
      this.openAuthModal('login');
      return;
    }

    const name = document.getElementById('new-name')?.value;
    const brand = document.getElementById('new-brand')?.value;
    const category = document.getElementById('new-cat')?.value;
    const pricePerDay = parseFloat(document.getElementById('new-price')?.value) || 75;
    const fuel = document.getElementById('new-fuel')?.value;
    const transmission = document.getElementById('new-trans')?.value;
    const seats = parseInt(document.getElementById('new-seats')?.value) || 5;
    const image = document.getElementById('new-image')?.value;

    const newCar = {
      id: 'car-' + Date.now(),
      name,
      brand,
      category,
      pricePerDay,
      fuel,
      transmission,
      seats,
      doors: 4,
      hasAC: true,
      rating: 5.0,
      reviews: 1,
      features: ['Air Conditioning', 'Power Steering', 'Bluetooth'],
      location: 'Downtown Center',
      image: image || 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
      creatorUid: String(this.state.currentUser.id || this.state.currentUser.uid),
      creatorEmail: this.state.currentUser.email
    };

    try {
      // Sync with backend API & Firebase Realtime Database
      if (typeof FirebaseRTDB !== 'undefined') FirebaseRTDB.saveCar(newCar);

      const res = await Api.addCar(newCar);
      if (res && res.car) {
        this.state.cars.unshift(res.car);
      } else {
        this.state.cars.unshift(newCar);
      }
    } catch (err) {
      console.warn('API add car failed, saving locally:', err.message);
      this.state.cars.unshift(newCar);
    }

    this.saveCars();
    this.renderCars();
    this.closeModal('add-car-modal');
    this.showToast(`Vehicle ${newCar.name} added successfully!`, 'success');
  },

  // Remove car listed by the logged-in user (strictly owner-protected)
  async removeUserCar(carId) {
    if (!this.state.currentUser) {
      this.showToast('Please sign in to manage your listings', 'warning');
      this.openAuthModal('login');
      return;
    }

    const carIndex = this.state.cars.findIndex(c => c.id === carId);
    if (carIndex === -1) {
      this.showToast('Vehicle not found', 'error');
      return;
    }

    const car = this.state.cars[carIndex];
    const currentUserId = String(this.state.currentUser.id || this.state.currentUser.uid);

    // Strict ownership verification:
    const isOwner = Boolean(
      (car.creatorUid && String(car.creatorUid) === currentUserId) || 
      (car.creatorEmail && this.state.currentUser.email && car.creatorEmail === this.state.currentUser.email)
    );

    if (!isOwner) {
      this.showToast('Permission denied: You can only remove vehicles you have listed.', 'warning');
      return;
    }

    if (confirm(`Are you sure you want to remove "${car.name}" from your listings?`)) {
      const removedName = car.name;

      try {
        await Api.deleteCar(carId);
      } catch (err) {
        console.warn('API delete car fallback:', err.message);
      }

      this.state.cars.splice(carIndex, 1);
      this.saveCars();
      this.renderCars();
      this.closeModal('details-modal');
      this.showToast(`"${removedName}" removed from the fleet`, 'success');
    }
  },

  // 10. AUTHENTICATION MODAL & 3-STEP OTP REGISTRATION
  openAuthModal(tab = 'login', noticeMsg = '') {
    const modal = document.getElementById('auth-modal');
    const noticeEl = document.getElementById('auth-notice-msg');
    const noticeBox = document.getElementById('auth-notice-box');

    if (noticeBox && noticeEl) {
      if (noticeMsg) {
        noticeEl.textContent = noticeMsg;
        noticeBox.style.display = 'flex';
      } else {
        noticeBox.style.display = 'none';
      }
    }

    const passInput = document.getElementById('auth-login-pass');
    if (passInput) passInput.value = '';

    this.switchAuthTab(tab);
    modal.classList.add('active');
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const registerContainer = document.getElementById('auth-register-container');
    const forgotContainer = document.getElementById('auth-forgot-container');
    const loginTabBtn = document.getElementById('tab-btn-login');
    const registerTabBtn = document.getElementById('tab-btn-register');
    const tabsRow = document.querySelector('.auth-tabs');
    const alertBox = document.getElementById('auth-alert-box');

    if (alertBox) alertBox.classList.remove('visible');

    if (tab === 'login') {
      if (tabsRow) tabsRow.style.display = 'flex';
      if (loginForm) loginForm.style.display = 'block';
      if (registerContainer) registerContainer.style.display = 'none';
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (loginTabBtn) loginTabBtn.classList.add('active');
      if (registerTabBtn) registerTabBtn.classList.remove('active');
    } else if (tab === 'register') {
      if (tabsRow) tabsRow.style.display = 'flex';
      if (loginForm) loginForm.style.display = 'none';
      if (registerContainer) registerContainer.style.display = 'block';
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (loginTabBtn) loginTabBtn.classList.remove('active');
      if (registerTabBtn) registerTabBtn.classList.add('active');
      this.goToSignupStep(1);
    } else if (tab === 'forgot') {
      if (tabsRow) tabsRow.style.display = 'none';
      if (loginForm) loginForm.style.display = 'none';
      if (registerContainer) registerContainer.style.display = 'none';
      if (forgotContainer) forgotContainer.style.display = 'block';
      this.goToForgotStep(1);
    }
  },

  // Toggle Password Field Visibility (Show / Hide)
  togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    if (btnEl) {
      if (isPassword) {
        // Show Eye-Off SVG (password visible, click to hide)
        btnEl.innerHTML = `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        btnEl.setAttribute('title', 'Hide Password');
        btnEl.setAttribute('aria-label', 'Hide Password');
      } else {
        // Show Eye SVG (password hidden, click to show)
        btnEl.innerHTML = `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        btnEl.setAttribute('title', 'Show Password');
        btnEl.setAttribute('aria-label', 'Show Password');
      }
    }
  },

  // Wizard Step Switcher (1 -> 2 -> 3)
  goToSignupStep(step) {
    const step1Form = document.getElementById('signup-step-1-form');
    const step2Form = document.getElementById('signup-step-2-form');
    const step3Form = document.getElementById('signup-step-3-form');
    const alertBox = document.getElementById('auth-alert-box');
    if (alertBox) alertBox.classList.remove('visible');

    const track1 = document.getElementById('track-step-1');
    const track2 = document.getElementById('track-step-2');
    const track3 = document.getElementById('track-step-3');
    const line1 = document.getElementById('track-line-1');
    const line2 = document.getElementById('track-line-2');

    // Reset forms
    step1Form.style.display = 'none';
    step2Form.style.display = 'none';
    step3Form.style.display = 'none';

    track1.className = 'step-track-item';
    track2.className = 'step-track-item';
    track3.className = 'step-track-item';
    line1.className = 'step-track-line';
    line2.className = 'step-track-line';

    if (step === 1) {
      step1Form.style.display = 'block';
      track1.classList.add('active');
    } else if (step === 2) {
      step2Form.style.display = 'block';
      track1.classList.add('completed');
      line1.classList.add('active');
      track2.classList.add('active');
      const otpInput = document.getElementById('auth-otp-input');
      if (otpInput) {
        otpInput.value = '';
        setTimeout(() => otpInput.focus(), 150);
      }
    } else if (step === 3) {
      step3Form.style.display = 'block';
      track1.classList.add('completed');
      line1.classList.add('active');
      track2.classList.add('completed');
      line2.classList.add('active');
      track3.classList.add('active');
      const passInput = document.getElementById('auth-reg-pass');
      if (passInput) setTimeout(() => passInput.focus(), 150);
    }
  },

  // ---------------------------------------------------------------------------
  // STEP 1: REQUEST OTP
  // ---------------------------------------------------------------------------
  async handleRequestOtp(e) {
    e.preventDefault();
    const name = document.getElementById('auth-reg-name')?.value.trim();
    const email = document.getElementById('auth-reg-email')?.value.trim();
    const alertBox = document.getElementById('auth-alert-box');
    const submitBtn = document.getElementById('request-otp-btn');

    if (!email) return;

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating Secure OTP...';
      }

      await Api.requestOtp(email, name);

      this.state.signupData = { email, name };

      const emailDisplay = document.getElementById('otp-sent-email-display');
      if (emailDisplay) emailDisplay.textContent = email;

      const otpInput = document.getElementById('auth-otp-input');
      if (otpInput) otpInput.value = '';

      this.startOtpTimer(600); // 10 minutes
      this.goToSignupStep(2);
      this.showToast('Verification code sent to your email');
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to request verification code.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Verification Code →';
      }
    }
  },

  async handleResendOtp() {
    if (!this.state.signupData.email) {
      this.goToSignupStep(1);
      return;
    }
    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) resendBtn.textContent = 'Resending...';

    try {
      await Api.requestOtp(this.state.signupData.email, this.state.signupData.name);
      this.startOtpTimer(600);
      const otpInput = document.getElementById('auth-otp-input');
      if (otpInput) otpInput.value = '';
      this.showToast('New verification code sent to your email!');
    } catch (err) {
      this.showToast(err.message || 'Failed to resend code', 'error');
    } finally {
      if (resendBtn) resendBtn.textContent = 'Resend Code';
    }
  },

  startOtpTimer(seconds) {
    if (this.state.otpTimerInterval) clearInterval(this.state.otpTimerInterval);

    let remaining = seconds;
    const badge = document.getElementById('otp-timer-badge');

    const updateDisplay = () => {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (badge) badge.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (remaining <= 0) {
        clearInterval(this.state.otpTimerInterval);
        if (badge) badge.textContent = 'Expired';
      }
      remaining--;
    };

    updateDisplay();
    this.state.otpTimerInterval = setInterval(updateDisplay, 1000);
  },

  // ---------------------------------------------------------------------------
  // STEP 2: VERIFY OTP
  // ---------------------------------------------------------------------------
  async handleVerifyOtp(e) {
    e.preventDefault();
    const otp = document.getElementById('auth-otp-input')?.value.trim();
    const alertBox = document.getElementById('auth-alert-box');
    const verifyBtn = document.getElementById('verify-otp-btn');

    if (!otp || otp.length !== 6) {
      if (alertBox) {
        alertBox.textContent = 'Please enter a valid 6-digit verification code.';
        alertBox.classList.add('visible');
      }
      return;
    }

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying Code...';
      }

      const res = await Api.verifyOtp(this.state.signupData.email, otp);

      this.state.signupVerificationToken = res.verificationToken;
      if (this.state.otpTimerInterval) clearInterval(this.state.otpTimerInterval);

      this.goToSignupStep(3);
      this.showToast('Code verified! Set your password.');
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Invalid verification code. Please try again.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Code & Continue →';
      }
    }
  },

  // ---------------------------------------------------------------------------
  // STEP 3: SET PASSWORD & CREATE ACCOUNT
  // ---------------------------------------------------------------------------
  async handleSetPassword(e) {
    e.preventDefault();
    const pass = document.getElementById('auth-reg-pass')?.value;
    const confirmPass = document.getElementById('auth-reg-pass-confirm')?.value;
    const alertBox = document.getElementById('auth-alert-box');
    const submitBtn = document.getElementById('complete-signup-btn');

    if (!pass || pass.length < 6) {
      if (alertBox) {
        alertBox.textContent = 'Password must be at least 6 characters long.';
        alertBox.classList.add('visible');
      }
      return;
    }

    if (pass !== confirmPass) {
      if (alertBox) {
        alertBox.textContent = 'Passwords do not match. Please re-enter.';
        alertBox.classList.add('visible');
      }
      return;
    }

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Your Account...';
      }

      const res = await Api.setPassword(
        this.state.signupVerificationToken,
        pass,
        this.state.signupData.name
      );

      this.state.currentUser = res.user;
      this.updateAuthUI(res.user);
      if (typeof FirebaseRTDB !== 'undefined') FirebaseRTDB.saveUser(res.user, pass);
      this.closeModal('auth-modal');
      this.showToast(`Account created! Welcome, ${res.user.name}!`, 'success');
      this.resumePendingAction();
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to complete registration.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Account Setup ✓';
      }
    }
  },

  // ---------------------------------------------------------------------------
  // RESUME PENDING USER ACTION (Bookings / Add Car)
  // ---------------------------------------------------------------------------
  resumePendingAction() {
    if (!this.state.pendingAction) return;
    const action = this.state.pendingAction;
    this.state.pendingAction = null;

    if (action === 'add-car') {
      setTimeout(() => this.openAddCarModal(), 300);
    } else if (typeof action === 'object' && action.type === 'book') {
      setTimeout(() => this.openBookingModal(action.carId), 300);
    }
  },

  // ---------------------------------------------------------------------------
  // EMAIL & PASSWORD LOGIN
  // ---------------------------------------------------------------------------
  async handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-login-email')?.value.trim();
    const pass = document.getElementById('auth-login-pass')?.value;
    const alertBox = document.getElementById('auth-alert-box');
    const loginBtn = document.getElementById('auth-login-btn');

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
      }

      const res = await Api.login(email, pass);
      this.state.currentUser = res.user;
      this.updateAuthUI(res.user);
      if (typeof FirebaseRTDB !== 'undefined') FirebaseRTDB.saveUser(res.user);
      this.closeModal('auth-modal');
      this.showToast(`Welcome back, ${res.user.name}!`, 'success');
      this.resumePendingAction();
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to sign in. Please verify your credentials.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Get Your Drive';
      }
    }
  },

  handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
      Api.logout();
      if (typeof FirebaseAuth !== 'undefined') {
        FirebaseAuth.signOut().catch(() => {});
      }
      this.state.currentUser = null;
      this.closeModal('account-modal');
      this.updateAuthUI(null);
      this.showToast('Signed out successfully');
      this.renderCars();
    }
  },

  updateAuthUI(user) {
    const container = document.getElementById('nav-auth-container');
    if (!container) return;

    if (user) {
      const name = user.name || user.displayName || user.email.split('@')[0];
      const initial = name.charAt(0).toUpperCase();

      container.innerHTML = `
        <button class="user-pill-btn" onclick="App.openAccountModal()" title="View Account & Listed Cars">
          <div class="user-avatar">
            ${user.photoURL ? `<img src="${user.photoURL}" alt="${name}"/>` : initial}
          </div>
          <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
          <svg class="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="App.openAuthModal('login')">
          Log In / Sign Up
        </button>
      `;
    }

    this.renderCars();
  },

  // 11. My Account Dashboard & User Listed Cars Modal
  openAccountModal(activeTab = 'fleet') {
    const user = this.state.currentUser;
    if (!user) {
      this.openAuthModal('login');
      return;
    }

    const modal = document.getElementById('account-modal');
    const body = document.getElementById('account-modal-body');
    if (!modal || !body) return;

    const name = user.name || user.displayName || user.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    const currentUserId = String(user.id || user.uid);
    const photoURL = user.photoURL || '';

    // Filter user's listed cars
    const userCars = this.state.cars.filter(car => 
      (car.creatorUid && String(car.creatorUid) === currentUserId) ||
      (car.creatorEmail && user.email && car.creatorEmail.toLowerCase() === user.email.toLowerCase())
    );

    const AVATARS = [
      { id: 'a1', label: 'Speed Pilot', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
      { id: 'a2', label: 'Luxury Driver', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
      { id: 'a3', label: 'Urban Racer', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80' },
      { id: 'a4', label: 'Executive', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
      { id: 'a5', label: 'Gold VIP', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80' }
    ];

    body.innerHTML = `
      <div>
        <!-- Profile Overview Top Card -->
        <div class="account-profile-card">
          <div class="account-avatar-large" id="acc-modal-avatar-preview">
            ${photoURL ? `<img src="${photoURL}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"/>` : initial}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${name}</div>
            <div style="font-size: 0.88rem; color: var(--text-muted); word-break: break-all;">${user.email}</div>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.35rem; font-size: 0.78rem; font-weight: 700; color: var(--accent-emerald); background: rgba(16, 185, 129, 0.1); padding: 0.2rem 0.55rem; border-radius: var(--radius-full);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Verified Account Member
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="account-nav-tabs">
          <button class="account-nav-tab ${activeTab === 'fleet' ? 'active' : ''}" onclick="App.openAccountModal('fleet')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            My Fleet (${userCars.length})
          </button>
          <button class="account-nav-tab ${activeTab === 'profile' ? 'active' : ''}" onclick="App.openAccountModal('profile')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Edit Profile
          </button>
          <button class="account-nav-tab ${activeTab === 'security' ? 'active' : ''}" onclick="App.openAccountModal('security')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Password & Security
          </button>
        </div>

        <!-- TAB 1: FLEET -->
        <div id="acc-tab-fleet" style="display: ${activeTab === 'fleet' ? 'block' : 'none'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0;">
              My Listed Vehicles <span style="font-size: 0.85rem; color: var(--primary); font-weight: 700;">(${userCars.length})</span>
            </h4>
            <button class="btn btn-secondary btn-xs" onclick="App.closeModal('account-modal'); App.openAddCarModal();" style="display: inline-flex; align-items: center; gap: 0.3rem;">
              <span>+ Add Vehicle</span>
            </button>
          </div>

          <div style="max-height: 250px; overflow-y: auto; margin-bottom: 1.5rem;">
            ${userCars.length === 0 ? `
              <div style="text-align: center; padding: 2rem 1rem; background: var(--bg-card-subtle); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-card); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem;">No Vehicles Listed Yet</div>
                <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 1rem;">Add your car to the fleet and start earning daily rentals.</p>
                <button class="btn btn-primary btn-sm" onclick="App.closeModal('account-modal'); App.openAddCarModal();">
                  + List Your First Car
                </button>
              </div>
            ` : userCars.map(car => `
              <div class="account-car-item">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <img src="${car.image}" alt="${car.name}" class="account-car-thumb"/>
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">${car.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${car.brand} • ${car.category.toUpperCase()}</div>
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary); margin-top: 0.15rem;">$${car.pricePerDay} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">/ day</span></div>
                  </div>
                </div>
                <div style="display: flex; gap: 0.4rem;">
                  <button class="btn btn-secondary btn-xs" onclick="App.closeModal('account-modal'); App.openDetailsModal('${car.id}');">Specs</button>
                  <button class="btn btn-outline-danger btn-xs" onclick="App.removeUserCar('${car.id}'); App.openAccountModal('fleet');" title="Remove this car listing">
                    Remove
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TAB 2: EDIT PROFILE -->
        <div id="acc-tab-profile" style="display: ${activeTab === 'profile' ? 'block' : 'none'};">
          <form onsubmit="App.handleUpdateProfile(event)" style="margin-bottom: 1.5rem;">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Full Display Name</label>
              <input type="text" id="acc-edit-name" class="form-input" value="${name}" required />
            </div>

            <!-- Upload from Device -->
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Profile Photo from Device</label>
              <div style="display: flex; gap: 0.75rem; align-items: center; background: var(--bg-card-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('acc-avatar-file-input').click()" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Choose Image from Device
                </button>
                <span id="acc-avatar-file-name" style="font-size: 0.8rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
                  ${photoURL ? 'Custom photo selected' : 'JPG, PNG, WebP supported'}
                </span>
                <input type="file" id="acc-avatar-file-input" accept="image/*" style="display: none;" onchange="App.handleAvatarFileUpload(event)" />
              </div>
            </div>

            <!-- Or Choose Avatar Preset -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label class="form-label" style="margin-bottom: 0;">Or Choose Driver Avatar Preset</label>
                <button type="button" class="btn-link" onclick="App.selectAvatarPreset('')" style="font-size: 0.78rem;">Reset to Initials</button>
              </div>
              <div class="avatar-preset-grid">
                <div class="avatar-preset-item ${!photoURL ? 'active' : ''}" onclick="App.selectAvatarPreset('')" title="Default Initials">
                  <div style="width: 100%; height: 100%; border-radius: 50%; background: var(--bg-card); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem;">
                    ${initial}
                  </div>
                </div>
                ${AVATARS.map(av => `
                  <div class="avatar-preset-item ${photoURL === av.url ? 'active' : ''}" onclick="App.selectAvatarPreset('${av.url}')" title="${av.label}">
                    <img src="${av.url}" alt="${av.label}" />
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Hidden input to store chosen photo data -->
            <input type="hidden" id="acc-edit-photo" value="${photoURL}" />

            <button type="submit" id="acc-save-profile-btn" class="btn btn-primary" style="width: 100%;">
              Save Profile Changes
            </button>
          </form>
        </div>

        <!-- TAB 3: PASSWORD & SECURITY -->
        <div id="acc-tab-security" style="display: ${activeTab === 'security' ? 'block' : 'none'};">
          <div id="acc-change-pass-section">
            <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
              Enter your current password to change it, or use the Email OTP reset flow if you have forgotten it.
            </div>

            <form onsubmit="App.handleChangePassword(event)" style="margin-bottom: 1.5rem;">
              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label">Current Password</label>
                <div class="password-input-wrap">
                  <input type="password" id="acc-curr-pass" class="form-input" placeholder="••••••••" required />
                  <button type="button" class="password-toggle-btn" onclick="App.togglePasswordVisibility('acc-curr-pass', this)" title="Show / Hide Password">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label">New Password (Min. 6 characters)</label>
                <div class="password-input-wrap">
                  <input type="password" id="acc-new-pass" class="form-input" placeholder="••••••••" required minlength="6" />
                  <button type="button" class="password-toggle-btn" onclick="App.togglePasswordVisibility('acc-new-pass', this)" title="Show / Hide Password">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label">Confirm New Password</label>
                <div class="password-input-wrap">
                  <input type="password" id="acc-new-pass-confirm" class="form-input" placeholder="••••••••" required minlength="6" />
                  <button type="button" class="password-toggle-btn" onclick="App.togglePasswordVisibility('acc-new-pass-confirm', this)" title="Show / Hide Password">
                    <svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <button type="button" class="btn-link" onclick="App.openAccountForgotFlow()" style="font-size: 0.82rem;">
                  Forgot current password? Reset with OTP
                </button>
              </div>

              <button type="submit" id="acc-change-pass-btn" class="btn btn-primary" style="width: 100%;">
                Update Password
              </button>
            </form>
          </div>
        </div>

        <!-- Action Footer with Sign Out Button Inside -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
          <button class="btn btn-secondary btn-sm" onclick="App.closeModal('account-modal')">
            Close
          </button>
          
          <button class="btn btn-outline-danger btn-sm" onclick="App.handleLogout()" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  selectAvatarPreset(url) {
    const input = document.getElementById('acc-edit-photo');
    if (input) input.value = url;
    this.previewAvatarUrl(url);

    document.querySelectorAll('.avatar-preset-item').forEach(item => {
      item.classList.remove('active');
    });
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }
  },

  previewAvatarUrl(url) {
    const preview = document.getElementById('acc-modal-avatar-preview');
    if (!preview) return;
    const name = this.state.currentUser?.name || 'User';
    const initial = name.charAt(0).toUpperCase();

    if (url && url.trim()) {
      preview.innerHTML = `<img src="${url.trim()}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"/>`;
    } else {
      preview.innerHTML = initial;
    }
  },

  handleAvatarFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.openCropModal(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  // ---------------------------------------------------------------------------
  // INTERACTIVE PHOTO CROPPER & ADJUSTMENT ENGINE (Avatars & Vehicles)
  // ---------------------------------------------------------------------------
  openCropModal(img, target = 'avatar') {
    if (!this.state.cropState) {
      this.state.cropState = {};
    }

    this.state.cropState = {
      image: img,
      target: target, // 'avatar' or 'car'
      zoom: 1,
      rotation: 0,
      panX: 0,
      panY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      carRawImage: target === 'car' ? img : (this.state.cropState.carRawImage || null)
    };

    const titleEl = document.querySelector('#crop-modal .modal-title');
    const descEl = document.querySelector('#crop-modal .modal-body p');
    const maskEl = document.querySelector('.crop-circle-mask');

    if (target === 'car') {
      if (titleEl) titleEl.textContent = 'Adjust & Crop Vehicle Photo';
      if (descEl) descEl.textContent = 'Drag to position, use the slider to zoom, and rotate to fit your vehicle.';
      if (maskEl) maskEl.className = 'crop-circle-mask mask-vehicle';
    } else {
      if (titleEl) titleEl.textContent = 'Adjust & Crop Profile Photo';
      if (descEl) descEl.textContent = 'Drag to position, use the slider to zoom, and rotate to fit your profile avatar.';
      if (maskEl) maskEl.className = 'crop-circle-mask mask-avatar';
    }

    const zoomInput = document.getElementById('crop-zoom-range');
    if (zoomInput) zoomInput.value = '1';

    const modal = document.getElementById('crop-modal');
    if (modal) modal.classList.add('active');

    this.initCropListeners();
    this.drawCropCanvas();
  },

  closeCropModal() {
    const modal = document.getElementById('crop-modal');
    if (modal) modal.classList.remove('active');
  },

  initCropListeners() {
    const container = document.getElementById('crop-viewport-container');
    if (!container || container.dataset.listenersInit === 'true') return;
    container.dataset.listenersInit = 'true';

    const onStart = (clientX, clientY) => {
      if (!this.state.cropState || !this.state.cropState.image) return;
      this.state.cropState.isDragging = true;
      this.state.cropState.startX = clientX - this.state.cropState.panX;
      this.state.cropState.startY = clientY - this.state.cropState.panY;
    };

    const onMove = (clientX, clientY) => {
      if (!this.state.cropState || !this.state.cropState.isDragging) return;
      this.state.cropState.panX = clientX - this.state.cropState.startX;
      this.state.cropState.panY = clientY - this.state.cropState.startY;
      this.drawCropCanvas();
    };

    const onEnd = () => {
      if (this.state.cropState) {
        this.state.cropState.isDragging = false;
      }
    };

    // Mouse Events
    container.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    // Touch Events
    container.addEventListener('touchstart', e => {
      if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', onEnd);
  },

  drawCropCanvas() {
    const cs = this.state.cropState;
    if (!cs || !cs.image) return;

    const canvas = document.getElementById('crop-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center of canvas
    ctx.translate(canvas.width / 2 + cs.panX, canvas.height / 2 + cs.panY);
    // Rotate
    ctx.rotate((cs.rotation * Math.PI) / 180);
    // Zoom
    ctx.scale(cs.zoom, cs.zoom);

    // Calculate aspect ratio fitting
    const img = cs.image;
    const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * baseScale;
    const drawH = img.height * baseScale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  },

  onCropZoomChange(val) {
    if (!this.state.cropState) return;
    this.state.cropState.zoom = parseFloat(val) || 1;
    this.drawCropCanvas();
  },

  adjustCropZoom(delta) {
    if (!this.state.cropState) return;
    const range = document.getElementById('crop-zoom-range');
    let newZoom = Math.min(3, Math.max(1, (this.state.cropState.zoom || 1) + delta));
    this.state.cropState.zoom = newZoom;
    if (range) range.value = newZoom;
    this.drawCropCanvas();
  },

  rotateCropImage(deg) {
    if (!this.state.cropState) return;
    this.state.cropState.rotation = (this.state.cropState.rotation + deg) % 360;
    this.drawCropCanvas();
  },

  resetCropAdjustments() {
    if (!this.state.cropState) return;
    this.state.cropState.zoom = 1;
    this.state.cropState.rotation = 0;
    this.state.cropState.panX = 0;
    this.state.cropState.panY = 0;
    const range = document.getElementById('crop-zoom-range');
    if (range) range.value = '1';
    this.drawCropCanvas();
  },

  applyCroppedPhoto() {
    const cs = this.state.cropState;
    if (!cs || !cs.image) return;

    if (cs.target === 'car') {
      // Create high-res 800x500 widescreen canvas (16:10 vehicle aspect ratio)
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 800;
      finalCanvas.height = 500;
      const ctx = finalCanvas.getContext('2d');

      ctx.save();
      ctx.translate(400 + cs.panX * (800 / 280), 250 + cs.panY * (500 / 175));
      ctx.rotate((cs.rotation * Math.PI) / 180);
      ctx.scale(cs.zoom, cs.zoom);

      const img = cs.image;
      const baseScale = Math.max(800 / img.width, 500 / img.height);
      const drawW = img.width * baseScale;
      const drawH = img.height * baseScale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.88);

      const input = document.getElementById('new-image');
      if (input) input.value = croppedDataUrl;

      const previewBox = document.getElementById('new-car-img-preview');
      const previewImg = document.getElementById('new-car-preview-img');
      if (previewBox && previewImg) {
        previewImg.src = croppedDataUrl;
        previewBox.style.display = 'block';
      }

      const label = document.getElementById('new-car-file-label');
      if (label) label.textContent = 'Cropped vehicle photo ready';

      this.closeCropModal();
      this.showToast('Vehicle photo cropped & adjusted!', 'success');
    } else {
      // Create high-res 300x300 avatar canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 300;
      finalCanvas.height = 300;
      const ctx = finalCanvas.getContext('2d');

      // Circular crop path
      ctx.save();
      ctx.beginPath();
      ctx.arc(150, 150, 150, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.translate(150 + cs.panX, 150 + cs.panY);
      ctx.rotate((cs.rotation * Math.PI) / 180);
      ctx.scale(cs.zoom, cs.zoom);

      const img = cs.image;
      const baseScale = Math.max(300 / img.width, 300 / img.height);
      const drawW = img.width * baseScale;
      const drawH = img.height * baseScale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.88);

      const input = document.getElementById('acc-edit-photo');
      if (input) input.value = croppedDataUrl;
      this.previewAvatarUrl(croppedDataUrl);

      const nameLabel = document.getElementById('acc-avatar-file-name');
      if (nameLabel) nameLabel.textContent = 'Cropped photo ready';

      document.querySelectorAll('.avatar-preset-item').forEach(item => {
        item.classList.remove('active');
      });

      this.closeCropModal();
      this.showToast('Photo cropped & adjusted! Click "Save Profile Changes" to save.', 'success');
    }
  },

  handleCarFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.openCropModal(img, 'car');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  reAdjustCarPhoto() {
    if (this.state.cropState?.carRawImage) {
      this.openCropModal(this.state.cropState.carRawImage, 'car');
      return;
    }
    const currentSrc = document.getElementById('new-car-preview-img')?.src || document.getElementById('new-image')?.value;
    if (currentSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.openCropModal(img, 'car');
      };
      img.src = currentSrc;
    } else {
      document.getElementById('new-car-file-input')?.click();
    }
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('acc-edit-name')?.value.trim();
    const photoURL = document.getElementById('acc-edit-photo')?.value.trim();
    const submitBtn = document.getElementById('acc-save-profile-btn');

    if (!name) return;

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Changes...';
      }

      const res = await Api.updateProfile(name, photoURL);
      this.state.currentUser = res.user;
      this.updateAuthUI(res.user);
      if (typeof FirebaseRTDB !== 'undefined') FirebaseRTDB.saveUser(res.user);

      // Update avatar previews
      this.previewAvatarUrl(res.user.photoURL);
      this.showToast('Profile updated successfully!', 'success');
      this.openAccountModal('profile');
    } catch (err) {
      this.showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile Changes';
      }
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('acc-curr-pass')?.value;
    const newPassword = document.getElementById('acc-new-pass')?.value;
    const confirmPassword = document.getElementById('acc-new-pass-confirm')?.value;
    const submitBtn = document.getElementById('acc-change-pass-btn');

    if (!currentPassword || !newPassword) return;

    if (newPassword !== confirmPassword) {
      this.showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating Password...';
      }

      await Api.changePassword(currentPassword, newPassword);
      this.showToast('Password updated successfully!', 'success');
      this.openAccountModal('security');
    } catch (err) {
      this.showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
      }
    }
  },

  openAccountForgotFlow() {
    this.closeModal('account-modal');
    this.openAuthModal('forgot');
    const emailInput = document.getElementById('auth-forgot-email');
    if (emailInput && this.state.currentUser) {
      emailInput.value = this.state.currentUser.email;
    }
  },

  openForgotPasswordFlow() {
    this.openAuthModal('forgot');
  },

  goToForgotStep(step) {
    const s1 = document.getElementById('forgot-step-1-form');
    const s2 = document.getElementById('forgot-step-2-form');
    const s3 = document.getElementById('forgot-step-3-form');
    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
    if (s3) s3.style.display = step === 3 ? 'block' : 'none';
  },

  async handleRequestForgotOtp(e) {
    e.preventDefault();
    const email = document.getElementById('auth-forgot-email')?.value.trim();
    const alertBox = document.getElementById('auth-alert-box');
    const submitBtn = document.getElementById('forgot-req-btn');

    if (!email) return;

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Reset Code...';
      }

      await Api.requestForgotOtp(email);
      this.state.forgotEmail = email;
      
      const emailDisplay = document.getElementById('forgot-sent-email-display');
      if (emailDisplay) emailDisplay.textContent = email;

      this.goToForgotStep(2);
      this.showToast('Password reset code sent to your email!');
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to send reset code.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Code →';
      }
    }
  },

  async handleResendForgotOtp() {
    if (!this.state.forgotEmail) return;
    try {
      await Api.requestForgotOtp(this.state.forgotEmail);
      this.showToast('New reset code sent to your email!');
    } catch (err) {
      this.showToast(err.message || 'Failed to resend code', 'error');
    }
  },

  async handleVerifyForgotOtp(e) {
    e.preventDefault();
    const otp = document.getElementById('auth-forgot-otp-input')?.value.trim();
    const alertBox = document.getElementById('auth-alert-box');
    const verifyBtn = document.getElementById('forgot-verify-btn');

    if (!otp) return;

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying Code...';
      }

      const res = await Api.verifyForgotOtp(this.state.forgotEmail, otp);
      this.state.forgotResetToken = res.resetToken;
      this.goToForgotStep(3);
      this.showToast('Code verified! Enter your new password.');
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Invalid reset code. Please try again.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Reset Code →';
      }
    }
  },

  async handleResetPasswordWithToken(e) {
    e.preventDefault();
    const newPass = document.getElementById('auth-forgot-new-pass')?.value;
    const confirmPass = document.getElementById('auth-forgot-new-pass-confirm')?.value;
    const alertBox = document.getElementById('auth-alert-box');
    const completeBtn = document.getElementById('forgot-complete-btn');

    if (!newPass || newPass.length < 6) {
      if (alertBox) {
        alertBox.textContent = 'Password must be at least 6 characters long.';
        alertBox.classList.add('visible');
      }
      return;
    }

    if (newPass !== confirmPass) {
      if (alertBox) {
        alertBox.textContent = 'Passwords do not match.';
        alertBox.classList.add('visible');
      }
      return;
    }

    try {
      if (alertBox) alertBox.classList.remove('visible');
      if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.textContent = 'Resetting Password...';
      }

      await Api.resetPasswordWithToken(this.state.forgotResetToken, newPass);
      this.showToast('Password reset successful! Please log in.', 'success');
      this.switchAuthTab('login');
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to reset password.';
        alertBox.classList.add('visible');
      }
    } finally {
      if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Reset Password & Sign In ✓';
      }
    }
  },

  // 12. Modals & Theme utilities
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      this.showToast('Light theme enabled');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      this.showToast('Dark theme enabled');
    }
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-box');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
};

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
