/**
 * Plays the notification sound.
 * Silently fails if the browser blocks autoplay.
 */
export function playNotificationSound() {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Autoplay blocked — ignore silently
    });
  } catch {
    // Audio not supported — ignore
  }
}
