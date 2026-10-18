/**
 * Sort Stack — main game screen.
 * Ketchapp rules: boot STRAIGHT into gameplay. No menus, no tutorial text.
 * Tap a tube, tap a destination. First 3 levels teach the mechanic.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView,
} from 'react-native';
import { Analytics, track } from '../lib/analytics';
import { Feedback } from '../lib/retention/feedback';
import {
  getLevel, completeLevel, getCoins, addCoins, spendCoins,
} from '../lib/retention/progression';
import { getDailyStatus } from '../lib/retention/dailyRewards';
import { getOwned, getEquipped, unlock, equip, isOwned } from '../lib/retention/collections';
import { canShowRewarded, showRewarded, maybeShowInterstitial } from '../lib/ads';
import { MoreGamesSheet } from '../lib/crosspromo';
import { purchaseProduct } from '../lib/iap';
import { PRODUCTS } from '../lib/iap/products';
import {
  generateLevel, generateDailyLevel, applyPour, isComplete, starsForMoves,
  LevelData, Tube,
} from '../game/level';
import { SortBoard, PourAnim } from '../game/Board';
import { LevelCompleteOverlay, ShopSheet, DailySheet } from '../game/Sheets';
import {
  TUBE_SKINS, BACKGROUNDS, isDailyDone, markDailyDone, dailyKey,
  setStars, wasFreeUndoUsed, markFreeUndoUsed, TubeSkin, BackgroundTheme,
} from '../game/store';

const ACCENT = '#2A9D8F';
const { width: SCREEN_W } = Dimensions.get('window');

interface HistoryEntry {
  tubes: Tube[];
  locked: number[];
}

export default function GameScreen(): React.JSX.Element {
  const [level, setLevel] = useState(1);
  const [data, setData] = useState<LevelData | null>(null);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [capacities, setCapacities] = useState<number[]>([]);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [pour, setPour] = useState<(PourAnim & { color: number }) | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [extraTubeUsed, setExtraTubeUsed] = useState(false);
  const [coins, setCoins] = useState(0);
  const [skin, setSkin] = useState<TubeSkin>(TUBE_SKINS[0]);
  const [bg, setBg] = useState<BackgroundTheme>(BACKGROUNDS[0]);
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['slate']);
  const [ownedBgs, setOwnedBgs] = useState<string[]>(['ink']);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [completeInfo, setCompleteInfo] = useState<{ stars: 1 | 2 | 3; coins: number; doubled: boolean } | null>(null);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showMoreGames, setShowMoreGames] = useState(false);
  const [boardWidth, setBoardWidth] = useState(SCREEN_W);

  const movesRef = useRef(0);
  const poursRef = useRef(0);

  const startLevel = useCallback(async (lv: number, daily: boolean) => {
    const d = daily ? generateDailyLevel() : generateLevel(lv);
    setData(d);
    setTubes(d.tubes.map((t) => [...t]));
    setCapacities([...d.capacities]);
    setLocked(new Set(d.lockedTubes));
    setSelected(null);
    setPour(null);
    setMoves(0);
    movesRef.current = 0;
    poursRef.current = 0;
    setHistory([]);
    setExtraTubeUsed(false);
    setPhase('playing');
    setCompleteInfo(null);
    setIsDaily(daily);
    void track('level_start', { level: daily ? 'daily' : lv });
  }, []);

  /* ── boot ── */
  useEffect(() => {
    (async () => {
      const lv = await getLevel();
      setLevel(lv);
      await startLevel(lv, false);
      setCoins(await getCoins());
      setDailyDone(await isDailyDone());
      const ds = await getDailyStatus();
      setDailyStreak(ds.streakDay);
      // Load equipped cosmetics
      const skinId = (await getEquipped('tube_skin')) ?? 'slate';
      const bgId = (await getEquipped('background')) ?? 'ink';
      const s = TUBE_SKINS.find((x) => x.id === skinId) ?? TUBE_SKINS[0];
      const b = BACKGROUNDS.find((x) => x.id === bgId) ?? BACKGROUNDS[0];
      setSkin(s);
      setBg(b);
      setOwnedSkins(await getOwned('tube_skin').then((o) => (o.length ? o : ['slate'])));
      setOwnedBgs(await getOwned('background').then((o) => (o.length ? o : ['ink'])));
      void Analytics.sessionStart();
    })();
  }, [startLevel]);

  const levelKey = isDaily ? `daily-${dailyKey()}` : `level-${data?.seed ?? level}`;

  /* ── tube taps ── */
  const onTubePress = useCallback(
    (i: number) => {
      if (phase !== 'playing' || pour || !data) return;
      if (locked.has(i)) {
        void Feedback.failure();
        return;
      }
      if (selected === null) {
        if (tubes[i].length === 0) return;
        void Feedback.tap();
        setSelected(i);
        return;
      }
      if (selected === i) {
        setSelected(null);
        return;
      }
      const r = applyPour(tubes, capacities, locked, selected, i);
      if (!r) {
        // Illegal: if dest has balls, switch selection to it; else error buzz.
        void Feedback.failure();
        if (tubes[i].length > 0) setSelected(i);
        else setSelected(null);
        return;
      }
      const color = tubes[selected][tubes[selected].length - 1];
      setHistory((h) => [...h, { tubes: tubes.map((t) => [...t]), locked: [...locked] }]);
      setPour({ from: r.move.from, to: r.move.to, count: r.move.count, color });
      setSelected(null);
    },
    [phase, pour, data, locked, selected, tubes, capacities],
  );

  const onPourDone = useCallback(() => {
    if (!pour || !data) return;
    // Recompute from pre-pour state (tubes unchanged during animation).
    const r = applyPour(tubes, capacities, locked, pour.from, pour.to);
    const committed = r ? r.tubes : tubes;
    const nextMoves = movesRef.current + 1;
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    poursRef.current += 1;

    // Unlock check
    if (locked.size > 0 && poursRef.current >= data.unlockAfterMoves) {
      setLocked(new Set());
      void Feedback.milestone();
    }

    setTubes(committed);
    setPour(null);
    void track('pour', { level: isDaily ? 'daily' : level });

    if (isComplete(committed, capacities)) {
      const stars = starsForMoves(nextMoves, data.par);
      const clearedLevel = level;
      const coinReward = isDaily ? 150 : 20 + stars * 10 + clearedLevel;
      void (async () => {
        const newCoins = await addCoins(coinReward);
        setCoins(newCoins);
        if (!isDaily) {
          await completeLevel(clearedLevel);
          await setStars(clearedLevel, stars);
          setLevel(clearedLevel + 1);
        } else {
          await markDailyDone();
          setDailyDone(true);
        }
        setCompleteInfo({ stars, coins: coinReward, doubled: false });
        setPhase('complete');
        void Feedback.success();
        void track('level_complete', {
          level: isDaily ? 'daily' : clearedLevel,
          stars,
          moves: nextMoves,
        });
        // Interstitial every 4th level clear (natural break only).
        if (!isDaily && clearedLevel % 4 === 0) {
          maybeShowInterstitial('level_complete');
        }
      })();
    }
  }, [pour, data, tubes, capacities, locked, isDaily, level]);

  /* ── undo: 1 free per level, then rewarded ── */
  const onUndo = useCallback(async () => {
    if (phase !== 'playing' || pour || history.length === 0) return;
    const used = await wasFreeUndoUsed(levelKey);
    if (!used) {
      await markFreeUndoUsed(levelKey);
    } else {
      if (!canShowRewarded()) return;
      const watched = await showRewarded('undo');
      if (watched <= 0) return;
    }
    const prev = history[history.length - 1];
    setTubes(prev.tubes);
    setLocked(new Set(prev.locked));
    setHistory((h) => h.slice(0, -1));
    movesRef.current = Math.max(0, movesRef.current - 1);
    poursRef.current = Math.max(0, poursRef.current - 1);
    setMoves(movesRef.current);
    void Feedback.tap();
  }, [phase, pour, history, levelKey]);

  /* ── +1 empty tube (rewarded, once per level) ── */
  const onExtraTube = useCallback(async () => {
    if (phase !== 'playing' || pour || extraTubeUsed || !data) return;
    if (!canShowRewarded()) return;
    const watched = await showRewarded('extra_tube');
    if (watched > 0) {
      setTubes((t) => [...t, []]);
      setCapacities((c) => [...c, 4]);
      setExtraTubeUsed(true);
      void Feedback.milestone();
      void track('extra_tube', { level: isDaily ? 'daily' : level });
    }
  }, [phase, pour, extraTubeUsed, data, isDaily, level]);

  /* ── restart (instant, same seed) ── */
  const onRestart = useCallback(() => {
    void Feedback.tap();
    void startLevel(isDaily ? -1 : level, isDaily);
  }, [isDaily, level, startLevel]);

  /* ── next ── */
  const onNext = useCallback(() => {
    void startLevel(level, false);
  }, [level, startLevel]);

  /* ── shop ── */
  const refreshOwned = useCallback(async () => {
    setOwnedSkins(await getOwned('tube_skin').then((o) => (o.length ? o : ['slate'])));
    setOwnedBgs(await getOwned('background').then((o) => (o.length ? o : ['ink'])));
    setCoins(await getCoins());
  }, []);

  const onSelectSkin = useCallback(
    async (id: string) => {
      const def = TUBE_SKINS.find((s) => s.id === id);
      if (!def) return;
      if (await isOwned('tube_skin', id)) {
        await equip('tube_skin', id);
        setSkin(def);
        void Feedback.tap();
        return;
      }
      if (def.premiumProductId) {
        const product = PRODUCTS.find((p) => p.id === def.premiumProductId);
        if (!product) return;
        const res = await purchaseProduct(product);
        if (res.ok) {
          await unlock('tube_skin', id);
          await equip('tube_skin', id);
          setSkin(def);
          await refreshOwned();
          void Feedback.success();
        }
        return;
      }
      if (await spendCoins(def.coins)) {
        await unlock('tube_skin', id);
        await equip('tube_skin', id);
        setSkin(def);
        await refreshOwned();
        void Feedback.success();
      } else {
        void Feedback.failure();
      }
    },
    [refreshOwned],
  );

  const onSelectBg = useCallback(
    async (id: string) => {
      const def = BACKGROUNDS.find((b) => b.id === id);
      if (!def) return;
      if (await isOwned('background', id)) {
        await equip('background', id);
        setBg(def);
        void Feedback.tap();
        return;
      }
      if (def.premiumProductId) {
        const product = PRODUCTS.find((p) => p.id === def.premiumProductId);
        if (!product) return;
        const res = await purchaseProduct(product);
        if (res.ok) {
          await unlock('background', id);
          await equip('background', id);
          setBg(def);
          await refreshOwned();
          void Feedback.success();
        }
        return;
      }
      if (await spendCoins(def.coins)) {
        await unlock('background', id);
        await equip('background', id);
        setBg(def);
        await refreshOwned();
        void Feedback.success();
      } else {
        void Feedback.failure();
      }
    },
    [refreshOwned],
  );

  /* ── double coins (rewarded) on level complete ── */
  const onDoubleCoins = useCallback(async () => {
    if (!completeInfo || completeInfo.doubled || !canShowRewarded()) return;
    const watched = await showRewarded('double_coins');
    if (watched > 0) {
      const newCoins = await addCoins(completeInfo.coins);
      setCoins(newCoins);
      setCompleteInfo({ ...completeInfo, coins: completeInfo.coins * 2, doubled: true });
      void Feedback.success();
    }
  }, [completeInfo]);

  if (!data) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: bg.bg }]}>
        <Text style={{ color: bg.textDim }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg.bg }]}>
      {/* Header — minimal */}
      <View style={styles.header}>
        <Text style={[styles.levelLabel, { color: bg.text }]}>
          {isDaily ? 'Daily' : `Level ${level}`}
        </Text>
        <Text style={[styles.moves, { color: bg.textDim }]}>{moves} moves</Text>
        <Text style={[styles.coinsLabel, { color: bg.text }]}>🪙 {coins}</Text>
      </View>

      {/* Board */}
      <View
        style={styles.boardWrap}
        onLayout={(e) => setBoardWidth(e.nativeEvent.layout.width)}
      >
        <SortBoard
          tubes={tubes}
          capacities={capacities}
          locked={locked}
          selected={selected}
          skin={skin}
          textDim={bg.textDim}
          pour={pour}
          onPourDone={onPourDone}
          onTubePress={onTubePress}
          width={boardWidth}
        />
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => void onUndo()}>
          <Text style={styles.actionText}>↩️</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => void onExtraTube()}>
          <Text style={styles.actionText}>🧪</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>+Tube</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onRestart}>
          <Text style={styles.actionText}>🔄</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShop(true)}>
          <Text style={styles.actionText}>🎨</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>Style</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowDaily(true)}
        >
          <Text style={styles.actionText}>📅{dailyDone ? '' : '•'}</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowMoreGames(true)}>
          <Text style={styles.actionText}>🎮</Text>
          <Text style={[styles.actionLabel, { color: bg.textDim }]}>Games</Text>
        </TouchableOpacity>
      </View>

      <LevelCompleteOverlay
        visible={phase === 'complete' && completeInfo !== null}
        stars={completeInfo?.stars ?? 1}
        coins={completeInfo?.coins ?? 0}
        levelLabel={isDaily ? 'Daily' : `Level ${level - 1}`}
        isDaily={isDaily}
        onNext={onNext}
        accent={ACCENT}
        text={bg.text}
        textDim={bg.textDim}
        bgSoft={bg.bgSoft}
      />

      {phase === 'complete' && completeInfo && !completeInfo.doubled && (
        <TouchableOpacity style={styles.doubleBtn} onPress={() => void onDoubleCoins()}>
          <Text style={styles.doubleText}>📺 Double coins</Text>
        </TouchableOpacity>
      )}

      <ShopSheet
        visible={showShop}
        onClose={() => setShowShop(false)}
        skins={TUBE_SKINS}
        backgrounds={BACKGROUNDS}
        ownedSkins={ownedSkins}
        ownedBgs={ownedBgs}
        equippedSkin={skin.id}
        equippedBg={bg.id}
        coins={coins}
        onSelectSkin={(id) => void onSelectSkin(id)}
        onSelectBg={(id) => void onSelectBg(id)}
        text={bg.text}
        textDim={bg.textDim}
        bgSoft={bg.bgSoft}
        accent={ACCENT}
      />

      <DailySheet
        visible={showDaily}
        done={dailyDone}
        streak={dailyStreak}
        onPlay={() => {
          setShowDaily(false);
          void startLevel(-1, true);
        }}
        onClose={() => setShowDaily(false)}
        text={bg.text}
        textDim={bg.textDim}
        bgSoft={bg.bgSoft}
        accent={ACCENT}
      />

      <MoreGamesSheet visible={showMoreGames} onClose={() => setShowMoreGames(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  levelLabel: { fontSize: 20, fontWeight: '800' },
  moves: { fontSize: 14 },
  coinsLabel: { fontSize: 16, fontWeight: '700' },
  boardWrap: { flex: 1 },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingBottom: 18,
  },
  actionBtn: { alignItems: 'center', minWidth: 52 },
  actionText: { fontSize: 24 },
  actionLabel: { fontSize: 10, marginTop: 2 },
  doubleBtn: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doubleText: { color: '#fff', fontWeight: '700' },
});
