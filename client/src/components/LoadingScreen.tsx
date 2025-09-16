import { useState, useEffect } from 'react';
import { initializeMapRegistry } from '../game/map/registry';
import { mapRegistry } from '../game/map/MapRegistry';
import { dataManager } from '../game/data/DataManager';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  minDisplayTime?: number; // Minimum time to show loading screen (ms)
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Initialize the MapRegistry with all available maps
        initializeMapRegistry();
        
        // CRITICAL: Pre-populate starting positions from tilemap JSON
        // This eliminates the race condition between LoadingScreen and GameScene
        await preloadStartingPositions();
        
        // Load all game data from JSON files
        await dataManager.loadAll();
        
        console.log('LoadingScreen: All data loaded successfully');
        
        // Mark as complete
        setIsComplete(true);
        setIsFadingOut(true);
        setTimeout(() => {
          onLoadingComplete();
        }, 500); // Small delay for fade out animation
      } catch (error) {
        console.error('LoadingScreen: Failed to load data:', error);
        // Still complete loading even if data fails to load
        setIsComplete(true);
        setIsFadingOut(true);
        setTimeout(() => {
          onLoadingComplete();
        }, 500);
      }
    };

    loadAllData();
  }, [onLoadingComplete]);


  // Function to pre-parse starting positions from tilemap JSON
  const preloadStartingPositions = async () => {
    try {
      // Fetch the tilemap JSON directly
      const response = await fetch('/assets/tilemaps/OfficeLayout16x12.json');
      const tilemapData = await response.json();
      
      // Parse starting positions from the "StartingPoints" layer
      const startingPointsLayer = tilemapData.layers.find((layer: { name: string; data?: number[]; width: number; height: number }) => layer.name === 'StartingPoints');
      
      if (startingPointsLayer && startingPointsLayer.data) {
        const startingPositionsData: { x: number; y: number; gid: number }[] = [];
        
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

      // Parse capture points from the "CapturePoints" layer
      const capturePointsLayer = tilemapData.layers.find((layer: { name: string; data?: number[]; width: number; height: number }) => layer.name === 'CapturePoints');
      
      if (capturePointsLayer && capturePointsLayer.data) {
        const capturePointsData: { x: number; y: number; gid: number }[] = [];
        
        // Convert 1D array to 2D grid and find non-zero tiles
        for (let y = 0; y < capturePointsLayer.height; y++) {
          for (let x = 0; x < capturePointsLayer.width; x++) {
            const index = y * capturePointsLayer.width + x;
            const gid = capturePointsLayer.data[index];
            
            if (gid > 0) {
              capturePointsData.push({ x, y, gid });
            }
          }
        }
        
        // Store capture points in MapRegistry for later use
        mapRegistry.setCapturePoints('OfficeLayout', capturePointsData);
        
        console.log('LoadingScreen: Pre-populated capture points:', {
          total: capturePointsData.length,
          positions: capturePointsData
        });
      }

      // Parse blocked tiles from the "Foreground" layer
      const foregroundLayer = tilemapData.layers.find((layer: { name: string; data?: number[]; width: number; height: number }) => layer.name === 'Foreground');
      
      if (foregroundLayer && foregroundLayer.data) {
        const blockedTilesData: { x: number; y: number; gid: number }[] = [];
        
        // Convert 1D array to 2D grid and find non-zero tiles (these are obstacles)
        for (let y = 0; y < foregroundLayer.height; y++) {
          for (let x = 0; x < foregroundLayer.width; x++) {
            const index = y * foregroundLayer.width + x;
            const gid = foregroundLayer.data[index];
            
            if (gid > 0) {
              blockedTilesData.push({ x, y, gid });
            }
          }
        }
        
        // Store blocked tiles in MapRegistry for movement validation
        mapRegistry.setBlockedTiles('OfficeLayout', blockedTilesData);
        
        console.log('LoadingScreen: Pre-populated blocked tiles:', {
          total: blockedTilesData.length,
          positions: blockedTilesData
        });
      }
    } catch (error) {
      console.warn('LoadingScreen: Failed to preload tilemap data:', error);
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
          <div className="mb-6 sm:mb-8 transform scale-50 sm:scale-75 lg:scale-100 animate-slide-in">
            <div className="relative">
              {/* Lanyard */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-1 h-8 bg-blue-800 rounded-full shadow-lg" />
                <div className="w-3 h-3 bg-blue-700 rounded-full -mt-1 ml-[-4px] shadow-lg" />
              </div>
              
              {/* ID Badge */}
              <div className="bg-blue-800 rounded-xl p-1 shadow-2xl">
                <div className="bg-white rounded-lg p-2 sm:p-4 w-48 sm:w-64 h-24 sm:h-32 flex items-center">
                  {/* Profile Placeholder */}
                  <div className="flex-shrink-0 mr-2 sm:mr-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="mt-1 sm:mt-2 space-y-1">
                      <div className="h-1.5 sm:h-2 bg-gray-300 rounded w-12 sm:w-16"></div>
                      <div className="h-1.5 sm:h-2 bg-gray-300 rounded w-8 sm:w-12"></div>
                    </div>
                  </div>
                  
                  {/* HRMAGEDDON Text */}
                  <div className="flex-1 text-center">
                    <div className="text-lg sm:text-2xl font-bold">
                      <span className="text-orange-500">HR</span>
                      <span className="text-orange-600">MAGEDDON</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 tracking-wider animate-fade-in px-4">
            LOADING
          </div>

          {/* Loading Bar */}
          <div className="w-64 sm:w-80 bg-slate-700 rounded-full h-2 sm:h-3 mb-6 sm:mb-8 overflow-hidden shadow-lg animate-fade-in mx-4">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out shadow-lg shimmer-effect"
              style={{ width: isComplete ? '100%' : '0%' }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="text-base sm:text-lg text-slate-300 font-mono animate-fade-in">
            {isComplete ? '100%' : 'Loading...'}
          </div>

          {/* Loading Dots */}
          <div className="flex space-x-2 mt-4 sm:mt-6 animate-fade-in">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-blue-400 animate-pulse-slow' : 'bg-slate-600'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
