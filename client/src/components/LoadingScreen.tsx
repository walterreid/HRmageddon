import { useState, useEffect } from 'react';
import { initializeMapRegistry } from '../game/map/registry';
import { mapRegistry } from '../game/map/MapRegistry';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  minDisplayTime?: number; // Minimum time to show loading screen (ms)
}

export function LoadingScreen({ onLoadingComplete, minDisplayTime = 2000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Initialize the MapRegistry with all available maps
    initializeMapRegistry();
    
    // CRITICAL: Pre-populate starting positions from tilemap JSON
    // This eliminates the race condition between LoadingScreen and GameScene
    preloadStartingPositions();
    
    console.log('LoadingScreen: MapRegistry initialized with starting positions');

    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5; // Random progress increments
      });
    }, 100);

    // Ensure minimum display time
    const timer = setTimeout(() => {
      if (progress >= 100) {
        setIsComplete(true);
        setIsFadingOut(true);
        setTimeout(() => {
          onLoadingComplete();
        }, 500); // Small delay for fade out animation
      }
    }, minDisplayTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [progress, minDisplayTime, onLoadingComplete]);

  useEffect(() => {
    if (progress >= 100 && !isComplete) {
      setIsComplete(true);
      setIsFadingOut(true);
      setTimeout(() => {
        onLoadingComplete();
      }, 500);
    }
  }, [progress, isComplete, onLoadingComplete]);

  // Function to pre-parse starting positions from tilemap JSON
  const preloadStartingPositions = async () => {
    try {
      // Fetch the tilemap JSON directly
      const response = await fetch('/assets/tilemaps/OfficeLayout16x12.json');
      const tilemapData = await response.json();
      
      // Parse starting positions from the "StartingPoints" layer
      const startingPointsLayer = tilemapData.layers.find((layer: any) => layer.name === 'StartingPoints');
      
      if (startingPointsLayer && startingPointsLayer.data) {
        const startingPositionsData: any[] = [];
        
        // Convert 1D array to 2D grid and find non-zero tiles
        for (let y = 0; y < startingPointsLayer.height; y++) {
          for (let x = 0; x < startingPointsLayer.width; x++) {
            const index = y * startingPointsLayer.width + x;
            const gid = startingPointsLayer.data[index];
            
            if (gid > 0) {
              startingPositionsData.push({ x, y, gid });
            }
          }
        }
        
        // Separate by team based on GID
        const goldTeamPositions = startingPositionsData.filter(pos => pos.gid === 595);
        const navyTeamPositions = startingPositionsData.filter(pos => pos.gid === 563);
        
        // Populate MapRegistry immediately
        mapRegistry.setStartingPositions('OfficeLayout', {
          goldTeam: goldTeamPositions,
          navyTeam: navyTeamPositions
        });
        
        console.log('LoadingScreen: Pre-populated starting positions:', {
          goldTeam: goldTeamPositions.length,
          navyTeam: navyTeamPositions.length,
          total: startingPositionsData.length
        });
      }
    } catch (error) {
      console.warn('LoadingScreen: Failed to preload starting positions:', error);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-slate-900 flex items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background with loading image */}
      <div className="relative w-full h-full">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-center bg-cover opacity-20"
          style={{ backgroundImage: 'url(/img/loading-01.jpg)' }}
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-slate-900/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          {/* ID Badge Container */}
          <div className="mb-8 transform scale-75 sm:scale-100 animate-slide-in">
            <div className="relative">
              {/* Lanyard */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-1 h-8 bg-blue-800 rounded-full shadow-lg" />
                <div className="w-3 h-3 bg-blue-700 rounded-full -mt-1 ml-[-4px] shadow-lg" />
              </div>
              
              {/* ID Badge */}
              <div className="bg-blue-800 rounded-xl p-1 shadow-2xl">
                <div className="bg-white rounded-lg p-4 w-64 h-32 flex items-center">
                  {/* Profile Placeholder */}
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-2 bg-gray-300 rounded w-16"></div>
                      <div className="h-2 bg-gray-300 rounded w-12"></div>
                    </div>
                  </div>
                  
                  {/* HRMAGEDDON Text */}
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold">
                      <span className="text-orange-500">HR</span>
                      <span className="text-orange-600">MAGEDDON</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-3xl font-bold text-white mb-6 tracking-wider animate-fade-in">
            LOADING
          </div>

          {/* Loading Bar */}
          <div className="w-80 bg-slate-700 rounded-full h-3 mb-8 overflow-hidden shadow-lg animate-fade-in">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out shadow-lg shimmer-effect"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="text-lg text-slate-300 font-mono animate-fade-in">
            {Math.round(progress)}%
          </div>

          {/* Loading Dots */}
          <div className="flex space-x-2 mt-6 animate-fade-in">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${progress > 25 ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${progress > 50 ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${progress > 75 ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
