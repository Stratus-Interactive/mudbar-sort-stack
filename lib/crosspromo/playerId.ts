/**
 * Shared anonymous player UUID.
 * Stored per device, passed via deep link when cross-promoting —
 * lets MudBar measure cross-promo flow in PostHog.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PLAYER_ID = '@mudbar/player_id';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getPlayerId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_PLAYER_ID);
  if (!id) {
    id = uuid();
    await AsyncStorage.setItem(KEY_PLAYER_ID, id);
  }
  return id;
}
