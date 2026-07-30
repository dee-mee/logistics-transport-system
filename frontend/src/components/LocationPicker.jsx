import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function LocationPicker({ value, onChange, label, onCoordinatesChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Update local state when prop changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Geocode search using Nominatim (OpenStreetMap)
  const searchLocations = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      console.log('Search results for:', searchQuery, data);
      setSuggestions(data);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      // Round to 6 decimal places for API call
      const roundedLat = Math.round(lat * 1000000) / 1000000;
      const roundedLng = Math.round(lng * 1000000) / 1000000;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}`
      );
      const data = await response.json();
      return data.display_name || `${roundedLat.toFixed(6)}, ${roundedLng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const roundedLat = Math.round(lat * 1000000) / 1000000;
      const roundedLng = Math.round(lng * 1000000) / 1000000;
      return `${roundedLat.toFixed(6)}, ${roundedLng.toFixed(6)}`;
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setShowSuggestions(true);
    searchLocations(newValue);
    // Update parent form state immediately when typing
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchAddress();
    }
  };

  const handleInputBlur = () => {
    // Call onChange when user leaves the input field
    if (query && query.trim()) {
      onChange(query);
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = async (suggestion) => {
    console.log('=== Suggestion clicked ===');
    console.log('Suggestion data:', suggestion);
    const address = suggestion.display_name;
    console.log('Full address from suggestion:', address);
    setQuery(address);
    setShowSuggestions(false);
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    // Round to 6 decimal places to match backend validation
    const roundedLat = Math.round(lat * 1000000) / 1000000;
    const roundedLng = Math.round(lng * 1000000) / 1000000;
    setSelectedLocation({
      lat: roundedLat,
      lng: roundedLng,
      address: address
    });
    setMapCenter([roundedLat, roundedLng]);
    setMapZoom(13);
    console.log('About to call onChange with address:', address);
    onChange(address);
    console.log('onChange call completed');
    if (onCoordinatesChange) {
      console.log('Calling onCoordinatesChange with:', { lat: roundedLat, lng: roundedLng });
      onCoordinatesChange({ lat: roundedLat, lng: roundedLng });
    }
    setShowMap(true);
    console.log('=== Suggestion click completed ===');
  };

  const handleSearchAddress = async () => {
    if (!query || query.length < 3) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      if (data && data.length > 0) {
        const suggestion = data[0];
        const address = suggestion.display_name;
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;
        setSelectedLocation({
          lat: roundedLat,
          lng: roundedLng,
          address: address
        });
        setMapCenter([roundedLat, roundedLng]);
        setMapZoom(13);
        onChange(address);
        if (onCoordinatesChange) {
          onCoordinatesChange({ lat: roundedLat, lng: roundedLng });
        }
        setShowMap(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (latlng) => {
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    // Round to 6 decimal places to match backend validation
    const roundedLat = Math.round(latlng.lat * 1000000) / 1000000;
    const roundedLng = Math.round(latlng.lng * 1000000) / 1000000;
    setQuery(address);
    setSelectedLocation({
      lat: roundedLat,
      lng: roundedLng,
      address: address
    });
    onChange(address);
    if (onCoordinatesChange) {
      onCoordinatesChange({ lat: roundedLat, lng: roundedLng });
    }
    setShowSuggestions(false);
  };

  const handleToggleMap = () => {
    if (!showMap && selectedLocation) {
      setMapCenter([selectedLocation.lat, selectedLocation.lng]);
      setMapZoom(13);
    }
    setShowMap(!showMap);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if clicking outside both the input and suggestions
      const isOutsideInput = searchRef.current && !searchRef.current.contains(event.target);
      const isOutsideSuggestions = suggestionsRef.current && !suggestionsRef.current.contains(event.target);
      
      if (isOutsideInput && isOutsideSuggestions) {
        console.log('Click outside detected, closing suggestions');
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative" ref={searchRef}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for a location..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-10"
        />
        <button
          type="button"
          onClick={handleToggleMap}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          title="Toggle map"
        >
          🗺️
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <select 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto px-3 py-2 text-sm"
            onChange={(e) => {
              const index = e.target.selectedIndex;
              if (index > 0) {
                const suggestion = suggestions[index - 1]; // Subtract 1 for the "Select..." option
                console.log('Selected suggestion:', suggestion);
                handleSuggestionClick(suggestion);
              }
              setShowSuggestions(false);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Select a location...</option>
            {suggestions.map((suggestion, index) => (
              <option key={index} value={index}>
                {suggestion.display_name}
              </option>
            ))}
          </select>
        )}
        {showSuggestions && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            No suggestions found
          </div>
        )}

        {loading && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            Searching...
          </div>
        )}
      </div>

      {showMap && (
        <div className="mt-2">
          <div className="h-48 rounded-lg border border-gray-300 overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              )}
              <MapClickHandler onMapClick={handleMapClick} />
            </MapContainer>
          </div>
          <p className="text-xs text-gray-500 mt-1">Click on the map to select a location</p>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
