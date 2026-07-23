/**
 * ExploreWallah - Testimonials & Hiker Reviews Component
 * 
 * Verified reviews, 5-star ratings, hiker avatars, and social proof metrics.
 */

import React from 'react';

interface Review {
  id: number;
  name: string;
  avatar: string;
  location: string;
  trekName: string;
  rating: number;
  date: string;
  quote: string;
  verified: boolean;
}

const REVIEWS: Review[] = [
  {
    id: 1,
    name: 'Ananya Sharma',
    avatar: '👩🏻‍🦱',
    location: 'Mumbai, Maharashtra',
    trekName: 'Kedarkantha Winter Summit',
    rating: 5,
    date: 'Dec 2025',
    quote:
      'The 3D interactive map feature allowed me to preview every waypoint before setting foot on the trail! Reaching the 3,800m summit was a seamless, breathtaking experience.',
    verified: true,
  },
  {
    id: 2,
    name: 'Rohan Mehta',
    avatar: '👨🏽‍🦱',
    location: 'Bengaluru, Karnataka',
    trekName: 'Hampta Pass & Chandratal',
    rating: 5,
    date: 'Jan 2026',
    quote:
      'The contrast transition from Kullu Valley’s pine forests to Spiti’s cold desert in 3D terrain mode was mind-blowing! ExploreWallah is hands down India’s best 3D trek guide.',
    verified: true,
  },
  {
    id: 3,
    name: 'Priya Nair',
    avatar: '👩🏻',
    location: 'Kochi, Kerala',
    trekName: 'Kashmir Great Lakes',
    rating: 5,
    date: 'Feb 2026',
    quote:
      'I explored all 7 alpine trout lakes on the interactive 3D map prior to booking. The elevation profiles and waypoint node snapping are 100% accurate!',
    verified: true,
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section id="reviews" className="ew-reviews-section">
      <div className="ew-section-header-center">
        <span className="ew-section-kicker">⭐️ VERIFIED HIKER REVIEWS</span>
        <h2 className="ew-section-title-large">Trusted by 1,250+ Himalayan Trekkers</h2>
        <p className="ew-section-subtitle">
          See what outdoor enthusiasts and high-altitude trekkers say about exploring Himalayan routes in 3D.
        </p>

        {/* Global Rating Badge */}
        <div className="ew-rating-summary">
          <span className="ew-rating-score">4.9 ★★★★★</span>
          <span className="ew-rating-text">Average Hiker Satisfaction Rating</span>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="ew-reviews-grid">
        {REVIEWS.map((review) => (
          <div key={review.id} className="ew-review-card">
            <div className="ew-review-header">
              <span className="ew-review-avatar">{review.avatar}</span>
              <div className="ew-review-user">
                <h3 className="ew-review-name">
                  {review.name} {review.verified && <span className="ew-verified-badge">✓ Verified Hiker</span>}
                </h3>
                <span className="ew-review-loc">{review.location}</span>
              </div>
            </div>

            <div className="ew-review-stars">
              {'★'.repeat(review.rating)}
            </div>

            <span className="ew-review-trek">🏔️ {review.trekName}</span>

            <p className="ew-review-quote">"{review.quote}"</p>

            <span className="ew-review-date">{review.date}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
