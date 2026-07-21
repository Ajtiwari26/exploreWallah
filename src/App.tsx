/**
 * ExploreWallah - Main Application Entry
 */

import { useEffect } from 'react';
import { JourneyMapContainer } from './components/JourneyMapContainer';
import { StreetViewModal } from './components/StreetViewModal';
import { useJourneyStore } from './store/journeyStore';

function App() {
  const selectPackage = useJourneyStore((s) => s.selectPackage);
  const selectedPackageSlug = useJourneyStore((s) => s.selectedPackageSlug);

  // Initialize with default package on mount
  useEffect(() => {
    selectPackage(selectedPackageSlug);
  }, []);

  return (
    <>
      <JourneyMapContainer />
      <StreetViewModal />
    </>
  );
}

export default App;
