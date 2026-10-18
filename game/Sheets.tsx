/**
 * Sort Stack overlays: level-complete, shop/collections, daily challenge.
 * Minimal UI per Ketchapp — sparse, fast, no friction.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { BackgroundTheme, TubeSkin } from './store';

export function LevelCompleteOverlay({
  visible,
  stars,
  coins,
  levelLabel,
  isDaily,
  onNext,
  accent,
  text,
  textDim,
  bgSoft,
}: {
  visible: boolean;
  stars: 1 | 2 | 3;
  coins: number;
  levelLabel: string;
  isDaily: boolean;
  onNext: () => void;
  accent: string;
  text: string;
  textDim: string;
  bgSoft: string;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dim}>
        <View style={[styles.card, { backgroundColor: bgSoft }]}>
          <Text style={[styles.cardTitle, { color: text }]}>
            {isDaily ? 'Daily Complete!' : `${levelLabel} Clear!`}
          </Text>
          <Text style={styles.stars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          <Text style={[styles.coins, { color: textDim }]}>+{coins} coins</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accent }]}
            onPress={onNext}
          >
            <Text style={styles.primaryBtnText}>{isDaily ? 'Done' : 'Next Level'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ShopSheet({
  visible,
  onClose,
  skins,
  backgrounds,
  ownedSkins,
  ownedBgs,
  equippedSkin,
  equippedBg,
  coins,
  onSelectSkin,
  onSelectBg,
  text,
  textDim,
  bgSoft,
  accent,
}: {
  visible: boolean;
  onClose: () => void;
  skins: TubeSkin[];
  backgrounds: BackgroundTheme[];
  ownedSkins: string[];
  ownedBgs: string[];
  equippedSkin: string;
  equippedBg: string;
  coins: number;
  onSelectSkin: (id: string) => void;
  onSelectBg: (id: string) => void;
  text: string;
  textDim: string;
  bgSoft: string;
  accent: string;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.dim}>
        <View style={[styles.sheet, { backgroundColor: bgSoft }]}>
          <Text style={[styles.cardTitle, { color: text }]}>Collection</Text>
          <Text style={[styles.coins, { color: textDim }]}>{coins} coins</Text>
          <ScrollView style={styles.scroll}>
            <Text style={[styles.sectionTitle, { color: textDim }]}>Tube Skins</Text>
            <View style={styles.grid}>
              {skins.map((s) => {
                const owned = ownedSkins.includes(s.id);
                const equipped = equippedSkin === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.item,
                      { borderColor: equipped ? accent : 'transparent', borderWidth: 2 },
                    ]}
                    onPress={() => onSelectSkin(s.id)}
                  >
                    <View style={styles.skinPreview}>
                      {s.balls.slice(0, 4).map((c, i) => (
                        <View key={i} style={[styles.miniBall, { backgroundColor: c }]} />
                      ))}
                    </View>
                    <Text style={[styles.itemName, { color: text }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={[styles.itemSub, { color: textDim }]}>
                      {equipped ? 'Equipped' : owned ? 'Tap to equip' : s.premiumProductId ? '$' : `${s.coins} 🪙`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.sectionTitle, { color: textDim }]}>Backgrounds</Text>
            <View style={styles.grid}>
              {backgrounds.map((b) => {
                const owned = ownedBgs.includes(b.id);
                const equipped = equippedBg === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.item,
                      { borderColor: equipped ? accent : 'transparent', borderWidth: 2 },
                    ]}
                    onPress={() => onSelectBg(b.id)}
                  >
                    <View style={[styles.bgPreview, { backgroundColor: b.bg }]}>
                      <View style={[styles.miniBall, { backgroundColor: b.text }]} />
                    </View>
                    <Text style={[styles.itemName, { color: text }]} numberOfLines={1}>{b.name}</Text>
                    <Text style={[styles.itemSub, { color: textDim }]}>
                      {equipped ? 'Equipped' : owned ? 'Tap to equip' : b.premiumProductId ? '$' : `${b.coins} 🪙`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: textDim }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function DailySheet({
  visible,
  done,
  streak,
  onPlay,
  onClose,
  text,
  textDim,
  bgSoft,
  accent,
}: {
  visible: boolean;
  done: boolean;
  streak: number;
  onPlay: () => void;
  onClose: () => void;
  text: string;
  textDim: string;
  bgSoft: string;
  accent: string;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dim}>
        <View style={[styles.card, { backgroundColor: bgSoft }]}>
          <Text style={[styles.cardTitle, { color: text }]}>Daily Challenge</Text>
          <Text style={[styles.coins, { color: textDim }]}>
            {done ? `Done today — streak: ${streak} 🔥` : 'One special puzzle. Same for everyone.'}
          </Text>
          {!done && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              onPress={onPlay}
            >
              <Text style={styles.primaryBtnText}>Play Daily</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: textDim }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  stars: { fontSize: 40, color: '#FFD23F', marginVertical: 8 },
  coins: { fontSize: 15, marginBottom: 16 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  closeBtn: { marginTop: 14, padding: 8 },
  closeText: { fontSize: 15 },
  sheet: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    alignItems: 'center',
  },
  scroll: { width: '100%' },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    width: '30%',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  skinPreview: { flexDirection: 'row', gap: 3, marginBottom: 6, height: 22, alignItems: 'center' },
  bgPreview: {
    width: 52, height: 34, borderRadius: 8, marginBottom: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  miniBall: { width: 16, height: 16, borderRadius: 8 },
  itemName: { fontSize: 11, fontWeight: '700' },
  itemSub: { fontSize: 10, marginTop: 2 },
});
