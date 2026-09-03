export interface SavedAddressItem {
    id: string;
    label: string;
    text: string;
}

const STORAGE_KEY = 'customer_saved_addresses';

export const DEFAULT_SAVED_ADDRESSES: SavedAddressItem[] = [
    { id: '1', label: 'Home', text: 'Sector 62, Noida, Uttar Pradesh, 201301' },
    { id: '2', label: 'Office', text: 'DLF Cyber City, Phase 3, Gurugram, Haryana, 122002' }
];

export const getSavedAddresses = (): SavedAddressItem[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to parse saved addresses:', e);
    }
    return DEFAULT_SAVED_ADDRESSES;
};

export const saveAddressItem = (
    label: string,
    text: string
): { success: boolean; message?: string; addresses: SavedAddressItem[] } => {
    const trimmedLabel = (label || '').trim();
    const trimmedText = (text || '').trim();

    if (!trimmedLabel) {
        return { success: false, message: 'Please provide or select a label.', addresses: getSavedAddresses() };
    }
    if (!trimmedText) {
        return { success: false, message: 'Please enter full address details.', addresses: getSavedAddresses() };
    }

    const current = getSavedAddresses();
    
    // Rule: One address per label. If label exists, update it or reject duplicate
    const existingIndex = current.findIndex(
        item => item.label.trim().toLowerCase() === trimmedLabel.toLowerCase()
    );

    let updated: SavedAddressItem[];
    if (existingIndex >= 0) {
        // Update existing address for this unique label
        updated = [...current];
        updated[existingIndex] = {
            ...updated[existingIndex],
            label: trimmedLabel,
            text: trimmedText
        };
    } else {
        // Append new unique label
        updated = [
            ...current,
            {
                id: Date.now().toString(),
                label: trimmedLabel,
                text: trimmedText
            }
        ];
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // Dispatch custom event for instant cross-component synchronization
        window.dispatchEvent(new Event('savedAddressesUpdated'));
    } catch (e) {
        console.error('Failed to persist saved addresses:', e);
    }

    return { 
        success: true, 
        message: existingIndex >= 0 ? `Updated address for "${trimmedLabel}".` : `Saved new location "${trimmedLabel}".`, 
        addresses: updated 
    };
};

export const removeAddressItem = (id: string): SavedAddressItem[] => {
    const current = getSavedAddresses();
    const filtered = current.filter(item => item.id !== id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('savedAddressesUpdated'));
    } catch (e) {
        console.error('Failed to remove saved address:', e);
    }
    return filtered;
};
