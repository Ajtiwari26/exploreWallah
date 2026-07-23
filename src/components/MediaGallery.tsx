/**
 * ExploreWallah - Tour & Stock Media Gallery Component
 * 
 * High-definition showcase of Himalayan trek photography, summit vistas,
 * alpine lakes, and 360° tour highlights.
 */

import React, { useState } from 'react';

interface MediaItem {
  id: number;
  title: string;
  location: string;
  category: 'Winter Snow' | 'Alpine Lakes' | 'Floral Meadows' | 'High Pass';
  imageUrl: string;
  trekSlug: string;
  elevation: string;
}

const MEDIA_ITEMS: MediaItem[] = [
  {
    id: 1,
    title: 'Kedarkantha Summit Ridge',
    location: 'Govind Pashu Vihar, Uttarakhand',
    category: 'Winter Snow',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'kedarkantha-winter-summit',
    elevation: '3,800m',
  },
  {
    id: 2,
    title: 'Chandratal Crescent Moon Lake',
    location: 'Spiti Valley, Himachal Pradesh',
    category: 'Alpine Lakes',
    imageUrl: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'hampta-pass-crossover',
    elevation: '4,300m',
  },
  {
    id: 3,
    title: 'Valley of Flowers Bloom Horizon',
    location: 'Chamoli, Uttarakhand',
    category: 'Floral Meadows',
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'valley-of-flowers-hemkund',
    elevation: '3,600m',
  },
  {
    id: 4,
    title: 'Frozen Zanskar Gorge (Chadar)',
    location: 'Leh, Ladakh',
    category: 'Winter Snow',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'chadar-frozen-zanskar-river',
    elevation: '3,390m',
  },
  {
    id: 5,
    title: 'Pin Bhaba Cold Desert Crossover',
    location: 'Kinnaur to Spiti, Himachal',
    category: 'High Pass',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'pin-bhaba-pass-crossover',
    elevation: '4,865m',
  },
  {
    id: 6,
    title: 'Vishansar Kashmiri Alpine Lake',
    location: 'Sonamarg, Jammu & Kashmir',
    category: 'Alpine Lakes',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80',
    trekSlug: 'kashmir-great-lakes',
    elevation: '3,710m',
  },
];

export const MediaGallery: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  const categories = ['All', 'Winter Snow', 'Alpine Lakes', 'Floral Meadows', 'High Pass'];

  const filteredMedia = selectedCategory === 'All'
    ? MEDIA_ITEMS
    : MEDIA_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <section id="gallery" className="ew-media-section">
      <div className="ew-section-header-center">
        <span className="ew-section-kicker">📸 EXPEDITION MEDIA SHOWCASE</span>
        <h2 className="ew-section-title-large">Himalayan Tour Vistas & 3D Highlights</h2>
        <p className="ew-section-subtitle">
          Explore real high-definition photography and 3D terrain captures from our Himalayan trek expeditions.
        </p>

        {/* Category Pills */}
        <div className="ew-gallery-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`ew-gallery-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="ew-media-grid">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            className="ew-media-card"
            onClick={() => setActiveMedia(item)}
          >
            <img src={item.imageUrl} alt={item.title} className="ew-media-img" loading="lazy" />
            <div className="ew-media-overlay">
              <span className="ew-media-tag">{item.category}</span>
              <span className="ew-media-elev">⛰️ {item.elevation}</span>
              <h3 className="ew-media-title">{item.title}</h3>
              <span className="ew-media-loc">📍 {item.location}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeMedia && (
        <div className="ew-lightbox-overlay" onClick={() => setActiveMedia(null)}>
          <div className="ew-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ew-lightbox-close" onClick={() => setActiveMedia(null)}>✕</button>
            <img src={activeMedia.imageUrl} alt={activeMedia.title} className="ew-lightbox-img" />
            <div className="ew-lightbox-details">
              <span className="ew-media-tag">{activeMedia.category}</span>
              <h3>{activeMedia.title}</h3>
              <p>📍 {activeMedia.location} • Summit Elevation: {activeMedia.elevation}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
