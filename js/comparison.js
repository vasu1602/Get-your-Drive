// Vehicle Comparison Engine
const Comparison = {
  init() {
    this.dockEl = document.getElementById('compare-dock');
    this.thumbsEl = document.getElementById('compare-dock-thumbs');
    this.btnEl = document.getElementById('compare-dock-btn');
    this.countEl = document.getElementById('compare-dock-count');
    this.modalBackdrop = document.getElementById('comparison-modal');
    this.modalContent = document.getElementById('comparison-matrix-body');
    this.closeBtn = document.getElementById('close-comparison-modal-btn');

    this.bindEvents();
    this.renderDock();
  },

  bindEvents() {
    if (this.btnEl) {
      this.btnEl.addEventListener('click', () => this.openModal());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.closeModal();
      });
    }

    Store.subscribe(() => {
      this.renderDock();
    });
  },

  toggle(carId) {
    const isPresent = Store.state.comparison.includes(carId);
    if (isPresent) {
      Store.removeFromComparison(carId);
      App.showToast('Vehicle removed from comparison', 'info');
    } else {
      const res = Store.addToComparison(carId);
      if (res.success) {
        App.showToast('Vehicle added to comparison (Up to 3)', 'success');
      } else {
        App.showToast(res.reason, 'warning');
      }
    }
  },

  renderDock() {
    const list = Store.state.comparison;
    if (!this.dockEl || !this.thumbsEl) return;

    if (list.length === 0) {
      this.dockEl.classList.remove('visible');
      return;
    }

    this.dockEl.classList.add('visible');
    if (this.countEl) {
      this.countEl.textContent = list.length;
    }

    this.thumbsEl.innerHTML = list.map(carId => {
      const car = Store.getCarById(carId);
      if (!car) return '';
      return `
        <div class="compare-thumb-slot" title="${car.name}">
          <img src="${car.image}" alt="${car.name}" />
          <div class="remove-slot" onclick="Comparison.toggle('${car.id}')" title="Remove">✕</div>
        </div>
      `;
    }).join('');
  },

  openModal() {
    const list = Store.state.comparison;
    if (list.length === 0) {
      App.showToast('Please select at least 1 car to compare', 'info');
      return;
    }

    const cars = list.map(id => Store.getCarById(id)).filter(Boolean);
    this.renderMatrix(cars);
    this.modalBackdrop.classList.add('active');
  },

  closeModal() {
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.remove('active');
    }
  },

  renderMatrix(cars) {
    if (!this.modalContent) return;

    // Find best metrics
    const lowestPrice = Math.min(...cars.map(c => c.dailyRate));
    const highestHp = Math.max(...cars.map(c => c.horsepower));

    let html = `
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th style="min-width: 140px;">Specification</th>
              ${cars.map(c => `
                <th style="min-width: 200px; text-align: center;">
                  <img src="${c.image}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;" alt="${c.name}"/>
                  <div style="font-size: 1.05rem; font-weight: 700; color: #fff;">${c.name}</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.brand} • ${c.year}</div>
                  <div style="margin-top: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="Comparison.closeModal(); BookingFlow.start('${c.id}')">Rent Now</button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Daily Rate</strong></td>
              ${cars.map(c => `
                <td style="text-align: center;">
                  <span class="${c.dailyRate === lowestPrice ? 'metric-win' : ''}">
                    $${c.dailyRate} / day ${c.dailyRate === lowestPrice ? '★ Best Value' : ''}
                  </span>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td><strong>Horsepower</strong></td>
              ${cars.map(c => `
                <td style="text-align: center;">
                  <span class="${c.horsepower === highestHp ? 'metric-win' : ''}">
                    ${c.horsepower} HP ${c.horsepower === highestHp ? '★ Top Power' : ''}
                  </span>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td><strong>0-60 mph Acceleration</strong></td>
              ${cars.map(c => `<td style="text-align: center; font-weight: 600;">${c.acceleration}</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Top Speed</strong></td>
              ${cars.map(c => `<td style="text-align: center;">${c.topSpeed}</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Powertrain / Fuel</strong></td>
              ${cars.map(c => `<td style="text-align: center;"><span class="badge badge-${c.category}">${c.fuel}</span></td>`).join('')}
            </tr>
            <tr>
              <td><strong>Transmission</strong></td>
              ${cars.map(c => `<td style="text-align: center;">${c.transmission}</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Seating Capacity</strong></td>
              ${cars.map(c => `<td style="text-align: center;">${c.seats} Passengers</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Luggage Capacity</strong></td>
              ${cars.map(c => `<td style="text-align: center;">${c.luggage}</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Fuel Economy / Range</strong></td>
              ${cars.map(c => `<td style="text-align: center; color: var(--accent-cyan); font-weight: 600;">${c.range}</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Rating & Reviews</strong></td>
              ${cars.map(c => `<td style="text-align: center;">⭐ ${c.rating} (${c.reviewsCount} reviews)</td>`).join('')}
            </tr>
            <tr>
              <td><strong>Key Features</strong></td>
              ${cars.map(c => `
                <td style="vertical-align: top;">
                  <ul style="list-style: none; padding: 0; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.25rem;">
                    ${c.features.map(f => `<li>✓ ${f}</li>`).join('')}
                  </ul>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    this.modalContent.innerHTML = html;
  }
};
