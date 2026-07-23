import { useEffect, useMemo } from 'react';
import { useJourneyStore } from './store/journeyStore';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { PackageCard } from './components/PackageCard';
import { OverviewMapRenderer, pinColorForState } from './components/OverviewMapRenderer';
import { JourneyMapContainer } from './components/JourneyMapContainer';
import { StreetViewModal } from './components/StreetViewModal';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { MediaGallery } from './components/MediaGallery';
import { Testimonials } from './components/Testimonials';
import { Footer } from './components/Footer';

function App() {
  const {
    packages,
    selectedPackageSlug,
    selectPackage,
    viewMode,
    setViewMode,
    searchQuery,
    selectedState,
    selectedSeason,
    selectedDifficulty,
    selectedCategory,
  } = useJourneyStore();

  // Initialize with default package on mount
  useEffect(() => {
    selectPackage(selectedPackageSlug);
  }, [selectPackage, selectedPackageSlug]);

  // Filter packages based on active search & dropdown filters
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = pkg.title.toLowerCase().includes(query);
        const matchesState = pkg.state.toLowerCase().includes(query);
        const matchesDesc = pkg.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesState && !matchesDesc) return false;
      }

      // State filter
      if (selectedState !== 'All' && pkg.state !== selectedState) return false;

      // Season filter
      if (selectedSeason !== 'All' && pkg.season !== selectedSeason) return false;

      // Difficulty filter
      if (selectedDifficulty !== 'All' && pkg.difficulty !== selectedDifficulty) return false;

      // Category filter
      if (selectedCategory !== 'All' && pkg.category !== selectedCategory) return false;

      return true;
    });
  }, [
    packages,
    searchQuery,
    selectedState,
    selectedSeason,
    selectedDifficulty,
    selectedCategory,
  ]);

  return (
    <div className="ew-app">
      {/* Global Navbar */}
      <Navbar />

      {/* Main Content Layout */}
      {viewMode === 'overview' ? (
        <div className="ew-homepage">
          {/* Map Hero — full-bleed interactive India map with exact trek location pins */}
          <section className="ew-map-hero">
            <OverviewMapRenderer filteredPackages={filteredPackages} />

            <div className="ew-map-hero-copy">
              <h1 className="ew-hero-title">Explore the Himalayas in Interactive 3D</h1>
              <p className="ew-hero-subtitle">
                Every pin marks a real trek at its exact starting point — click one to fly into its 3D satellite journey.
              </p>

              <div className="ew-hero-stats">
                <span className="ew-hero-chip ew-hero-chip-count">
                  {filteredPackages.length} Treks Mapped
                </span>
                {[...new Set(filteredPackages.map((p) => p.state))].map((state) => (
                  <span key={state} className="ew-hero-chip">
                    <span
                      className="ew-legend-dot"
                      style={{ background: pinColorForState(state) }}
                    />
                    {state}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Filter Bar & Trek Catalog Grid */}
          <section id="treks" className="ew-catalog-section">
            <div className="ew-section-header">
              <h2 className="ew-section-title">🏔️ Himalayan Trek & Tour Packages</h2>
              <span className="ew-section-badge">{filteredPackages.length} results</span>
            </div>

            <FilterBar />

            {filteredPackages.length === 0 ? (
              <div className="ew-no-results">
                <div className="ew-no-results-icon">🔍</div>
                <h3>No treks found matching your filters</h3>
                <p>Try adjusting your search criteria or resetting filters.</p>
              </div>
            ) : (
              <div className="ew-grid">
                {filteredPackages.map((pkg) => (
                  <PackageCard key={pkg.id} packageData={pkg} />
                ))}
              </div>
            )}
          </section>

          {/* Stock Media & Tour Showcase Gallery */}
          <MediaGallery />

          {/* Hiker Reviews & Testimonials Section */}
          <Testimonials />

          {/* Professional Footer */}
          <Footer />
        </div>
      ) : (
        /* Focused 3D Journey Experience Mode */
        <div className="ew-focused-view">
          <button className="ew-back-to-map-btn" onClick={() => setViewMode('overview')}>
            ← Back to Map & Catalog
          </button>
          <JourneyMapContainer />
        </div>
      )}

      {/* 360° Street View Modal */}
      <StreetViewModal />

      {/* Global Constant WhatsApp Support Button */}
      <WhatsAppWidget />
    </div>
  );
}

export default App;
