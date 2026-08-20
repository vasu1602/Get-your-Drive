// End-to-End Multi-Step Booking & Checkout Flow
const BookingFlow = {
  activeCar: null,
  currentStep: 1,
  selectedProtection: PROTECTION_PLANS[1], // Default to Premium
  selectedAddons: new Set(['gps']),
  appliedCoupon: null,
  pickupDate: '',
  returnDate: '',
  pickupLocation: '',
  dropoffLocation: '',
  confirmedBooking: null,

  init() {
    this.modalBackdrop = document.getElementById('booking-modal');
    this.modalBody = document.getElementById('booking-modal-body');
    this.closeBtn = document.getElementById('close-booking-modal-btn');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.close();
      });
    }
  },

  start(carId) {
    const car = Store.getCarById(carId);
    if (!car) {
      App.showToast('Selected vehicle not found', 'warning');
      return;
    }

    this.activeCar = car;
    this.currentStep = 1;
    this.appliedCoupon = null;
    this.confirmedBooking = null;

    // Use current search params or default dates
    const sp = Store.state.searchParams;
    this.pickupDate = sp.pickupDate;
    this.returnDate = sp.returnDate;
    this.pickupLocation = sp.pickupLocation || LOCATIONS[0];
    this.dropoffLocation = sp.dropoffLocation || LOCATIONS[0];

    this.render();
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.add('active');
    }
  },

  close() {
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.remove('active');
    }
  },

  getRentalDays() {
    if (!this.pickupDate || !this.returnDate) return 1;
    const start = new Date(this.pickupDate);
    const end = new Date(this.returnDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  },

  calculatePricing() {
    const days = this.getRentalDays();
    const baseTotal = (this.activeCar?.dailyRate || 0) * days;
    const protectionTotal = (this.selectedProtection?.pricePerDay || 0) * days;

    let addonsTotal = 0;
    for (const addonId of this.selectedAddons) {
      const addon = EXTRA_ADDONS.find(a => a.id === addonId);
      if (addon) {
        addonsTotal += addon.pricePerDay * days;
      }
    }

    const subtotal = baseTotal + protectionTotal + addonsTotal;
    
    let discount = 0;
    if (this.appliedCoupon) {
      if (this.appliedCoupon.type === 'percent') {
        discount = Math.round((subtotal * this.appliedCoupon.value) / 100);
      } else if (this.appliedCoupon.type === 'fixed') {
        discount = Math.min(this.appliedCoupon.value, subtotal);
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Math.round(discountedSubtotal * 0.08); // 8% tax & fees
    const deposit = this.selectedProtection?.id === 'super' ? 0 : 250; // Zero deposit for super cover
    const grandTotal = discountedSubtotal + tax + deposit;

    return {
      days,
      baseTotal,
      protectionTotal,
      addonsTotal,
      subtotal,
      discount,
      tax,
      deposit,
      grandTotal
    };
  },

  setStep(step) {
    this.currentStep = step;
    this.render();
  },

  render() {
    if (!this.modalBody || !this.activeCar) return;

    let stepContent = '';
    if (this.currentStep === 1) {
      stepContent = this.renderStep1();
    } else if (this.currentStep === 2) {
      stepContent = this.renderStep2();
    } else if (this.currentStep === 3) {
      stepContent = this.renderStep3();
    } else if (this.currentStep === 4) {
      stepContent = this.renderStep4();
    }

    this.modalBody.innerHTML = `
      <!-- Step Progress Bar -->
      <div class="step-tracker">
        <div class="step-item ${this.currentStep === 1 ? 'active' : (this.currentStep > 1 ? 'completed' : '')}">
          <div class="step-circle">${this.currentStep > 1 ? '✓' : '1'}</div>
          <div class="step-title">Trip & Cover</div>
        </div>
        <div class="step-item ${this.currentStep === 2 ? 'active' : (this.currentStep > 2 ? 'completed' : '')}">
          <div class="step-circle">${this.currentStep > 2 ? '✓' : '2'}</div>
          <div class="step-title">Driver Details</div>
        </div>
        <div class="step-item ${this.currentStep === 3 ? 'active' : (this.currentStep > 3 ? 'completed' : '')}">
          <div class="step-circle">${this.currentStep > 3 ? '✓' : '3'}</div>
          <div class="step-title">Review & Pay</div>
        </div>
        <div class="step-item ${this.currentStep === 4 ? 'active' : ''}">
          <div class="step-circle">4</div>
          <div class="step-title">Voucher & Key</div>
        </div>
      </div>

      ${stepContent}
    `;
  },

  renderStep1() {
    const days = this.getRentalDays();
    const pricing = this.calculatePricing();

    return `
      <div>
        <!-- Car preview banner -->
        <div style="display: flex; gap: 1.25rem; align-items: center; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
          <img src="${this.activeCar.image}" style="width: 110px; height: 75px; object-fit: cover; border-radius: 8px;" alt="${this.activeCar.name}" />
          <div>
            <div style="font-size: 1.2rem; font-weight: 800; color: #fff;">${this.activeCar.name}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${this.activeCar.category.toUpperCase()} • ${this.activeCar.horsepower} HP • ${this.activeCar.transmission}</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent-cyan); margin-top: 0.25rem;">$${this.activeCar.dailyRate}/day × ${days} Days = $${pricing.baseTotal}</div>
          </div>
        </div>

        <!-- Dates & Locations -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="form-group">
            <label class="form-label">Pick-up Date</label>
            <input type="date" class="form-control" value="${this.pickupDate}" onchange="BookingFlow.updateDates('pickup', this.value)"/>
          </div>
          <div class="form-group">
            <label class="form-label">Return Date</label>
            <input type="date" class="form-control" value="${this.returnDate}" onchange="BookingFlow.updateDates('return', this.value)"/>
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Pick-up & Drop-off Location</label>
            <select class="form-control" onchange="BookingFlow.pickupLocation = this.value">
              ${LOCATIONS.map(loc => `<option value="${loc}" ${loc === this.pickupLocation ? 'selected' : ''}>${loc}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Protection Plans -->
        <h4 style="font-size: 1.05rem; margin-bottom: 0.75rem;">Select Protection Package</h4>
        <div class="protection-grid">
          ${PROTECTION_PLANS.map(plan => {
            const isSelected = this.selectedProtection?.id === plan.id;
            return `
              <div class="protection-card ${isSelected ? 'selected' : ''}" onclick="BookingFlow.selectProtection('${plan.id}')">
                ${plan.isPopular ? `<div class="protection-pop-tag">Recommended</div>` : ''}
                <div class="protection-name">${plan.name}</div>
                <div class="protection-price">${plan.pricePerDay === 0 ? 'Included' : `+$${plan.pricePerDay}/day`}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">${plan.deductible}</div>
                <ul class="protection-features">
                  ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                </ul>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Addons -->
        <h4 style="font-size: 1.05rem; margin-bottom: 0.75rem;">Optional Extras & Add-ons</h4>
        <div>
          ${EXTRA_ADDONS.map(addon => {
            const isChecked = this.selectedAddons.has(addon.id);
            return `
              <div class="addon-row ${isChecked ? 'selected' : ''}" onclick="BookingFlow.toggleAddon('${addon.id}')">
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">${addon.name}</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">${addon.description}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-weight: 700; color: var(--accent-cyan);">+$${addon.pricePerDay}/day</span>
                  <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);" />
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Estimated Total (${days} Days)</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #fff;">$${pricing.grandTotal}</div>
          </div>
          <button class="btn btn-primary btn-lg" onclick="BookingFlow.setStep(2)">
            Continue to Driver Details →
          </button>
        </div>
      </div>
    `;
  },

  renderStep2() {
    const user = Store.state.user;

    return `
      <div>
        <h3 style="margin-bottom: 0.5rem;">Primary Driver Information</h3>
        <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">Please verify driver credentials for keyless vehicle unlocking.</p>

        <form id="driver-info-form" onsubmit="event.preventDefault(); BookingFlow.saveDriverAndProceed();">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="driver-name" class="form-control" required value="${user.fullName}" placeholder="e.g. Alexander Vance"/>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address (for Booking Voucher)</label>
              <input type="email" id="driver-email" class="form-control" required value="${user.email}" placeholder="alex@example.com"/>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" id="driver-phone" class="form-control" required value="${user.phone}" placeholder="+1 (555) 000-0000"/>
            </div>
            <div class="form-group">
              <label class="form-label">Driver's License Number</label>
              <input type="text" id="driver-license" class="form-control" required value="${user.licenseNumber}" placeholder="DL-XXXXX"/>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 1rem; margin: 1.5rem 0; display: flex; align-items: center; gap: 0.75rem;">
            <input type="checkbox" id="age-confirm" checked required style="width: 18px; height: 18px; accent-color: var(--accent-emerald);" />
            <label for="age-confirm" style="font-size: 0.85rem; color: #fff; cursor: pointer;">
              I confirm the primary driver is at least 21 years of age and holds a valid government-issued driver's license.
            </label>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
            <button type="button" class="btn btn-secondary" onclick="BookingFlow.setStep(1)">← Back to Trip</button>
            <button type="submit" class="btn btn-primary btn-lg">Review & Payment →</button>
          </div>
        </form>
      </div>
    `;
  },

  renderStep3() {
    const pricing = this.calculatePricing();

    return `
      <div>
        <h3 style="margin-bottom: 0.5rem;">Review & Simulated Payment</h3>
        <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">Review rental summary and confirm your instant reservation.</p>

        <!-- Invoice Breakdown Card -->
        <div class="invoice-card">
          <div class="invoice-row">
            <span>${this.activeCar.name} (${pricing.days} days @ $${this.activeCar.dailyRate}/day)</span>
            <span>$${pricing.baseTotal}</span>
          </div>
          <div class="invoice-row">
            <span>Protection (${this.selectedProtection.name})</span>
            <span>$${pricing.protectionTotal}</span>
          </div>
          <div class="invoice-row">
            <span>Selected Add-ons (${this.selectedAddons.size} items)</span>
            <span>$${pricing.addonsTotal}</span>
          </div>
          ${pricing.discount > 0 ? `
            <div class="invoice-row" style="color: var(--accent-emerald); font-weight: 700;">
              <span>Promo Code Discount (${this.appliedCoupon.code})</span>
              <span>-$${pricing.discount}</span>
            </div>
          ` : ''}
          <div class="invoice-row">
            <span>State Tax & Concession Fees (8%)</span>
            <span>$${pricing.tax}</span>
          </div>
          <div class="invoice-row">
            <span>Refundable Security Deposit</span>
            <span>${pricing.deposit === 0 ? '<span style="color: var(--accent-emerald);">Waived ($0)</span>' : `$${pricing.deposit}`}</span>
          </div>
          <div class="invoice-row total">
            <span>Total Payable Now</span>
            <span class="gradient-text" style="font-size: 1.4rem;">$${pricing.grandTotal}</span>
          </div>
        </div>

        <!-- Coupon code input -->
        <div class="coupon-box">
          <input type="text" id="coupon-input" class="form-control" placeholder="Promo code (e.g. APEX20, DRIVE50, FIRST15)" style="text-transform: uppercase;" value="${this.appliedCoupon ? this.appliedCoupon.code : ''}"/>
          <button type="button" class="btn btn-secondary" onclick="BookingFlow.applyCoupon()">Apply</button>
        </div>

        <!-- Payment Details Simulator -->
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">Simulated Card Payment</div>
            <div style="display: flex; gap: 0.4rem; font-size: 0.8rem; color: var(--text-secondary);">
              <span>💳 Visa</span> • <span>Mastercard</span> • <span>Amex</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Card Number</label>
            <input type="text" class="form-control" value="•••• •••• •••• 4242" readonly style="font-family: monospace; letter-spacing: 0.1em; background: rgba(0,0,0,0.3);"/>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Expiry (MM/YY)</label>
              <input type="text" class="form-control" value="12/28" readonly style="background: rgba(0,0,0,0.3);"/>
            </div>
            <div class="form-group">
              <label class="form-label">Security CVC</label>
              <input type="text" class="form-control" value="888" readonly style="background: rgba(0,0,0,0.3);"/>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="BookingFlow.setStep(2)">← Back to Driver</button>
          <button type="button" class="btn btn-primary btn-lg anim-pulse-glow" onclick="BookingFlow.confirmBooking()">
            ⚡ Confirm & Issue Digital Key
          </button>
        </div>
      </div>
    `;
  },

  renderStep4() {
    const booking = this.confirmedBooking;
    if (!booking) return '';

    return `
      <div>
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 2px solid var(--accent-emerald); font-size: 2rem; margin-bottom: 0.75rem;">
            ✓
          </div>
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff;">Reservation Confirmed!</h2>
          <p style="font-size: 0.95rem;">Your booking is active and your digital car key is ready to connect.</p>
        </div>

        <!-- Voucher Card -->
        <div class="voucher-container" id="printable-voucher">
          <div class="voucher-watermark">APEX</div>
          
          <div class="voucher-header">
            <div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Reservation Reference</div>
              <div class="voucher-code">${booking.id}</div>
            </div>
            <div class="voucher-qr-wrap">
              <!-- Inline High-contrast SVG QR Representation -->
              <svg viewBox="0 0 100 100" width="90" height="90">
                <rect width="100" height="100" fill="#ffffff"/>
                <path d="M10,10 h25 v25 h-25 z M15,15 v15 h15 v-15 z M20,20 h5 v5 h-5 z" fill="#0f172a"/>
                <path d="M65,10 h25 v25 h-25 z M70,15 v15 h15 v-15 z M75,20 h5 v5 h-5 z" fill="#0f172a"/>
                <path d="M10,65 h25 v25 h-25 z M15,70 v15 h15 v-15 z M20,75 h5 v5 h-5 z" fill="#0f172a"/>
                <circle cx="50" cy="50" r="10" fill="#3b82f6"/>
                <rect x="42" y="15" width="16" height="6" fill="#0f172a"/>
                <rect x="15" y="45" width="8" height="12" fill="#0f172a"/>
                <rect x="75" y="45" width="12" height="8" fill="#0f172a"/>
                <rect x="45" y="75" width="14" height="10" fill="#0f172a"/>
                <rect x="65" y="65" width="20" height="20" fill="#0f172a"/>
              </svg>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Vehicle</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${booking.carName}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.carBrand}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Primary Driver</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${booking.driver.fullName}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.driver.licenseNumber}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Pickup Window</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${booking.pickupDate} (10:00 AM)</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.pickupLocation}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Return Window</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${booking.returnDate} (10:00 AM)</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.dropoffLocation}</div>
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.35); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255, 255, 255, 0.08);">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Protection Plan: <strong style="color: #fff;">${booking.protectionPlan.name}</strong></span>
            <span style="font-size: 1.1rem; font-weight: 800; color: var(--accent-emerald);">$${booking.pricing.grandTotal} Paid</span>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary btn-lg" onclick="BookingFlow.close(); DigitalKey.open('${booking.id}')">
            📱 Open Connected Car Key
          </button>
          <button class="btn btn-secondary" onclick="window.print()">
            🖨️ Print Voucher
          </button>
          <button class="btn btn-outline" onclick="BookingFlow.close(); App.switchTab('bookings')">
            View in My Bookings
          </button>
        </div>
      </div>
    `;
  },

  updateDates(type, val) {
    if (type === 'pickup') this.pickupDate = val;
    if (type === 'return') this.returnDate = val;
    this.render();
  },

  selectProtection(planId) {
    this.selectedProtection = PROTECTION_PLANS.find(p => p.id === planId);
    this.render();
  },

  toggleAddon(addonId) {
    if (this.selectedAddons.has(addonId)) {
      this.selectedAddons.delete(addonId);
    } else {
      this.selectedAddons.add(addonId);
    }
    this.render();
  },

  applyCoupon() {
    const input = document.getElementById('coupon-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      this.appliedCoupon = null;
      this.render();
      return;
    }

    if (PROMO_CODES[code]) {
      this.appliedCoupon = { code, ...PROMO_CODES[code] };
      App.showToast(`Coupon applied! ${this.appliedCoupon.desc}`, 'success');
      this.render();
    } else {
      App.showToast('Invalid coupon code. Try APEX20, DRIVE50, or FIRST15', 'warning');
    }
  },

  saveDriverAndProceed() {
    const name = document.getElementById('driver-name')?.value;
    const email = document.getElementById('driver-email')?.value;
    const phone = document.getElementById('driver-phone')?.value;
    const license = document.getElementById('driver-license')?.value;

    if (name && email) {
      Store.saveUser({
        fullName: name,
        email,
        phone,
        licenseNumber: license
      });
      this.setStep(3);
    }
  },

  confirmBooking() {
    const pricing = this.calculatePricing();
    const addonsArray = Array.from(this.selectedAddons).map(id => EXTRA_ADDONS.find(a => a.id === id)).filter(Boolean);

    const bookingData = {
      carId: this.activeCar.id,
      carName: this.activeCar.name,
      carImage: this.activeCar.image,
      carBrand: this.activeCar.brand,
      pickupLocation: this.pickupLocation,
      dropoffLocation: this.dropoffLocation,
      pickupDate: this.pickupDate,
      returnDate: this.returnDate,
      days: pricing.days,
      dailyRate: this.activeCar.dailyRate,
      protectionPlan: this.selectedProtection,
      addons: addonsArray,
      driver: { ...Store.state.user },
      pricing: pricing
    };

    const newBooking = Store.addBooking(bookingData);
    this.confirmedBooking = newBooking;
    this.setStep(4);

    App.showToast('Booking confirmed! Digital voucher generated.', 'success');
  }
};
