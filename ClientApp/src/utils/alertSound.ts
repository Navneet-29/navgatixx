// Alert and Notification Sound and Vibration Utility
// Uses Web Audio API synthesized chime (zero external network dependency)
// and handles browser/webview autoplay restrictions gracefully,
// plus hardware vibration via navigator.vibrate.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    } catch {
        return null;
    }
}

// Warm up AudioContext on the first user interaction (touch or click)
// This unlocks WebView/browser autoplay policies completely!
if (typeof window !== 'undefined') {
    const unlock = () => {
        try {
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
        } catch {}
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
}

/**
 * Play a crisp two-tone alert chime using Web Audio API synthesis.
 * Has NO reliance on external URLs, downloads, or CDNs. Works 100% offline.
 */
export function playAlertChime(volume = 0.8) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Elegant ascending chime: 587.33Hz (D5) -> 880Hz (A5)
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(Math.min(1, Math.max(0, volume)), now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
    } catch (e) {
        console.warn('[AlertSound] WebAudio chime failed:', e);
    }
}

/**
 * Trigger vibration on mobile devices if supported and allowed
 */
export function triggerAlertVibration(pattern: number | number[] = [200, 100, 200]) {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    } catch (e) {
        console.warn('[AlertVibration] Vibration failed:', e);
    }
}

/**
 * Main dispatcher respecting user preferences from Settings / Profile
 * checks:
 * 1. pref_sound !== 'false'
 * 2. pref_vibration !== 'false'
 */
export function triggerNotificationAlert(options?: { sound?: boolean; vibration?: boolean }) {
    const isSoundAllowed = options?.sound !== undefined 
        ? options.sound 
        : localStorage.getItem('pref_sound') !== 'false';

    const isVibrationAllowed = options?.vibration !== undefined 
        ? options.vibration 
        : localStorage.getItem('pref_vibration') !== 'false';

    if (isSoundAllowed) {
        playAlertChime();
    }

    if (isVibrationAllowed) {
        triggerAlertVibration();
    }
}

/**
 * Play an urgent, clear double-beep ("pi-pi") specifically designed for incoming ride requests.
 */
export function playRideRequestBeep(volume = 0.95) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Beep 1 ("pi")
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now); // A5 note
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(Math.min(1, Math.max(0, volume)), now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.14);

        // Beep 2 ("pi")
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.5, now + 0.15); // C6 note
        gain2.gain.setValueAtTime(0.001, now + 0.15);
        gain2.gain.linearRampToValueAtTime(Math.min(1, Math.max(0, volume)), now + 0.17);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.34);
    } catch (e) {
        console.warn('[AlertSound] WebAudio ride beep failed:', e);
    }
}

let alarmIntervalId: any = null;

/**
 * Start continuous looping alert ("pi-pi-pi...") and vibration for incoming ride requests.
 * Loops reliably until stopRideRequestAlarm() is called.
 */
export function startRideRequestAlarm() {
    if (alarmIntervalId !== null) return; // Already alarming

    const isSoundAllowed = localStorage.getItem('pref_sound') !== 'false';
    const isVibrationAllowed = localStorage.getItem('pref_vibration') !== 'false';

    const triggerOnce = () => {
        if (isSoundAllowed) {
            playRideRequestBeep(0.95);
        }
        if (isVibrationAllowed) {
            triggerAlertVibration([300, 150, 300]);
        }
    };

    triggerOnce();
    alarmIntervalId = setInterval(triggerOnce, 1200);
}

/**
 * Stop the continuous ride request alert immediately.
 */
export function stopRideRequestAlarm() {
    if (alarmIntervalId !== null) {
        clearInterval(alarmIntervalId);
        alarmIntervalId = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0); // Cancel any ongoing vibration
    }
}
