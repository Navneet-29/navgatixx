export interface SavedAddress {
    id: string;
    label: string; // e.g. "Home", "Office", "Warehouse", "Mom's Place", etc.
    customLabel?: string;
    text: string;
    lat?: string;
    lng?: string;
}

const STORAGE_KEY = 'customer_saved_addresses';

export const DEFAULT_SAVED_ADDRESSES: SavedAddress[] = [
    { id: '1', label: 'Home', text: 'Sector 62, Noida, Uttar Pradesh, 201301' },
    { id: '2', label: 'Office', text: 'DLF Cyber City, Phase 3, Gurugram, Haryana, 122002' }
];

export const getSavedAddresses = (): SavedAddress[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to parse saved addresses:', e);
    }
    return DEFAULT_SAVED_ADDRESSES;
};

export const saveAddressesToStorage = (addresses: SavedAddress[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
        window.dispatchEvent(new Event('saved_addresses_updated'));
    } catch (e) {
        console.error('Failed to store saved addresses:', e);
    }
};

/**
 * Upserts an address ensuring:
 * 1. Only ONE address per label (if label already exists, it updates that label's address).
 * 2. Custom labels are supported.
 */
export const upsertSavedAddress = (
    label: string,
    text: string,
    lat?: string,
    lng?: string
): { success: boolean; message: string; addresses: SavedAddress[] } => {
    const trimmedLabel = (label || 'Custom').trim();
    const trimmedText = (text || '').trim();

    if (!trimmedText) {
        return { success: false, message: 'Address details cannot be empty.', addresses: getSavedAddresses() };
    }
    if (!trimmedLabel) {
        return { success: false, message: 'Address label cannot be empty.', addresses: getSavedAddresses() };
    }

    const current = getSavedAddresses();
    // Check if label already exists (case-insensitive)
    const existingIndex = current.findIndex(
        (a) => a.label.toLowerCase() === trimmedLabel.toLowerCase()
    );

    let updatedList: SavedAddress[];
    if (existingIndex >= 0) {
        // Update existing label with new address
        updatedList = current.map((item, idx) =>
            idx === existingIndex
                ? { ...item, text: trimmedText, lat: lat || item.lat, lng: lng || item.lng }
                : item
        );
    } else {
        // Append new unique label
        const newEntry: SavedAddress = {
            id: Date.now().toString(),
            label: trimmedLabel,
            text: trimmedText,
            lat,
            lng
        };
        updatedList = [...current, newEntry];
    }

    saveAddressesToStorage(updatedList);
    return {
        success: true,
        message: existingIndex >= 0 ? `Updated saved address for "${trimmedLabel}".` : `Saved new address for "${trimmedLabel}".`,
        addresses: updatedList
    };
};

export const deleteSavedAddress = (id: string): SavedAddress[] => {
    const current = getSavedAddresses();
    const filtered = current.filter((item) => item.id !== id);
    saveAddressesToStorage(filtered);
    return filtered;
};
