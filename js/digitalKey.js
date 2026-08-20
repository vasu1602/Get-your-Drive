// Digital Car Key Controller & Connected Vehicle Simulator
const DigitalKey = {
  currentBookingId: null,
  audioCtx: null,

  init() {
    this.modalBackdrop = document.getElementById('digital-key-modal');
    this.closeBtn = document.getElementById('close-digital-key-btn');
    this.bodyEl = document.getElementById('digital-key-body');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.close();
      });
    }
  },

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  // Sound Synthesizer via Web Audio API
  playSound(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'unlock') {
      // 2 sharp high chirps
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1400, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(2800, now + 0.2);
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.2);
    } else if (type === 'lock') {
      // 1 solid low-to-mid confirmation chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'horn') {
      // Dual-tone automotive horn
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      oscA.type = 'sawtooth';
      oscA.frequency.setValueAtTime(435, now); // F4
      oscB.type = 'sawtooth';
      oscB.frequency.setValueAtTime(510, now); // C5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0.2, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(ctx.destination);

      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + 0.35);
      oscB.stop(now + 0.35);
    } else if (type === 'engine') {
      // Engine roar / electric motor spool
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.8);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    }
  },

  open(bookingId) {
    this.currentBookingId = bookingId;
    this.render();
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.add('active');
    }
  },

  close() {
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.remove('active');
    }
    this.currentBookingId = null;
  },

  render() {
    if (!this.bodyEl) return;
    const booking = Store.getBookingById(this.currentBookingId);
    if (!booking) {
      this.bodyEl.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Booking details not found.</p>`;
      return;
    }

    const tel = booking.telemetry || {
      batteryPercent: 85,
      odometer: '14,200 mi',
      isLocked: true,
      isClimateOn: false,
      temperature: 70
    };

    const isLocked = tel.isLocked;
    const isClimateOn = tel.isClimateOn;

    this.bodyEl.innerHTML = `
      <div class="digital-key-dash">
        <div class="key-car-preview">
          <img src="${booking.carImage}" alt="${booking.carName}" />
          <div class="key-status-overlay">
            <div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">${booking.carName}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">Trip: #${booking.id} • ${booking.pickupLocation}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${isLocked ? 'badge-sports' : 'badge-active'}">
                ${isLocked ? '🔒 Secured & Locked' : '🔓 Unlocked & Ready'}
              </span>
            </div>
          </div>
        </div>

        <div class="telemetry-row">
          <div class="telemetry-item">
            <div class="value" style="color: var(--accent-cyan);">⚡ ${tel.batteryPercent}%</div>
            <div class="label">State of Charge</div>
          </div>
          <div class="telemetry-item">
            <div class="value" style="color: #fff;">${tel.odometer}</div>
            <div class="label">Odometer</div>
          </div>
          <div class="telemetry-item">
            <div class="value" style="color: ${isClimateOn ? 'var(--accent-emerald)' : 'var(--text-secondary)'};">
              ${isClimateOn ? `${tel.temperature}°F (Running)` : 'Off'}
            </div>
            <div class="label">Climate Control</div>
          </div>
        </div>

        <div class="key-buttons-grid">
          <button class="key-remote-btn ${!isLocked ? 'active' : ''}" onclick="DigitalKey.toggleDoor()">
            <div class="key-remote-icon">${isLocked ? '🔓' : '🔒'}</div>
            <div class="key-remote-label">${isLocked ? 'Unlock Vehicle' : 'Lock Vehicle'}</div>
            <div class="key-remote-sub">${isLocked ? 'Tap to release door latches' : 'Tap to secure car'}</div>
          </button>

          <button class="key-remote-btn ${isClimateOn ? 'active' : ''}" onclick="DigitalKey.toggleClimate()">
            <div class="key-remote-icon">❄️</div>
            <div class="key-remote-label">${isClimateOn ? 'Stop Climate' : 'Start Pre-Cool AC'}</div>
            <div class="key-remote-sub">${isClimateOn ? 'Cabin set to 70°F' : 'Pre-cool cabin remotely'}</div>
          </button>

          <button class="key-remote-btn" onclick="DigitalKey.flashAndHorn()">
            <div class="key-remote-icon">🔊</div>
            <div class="key-remote-label">Honk & Flash</div>
            <div class="key-remote-sub">Locate car in parking lot</div>
          </button>

          <button class="key-remote-btn" onclick="DigitalKey.remoteStart()">
            <div class="key-remote-icon">⚡</div>
            <div class="key-remote-label">Remote Start</div>
            <div class="key-remote-sub">Start drivetrain system</div>
          </button>
        </div>

        <div style="background: rgba(255, 255, 255, 0.04); border-radius: var(--radius-md); padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></span>
            <span>Ultra-Wideband Digital Key Connected (Bluetooth / Cloud)</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Range: 50 ft</span>
        </div>
      </div>
    `;
  },

  toggleDoor() {
    const booking = Store.getBookingById(this.currentBookingId);
    if (!booking) return;

    const currentLock = booking.telemetry?.isLocked ?? true;
    const newLock = !currentLock;

    this.playSound(newLock ? 'lock' : 'unlock');
    Store.updateBookingTelemetry(this.currentBookingId, { isLocked: newLock });
    this.render();

    App.showToast(newLock ? 'Vehicle Locked & Armed 🔒' : 'Vehicle Unlocked! Welcome aboard 🔓', newLock ? 'info' : 'success');
  },

  toggleClimate() {
    const booking = Store.getBookingById(this.currentBookingId);
    if (!booking) return;

    const currentAc = booking.telemetry?.isClimateOn ?? false;
    const newAc = !currentAc;

    this.playSound('engine');
    Store.updateBookingTelemetry(this.currentBookingId, { isClimateOn: newAc });
    this.render();

    App.showToast(newAc ? 'Remote Climate Activated (70°F) ❄️' : 'Climate system stopped', 'info');
  },

  flashAndHorn() {
    this.playSound('horn');
    App.showToast('Honking horn & flashing LED headlights 🔊✨', 'warning');
  },

  remoteStart() {
    this.playSound('engine');
    App.showToast('Drivetrain primed & ready to drive! 🏁', 'success');
  }
};
