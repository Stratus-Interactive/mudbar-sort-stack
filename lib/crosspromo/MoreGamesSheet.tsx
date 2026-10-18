/**
 * "More Games from MudBar" bottom sheet.
 * Shown from main menu + game-over screen. Lists sister titles with
 * icons, taglines, and deep links (falls back to App Store).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { getOrderedGames, SisterGame } from './config';
import { getPlayerId } from './playerId';
import { Analytics } from '../analytics';
import { COMPANY_NAME } from '../config';

interface MoreGamesSheetProps {
  visible: boolean;
  onClose: () => void;
  accentColor?: string;
}

async function openGame(game: SisterGame): Promise<void> {
  const playerId = await getPlayerId();
  const deepLink = `${game.urlScheme}://open?ref=crosspromo&player_id=${playerId}`;
  void Analytics.crossPromoTap(game.slug);
  try {
    const supported = await Linking.canOpenURL(deepLink);
    if (supported) {
      await Linking.openURL(deepLink);
      return;
    }
  } catch {
    /* fall through to App Store */
  }
  await Linking.openURL(game.appStoreUrl);
}

export function MoreGamesSheet({
  visible,
  onClose,
  accentColor = '#6C5CE7',
}: MoreGamesSheetProps): React.JSX.Element {
  const [games, setGames] = useState<SisterGame[]>([]);

  useEffect(() => {
    if (visible) {
      void getOrderedGames().then(setGames);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>More games from {COMPANY_NAME.replace(' Entertainment', '')}</Text>
          <ScrollView>
            {games.map((g) => (
              <TouchableOpacity
                key={g.slug}
                style={styles.row}
                onPress={() => void openGame(g)}
              >
                <Image source={{ uri: g.iconUrl }} style={styles.icon} />
                <View style={styles.textCol}>
                  <Text style={styles.name}>{g.name}</Text>
                  <Text style={styles.tagline}>{g.tagline}</Text>
                </View>
                <View style={[styles.get, { backgroundColor: accentColor }]}>
                  <Text style={styles.getText}>GET</Text>
                </View>
              </TouchableOpacity>
            ))}
            {games.length === 0 && (
              <Text style={styles.empty}>More games coming soon!</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  icon: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#eee' },
  textCol: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  tagline: { fontSize: 13, color: '#666', marginTop: 2 },
  get: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  getText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#999', marginVertical: 20 },
  close: { marginTop: 12, alignItems: 'center', padding: 12 },
  closeText: { fontSize: 16, fontWeight: '600', color: '#666' },
});
