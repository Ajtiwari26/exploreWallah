/**
 * ExploreWallah - FilterBar Component
 * 
 * Multi-attribute filtering system allowing users to filter Himalayan packages by:
 * - State (Uttarakhand, Himachal Pradesh, Jammu & Kashmir, Sikkim, West Bengal, Ladakh)
 * - Season (Winter, Spring, Summer, Monsoon, Autumn)
 * - Difficulty Level (Easy, Moderate, Difficult)
 * - Category (Treks, High-Pass Expeditions, Regional Tours, Floral Meadows, Sacred Lakes)
 */

import React from 'react';
import { useJourneyStore } from '../store/journeyStore';

const STATES = [
  'All',
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Sikkim',
  'West Bengal',
  'Ladakh',
];

const SEASONS = ['All', 'Winter', 'Spring', 'Summer', 'Monsoon', 'Autumn'];

const DIFFICULTIES = ['All', 'Easy', 'Moderate', 'Difficult'];

const CATEGORIES = [
  'All',
  'Treks',
  'High-Pass Expeditions',
  'Regional Tours',
  'Floral Meadows',
  'Sacred Lakes',
];

export const FilterBar: React.FC = () => {
  const {
    selectedState,
    setSelectedState,
    selectedSeason,
    setSelectedSeason,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedCategory,
    setSelectedCategory,
    resetFilters,
  } = useJourneyStore();

  const isFiltered =
    selectedState !== 'All' ||
    selectedSeason !== 'All' ||
    selectedDifficulty !== 'All' ||
    selectedCategory !== 'All';

  return (
    <div className="ew-filter-bar">
      <div className="ew-filter-row">
        {/* Category Pills */}
        <div className="ew-filter-group">
          <span className="ew-filter-label">Category:</span>
          <div className="ew-filter-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`ew-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <button className="ew-reset-btn" onClick={resetFilters} title="Reset all filters">
            🔄 Reset Filters
          </button>
        )}
      </div>

      <div className="ew-filter-secondary-row">
        {/* State Dropdown Filter */}
        <div className="ew-dropdown-filter">
          <span className="ew-dropdown-label">📍 State:</span>
          <select
            className="ew-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {STATES.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All States' : st}
              </option>
            ))}
          </select>
        </div>

        {/* Season Dropdown Filter */}
        <div className="ew-dropdown-filter">
          <span className="ew-dropdown-label">🌤️ Season:</span>
          <select
            className="ew-select"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            {SEASONS.map((sn) => (
              <option key={sn} value={sn}>
                {sn === 'All' ? 'All Seasons' : sn}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Dropdown Filter */}
        <div className="ew-dropdown-filter">
          <span className="ew-dropdown-label">⚡ Difficulty:</span>
          <select
            className="ew-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            {DIFFICULTIES.map((df) => (
              <option key={df} value={df}>
                {df === 'All' ? 'All Difficulties' : df}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
