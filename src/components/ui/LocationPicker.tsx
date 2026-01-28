"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Next.js/Webpack
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
}

const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} icon={defaultIcon} />
    );
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    initialLat,
    initialLng
}) => {
    // Default to New York if no initial pos
    const [position, setPosition] = useState<L.LatLng | null>(
        initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null
    );

    // Default center for map initialization
    const center = initialLat && initialLng
        ? [initialLat, initialLng] as [number, number]
        : [40.7128, -74.0060] as [number, number]; // New York

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newPos = new L.LatLng(parseFloat(lat), parseFloat(lon));
                setPosition(newPos);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = () => {
        if (position) {
            onSelect(position.lat, position.lng);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[var(--brand-primary)]" />
                        Select Location
                    </DialogTitle>
                </DialogHeader>

                <div className="h-[400px] w-full relative">
                    <MapContainer
                        center={center}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <div className="absolute top-4 left-14 right-4 z-[1000] flex gap-2 w-auto max-w-sm">
                            <Input
                                placeholder="Search city, address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="bg-white/95 backdrop-blur shadow-lg border-0 h-10 rounded-full px-5"
                            />
                            <Button onClick={handleSearch} disabled={isSearching} size="icon" className="bg-white/95 shadow-lg hover:bg-white text-slate-700 shrink-0 rounded-full w-10 h-10">
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>

                    {!position && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[1000] pointer-events-none">
                            Click anywhere on the map to set location
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50">
                    <Button variant="ghost" onClick={onClose} className="rounded-full">Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!position}
                        className="rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
                    >
                        Confirm Location
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
