// Fleet Host & Admin Portal
const AdminPortal = {
  init() {
    this.modalBackdrop = document.getElementById('admin-modal');
    this.modalBody = document.getElementById('admin-modal-body');
    this.closeBtn = document.getElementById('close-admin-modal-btn');
    this.adminNavBtn = document.getElementById('admin-nav-btn');

    if (this.adminNavBtn) {
      this.adminNavBtn.addEventListener('click', () => this.open());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.modalBackdrop) this.close();
      });
    }

    Store.subscribe(() => {
      if (this.modalBackdrop && this.modalBackdrop.classList.contains('active')) {
        this.render();
      }
    });
  },

  open() {
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

  render() {
    if (!this.modalBody) return;

    const stats = Store.getStats();
    const fleet = Store.getFleet();

    this.modalBody.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">Fleet & Host Command Center</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Manage vehicle inventory, live pricing, and track rental earnings.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="AdminPortal.resetFleet()">
            🔄 Reset to Default Fleet
          </button>
        </div>

        <!-- KPI Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem;">
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Total Earnings</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--accent-emerald); margin-top: 0.2rem;">$${stats.totalRevenue.toLocaleString()}</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Active Rentals</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary-light); margin-top: 0.2rem;">${stats.activeTrips}</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Fleet Vehicles</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-top: 0.2rem;">${stats.fleetCount}</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Avg Rating</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24; margin-top: 0.2rem;">⭐ ${stats.avgRating}</div>
          </div>
        </div>

        <!-- Add New Vehicle Section -->
        <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; color: #fff;">+ Add New Vehicle to Fleet</h3>
          <form id="add-car-form" onsubmit="event.preventDefault(); AdminPortal.handleAddCar();">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Brand & Model Name</label>
                <input type="text" id="new-car-name" class="form-control" placeholder="e.g. Lucid Air Sapphire" required />
              </div>
              <div class="form-group">
                <label class="form-label">Manufacturer Brand</label>
                <input type="text" id="new-car-brand" class="form-control" placeholder="e.g. Lucid" required />
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="new-car-cat" class="form-control">
                  <option value="electric">Electric EV</option>
                  <option value="luxury">Luxury Sedan</option>
                  <option value="sports">Sports / Performance</option>
                  <option value="suv">SUV</option>
                  <option value="economy">Economy</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Daily Rental Rate ($)</label>
                <input type="number" id="new-car-price" class="form-control" placeholder="e.g. 219" min="30" max="2000" required />
              </div>
              <div class="form-group">
                <label class="form-label">Horsepower (HP)</label>
                <input type="number" id="new-car-hp" class="form-control" placeholder="e.g. 1234" required />
              </div>
              <div class="form-group">
                <label class="form-label">0-60 mph Acceleration</label>
                <input type="text" id="new-car-accel" class="form-control" placeholder="e.g. 1.89s" required />
              </div>
              <div class="form-group">
                <label class="form-label">Fuel / Powertrain</label>
                <select id="new-car-fuel" class="form-control">
                  <option value="Electric">Electric</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Transmission</label>
                <select id="new-car-trans" class="form-control">
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Seats</label>
                <input type="number" id="new-car-seats" class="form-control" value="5" min="2" max="9" required />
              </div>
              <div class="form-group" style="grid-column: span 3;">
                <label class="form-label">Image URL (Direct High-Res Link)</label>
                <input type="url" id="new-car-img" class="form-control" placeholder="https://images.unsplash.com/photo-..." required value="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80" />
              </div>
            </div>
            <div style="text-align: right; margin-top: 1rem;">
              <button type="submit" class="btn btn-primary">
                + Publish Car to Catalog
              </button>
            </div>
          </form>
        </div>

        <!-- Fleet Inventory Table -->
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; color: #fff;">Current Fleet Inventory (${fleet.length})</h3>
        <div style="overflow-x: auto; background: rgba(8, 11, 17, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md);">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-secondary);">
                <th style="padding: 0.75rem 1rem;">Vehicle</th>
                <th style="padding: 0.75rem 1rem;">Category</th>
                <th style="padding: 0.75rem 1rem;">Daily Rate</th>
                <th style="padding: 0.75rem 1rem;">Status</th>
                <th style="padding: 0.75rem 1rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${fleet.map(car => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <td style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${car.image}" style="width: 48px; height: 34px; object-fit: cover; border-radius: 4px;" alt="${car.name}"/>
                    <div>
                      <div style="font-weight: 700; color: #fff;">${car.name}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${car.horsepower} HP • ${car.transmission}</div>
                    </div>
                  </td>
                  <td style="padding: 0.75rem 1rem;">
                    <span class="badge badge-${car.category}">${car.category}</span>
                  </td>
                  <td style="padding: 0.75rem 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                      <span>$</span>
                      <input type="number" value="${car.dailyRate}" style="width: 70px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.2rem 0.4rem; border-radius: 4px;" onchange="AdminPortal.updateRate('${car.id}', this.value)" />
                      <span style="font-size: 0.8rem; color: var(--text-muted);">/day</span>
                    </div>
                  </td>
                  <td style="padding: 0.75rem 1rem;">
                    <button class="btn btn-sm ${car.isAvailable ? 'btn-outline' : 'btn-secondary'}" onclick="AdminPortal.toggleAvailability('${car.id}')">
                      ${car.isAvailable ? '🟢 Available' : '🔴 In Maintenance'}
                    </button>
                  </td>
                  <td style="padding: 0.75rem 1rem; text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="AdminPortal.deleteCar('${car.id}')" title="Delete vehicle">
                      🗑️
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleAddCar() {
    const name = document.getElementById('new-car-name')?.value;
    const brand = document.getElementById('new-car-brand')?.value;
    const category = document.getElementById('new-car-cat')?.value;
    const dailyRate = parseFloat(document.getElementById('new-car-price')?.value) || 199;
    const horsepower = parseInt(document.getElementById('new-car-hp')?.value) || 450;
    const acceleration = document.getElementById('new-car-accel')?.value || '3.5s (0-60)';
    const fuel = document.getElementById('new-car-fuel')?.value;
    const transmission = document.getElementById('new-car-trans')?.value;
    const seats = parseInt(document.getElementById('new-car-seats')?.value) || 5;
    const image = document.getElementById('new-car-img')?.value;

    const newCar = Store.addCar({
      name,
      brand,
      category,
      year: new Date().getFullYear(),
      dailyRate,
      horsepower,
      acceleration,
      topSpeed: '160 mph',
      range: fuel === 'Electric' ? '310 mi' : '24 MPG',
      fuel,
      transmission,
      seats,
      doors: 4,
      luggage: '3 Large Bags',
      image,
      badge: 'New Addition',
      location: LOCATIONS[0],
      features: ['Full Digital Cockpit', 'Keyless Remote Entry', 'Premium Surround Audio', 'Adaptive Cruise']
    });

    App.showToast(`Vehicle ${newCar.name} added to fleet!`, 'success');
    this.render();
  },

  updateRate(id, newRate) {
    const rate = parseFloat(newRate);
    if (!isNaN(rate) && rate > 0) {
      Store.updateCar(id, { dailyRate: rate });
      App.showToast('Vehicle daily rate updated', 'success');
    }
  },

  toggleAvailability(id) {
    const car = Store.getCarById(id);
    if (car) {
      Store.updateCar(id, { isAvailable: !car.isAvailable });
      App.showToast(`Car status changed to ${!car.isAvailable ? 'Available' : 'Maintenance'}`, 'info');
    }
  },

  deleteCar(id) {
    if (confirm('Are you sure you want to remove this vehicle from the fleet?')) {
      Store.deleteCar(id);
      App.showToast('Vehicle removed from fleet', 'info');
    }
  },

  resetFleet() {
    if (confirm('Reset entire fleet back to original factory presets?')) {
      Store.resetFleetToDefaults();
      App.showToast('Fleet inventory reset to defaults', 'success');
    }
  }
};
