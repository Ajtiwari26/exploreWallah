/**
 * ExploreWallah - PackageCard Component
 * 
 * Renders individual Himalayan Trek & Tour cards following Liquid Glass UI design.
 */

import React from 'react';
import type { RouteData } from '../types';
import { useJourneyStore } from '../store/journeyStore';

interface PackageCardProps {
  packageData: Omit<RouteData, 'route_geometry'>;
}

export const PackageCard: React.FC<PackageCardProps> = ({ packageData }) => {
  const { selectPackage, selectedPackageSlug } = useJourneyStore();

  const isSelected = packageData.slug === selectedPackageSlug;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'ew-diff-easy';
      case 'Moderate':
        return 'ew-diff-mod';
      case 'Difficult':
      case 'Challenging':
        return 'ew-diff-hard';
      default:
        return 'ew-diff-mod';
    }
  };

  return (
    <div
      className={`ew-card ${isSelected ? 'selected' : ''}`}
      onClick={() => selectPackage(packageData.slug)}
    >
      <div className="ew-card-header">
        <span className="ew-card-icon">{packageData.thumbnail}</span>
        <div className="ew-card-badges">
          <span className={`ew-card-badge ${getDifficultyColor(packageData.difficulty)}`}>
            {packageData.difficulty}
          </span>
          <span className="ew-card-badge ew-badge-season">{packageData.season}</span>
        </div>
      </div>

      <div className="ew-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <span className="ew-card-state">📍 {packageData.state}</span>
          <span className="ew-card-category-tag">{packageData.category}</span>
        </div>
        <h3 className="ew-card-title">{packageData.title}</h3>
        <p className="ew-card-desc">{packageData.description}</p>

        {/* Waypoints Preview Chips */}
        {packageData.waypoints && packageData.waypoints.length > 0 && (
          <div className="ew-card-waypoints-preview">
            <span className="ew-wp-preview-label">Route Waypoints:</span>
            <div className="ew-wp-preview-chips">
              {packageData.waypoints.slice(0, 3).map((wp, idx) => (
                <span key={wp.id} className="ew-wp-chip">
                  {idx + 1}. {wp.name.split(' ')[0]}
                </span>
              ))}
              {packageData.waypoints.length > 3 && (
                <span className="ew-wp-chip more">+{packageData.waypoints.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ew-card-footer">
        <div className="ew-card-meta">
          <span className="ew-card-duration">⏳ {packageData.duration}</span>
          <span className="ew-card-price">{packageData.price}</span>
        </div>

        <button
          className="ew-card-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            selectPackage(packageData.slug);
          }}
        >
          <span className="ew-action-icon">🚀</span> Launch 3D Tour
        </button>
      </div>
    </div>
  );
};
