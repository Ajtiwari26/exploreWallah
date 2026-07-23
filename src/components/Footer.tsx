/**
 * ExploreWallah - Professional Footer Component
 * 
 * Multi-column footer featuring transparent SVG logo, newsletter subscription,
 * category links, social media channels, and copyright disclaimers.
 */

import React, { useState } from 'react';
import logoSvg from '../assets/logo.svg';
import { useJourneyStore } from '../store/journeyStore';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const setViewMode = useJourneyStore((state) => state.setViewMode);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer id="footer" className="ew-footer">
      <div className="ew-footer-container">
        {/* Column 1: Brand Info */}
        <div className="ew-footer-col ew-footer-brand">
          <div className="ew-footer-logo" onClick={() => setViewMode('overview')}>
            <img src={logoSvg} alt="ExploreWallah Logo" className="ew-footer-logo-img" />
          </div>
          <p className="ew-footer-desc">
            India’s premier 3D Himalayan trek expedition portal. Explore high-altitude routes, photorealistic 3D satellite terrain, and 360° panoramas.
          </p>
          <div className="ew-social-links">
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="ew-social-btn wa" title="WhatsApp Support">💬</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="ew-social-btn" title="Instagram">📸</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="ew-social-btn" title="YouTube">🎥</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="ew-social-btn" title="Twitter">🐤</a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="ew-footer-col">
          <h4 className="ew-footer-heading">Quick Links</h4>
          <ul className="ew-footer-links">
            <li><a href="#treks">🏔️ All Himalayan Treks</a></li>
            <li><a href="#gallery">📸 Expedition Media Showcase</a></li>
            <li><a href="#reviews">⭐️ Hiker Reviews</a></li>
            <li><button className="ew-link-btn" onClick={() => setViewMode('focused-journey')}>🌍 3D Earth Experience</button></li>
          </ul>
        </div>

        {/* Column 3: Trek Categories */}
        <div className="ew-footer-col">
          <h4 className="ew-footer-heading">Trek Categories</h4>
          <ul className="ew-footer-links">
            <li><span>❄️ Winter Snow Summits</span></li>
            <li><span>🏔️ High-Pass Expeditions</span></li>
            <li><span>🌸 Floral Alpine Meadows</span></li>
            <li><span>🌊 Sacred Glacial Lakes</span></li>
          </ul>
        </div>

        {/* Column 4: Newsletter */}
        <div className="ew-footer-col ew-footer-newsletter">
          <h4 className="ew-footer-heading">Himalayan Trek Dispatch</h4>
          <p className="ew-newsletter-desc">Subscribe to receive seasonal trek updates, snow conditions, and 3D route guides.</p>

          {subscribed ? (
            <div className="ew-newsletter-success">
              ✓ Subscribed! Check your inbox for Himalayan trek guides.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="ew-newsletter-form">
              <input
                type="email"
                placeholder="Enter your email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ew-newsletter-input"
              />
              <button type="submit" className="ew-newsletter-btn">Join</button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="ew-footer-bottom">
        <p>© {new Date().getFullYear()} ExploreWallah. All rights reserved. Explored with 3D Photorealistic Engine.</p>
        <div className="ew-footer-bottom-links">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms of Service</span>
          <span>•</span>
          <span>Safety Guidelines</span>
        </div>
      </div>
    </footer>
  );
};
