/**
 * Sort Stack board: tubes, balls, pour animation.
 * Premium-minimal art: flat balls with a soft top highlight, thin tube
 * outlines. The pour animates balls along an arc from source to dest —
 * the satisfying moment — with a haptic tick on each landing.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Tube } from './level';
import { TubeSkin } from './store';

export const BALL_D = 40;
const TUBE_W = 56;
const TUBE_GAP = 14;
const TUBE_PAD = 12;

export interface PourAnim {
  from: number;
  to: number;
  count: number;
  color: number;
}

interface BoardProps {
  tubes: Tube[];
  capacities: number[];
  locked: Set<number>;
  selected: number | null;
  skin: TubeSkin;
  textDim: string;
  pour: PourAnim | null;
  onPourDone: () => void;
  onTubePress: (index: number) => void;
  width: number;
}

interface TubeLayout {
  x: number; // center x
  y: number; // top y of tube body
  height: number;
}

/** Deterministic layout: rows of tubes, centered. */
export function layoutTubes(count: number, width: number): TubeLayout[] {
  const perRow = Math.max(3, Math.floor((width - 32) / (TUBE_W + TUBE_GAP)));
  const layouts: TubeLayout[] = [];
  const rows = Math.ceil(count / perRow);
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(perRow, count - r * perRow);
    const rowW = inRow * TUBE_W + (inRow - 1) * TUBE_GAP;
    const startX = (width - rowW) / 2 + TUBE_W / 2;
    const y = 24 + r * (BALL_D * 4 + TUBE_PAD * 2 + 56);
    for (let i = 0; i < inRow; i++) {
      layouts.push({ x: startX + i * (TUBE_W + TUBE_GAP), y, height: BALL_D * 4 + TUBE_PAD * 2 });
    }
  }
  return layouts;
}

function Ball({ color, size = BALL_D }: { color: string; size?: number }): React.JSX.Element {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View
        style={{
          width: size * 0.55,
          height: size * 0.28,
          borderRadius: size * 0.14,
          backgroundColor: 'rgba(255,255,255,0.35)',
          marginBottom: size * 0.18,
        }}
      />
    </View>
  );
}

function PouringBalls({
  pour,
  fromLayout,
  toLayout,
  ballColor,
  destCount,
  onDone,
}: {
  pour: PourAnim;
  fromLayout: TubeLayout;
  toLayout: TubeLayout;
  ballColor: string;
  /** Balls already in dest (landing stack position). */
  destCount: number;
  onDone: () => void;
}): React.JSX.Element {
  const anims = useRef<Animated.Value[]>(
    Array.from({ length: pour.count }, () => new Animated.Value(0)),
  ).current;
  const doneRef = useRef(false);

  const { dx, lift } = useMemo(() => {
    const startX = fromLayout.x;
    const endX = toLayout.x;
    return {
      dx: endX - startX,
      lift: 70 + Math.abs(endX - startX) * 0.25,
    };
  }, [fromLayout, toLayout]);

  useEffect(() => {
    doneRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const animations = anims.map((av, i) =>
      Animated.sequence([
        Animated.delay(i * 110),
        Animated.timing(av, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    // Haptic tick as each ball lands.
    anims.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, i * 110 + 240),
      );
    });
    Animated.parallel(animations).start(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    });
    return () => {
      timers.forEach(clearTimeout);
      doneRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startX = fromLayout.x;
  const startY = fromLayout.y - 10;

  return (
    <>
      {anims.map((av, i) => {
        // Each ball lands on top of the previous: stack upward.
        const landY =
          toLayout.y + toLayout.height - TUBE_PAD - BALL_D / 2 - (destCount + i) * BALL_D;
        const dy = landY - startY;
        const translateX = av.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [0, dx * 0.5, dx],
        });
        const translateY = av.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [0, -lift, dy],
        });
        const scale = av.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [1, 1.12, 1],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: startX - BALL_D / 2,
              top: startY - BALL_D / 2 - i * 6,
              transform: [{ translateX }, { translateY }, { scale }],
              zIndex: 10,
            }}
          >
            <Ball color={ballColor} />
          </Animated.View>
        );
      })}
    </>
  );
}

export function SortBoard(props: BoardProps): React.JSX.Element {
  const { tubes, capacities, locked, selected, skin, textDim, pour, onPourDone, onTubePress, width } = props;
  const layouts = useMemo(() => layoutTubes(tubes.length, width), [tubes.length, width]);
  const boardHeight = useMemo(
    () => Math.max(...layouts.map((l) => l.y + l.height)) + 40,
    [layouts],
  );

  // During a pour, hide the moving balls from the source tube.
  const visibleTubes = useMemo(() => {
    if (!pour) return tubes;
    return tubes.map((t, i) => (i === pour.from ? t.slice(0, t.length - pour.count) : t));
  }, [tubes, pour]);

  return (
    <View style={[styles.board, { height: boardHeight, width }]}>
      {visibleTubes.map((tube, i) => {
        const l = layouts[i];
        const isLocked = locked.has(i);
        const isSelected = selected === i;
        const cap = capacities[i];
        const tubeH = cap === 2 ? BALL_D * 2 + TUBE_PAD * 2 : l.height;
        const tubeY = cap === 2 ? l.y + l.height - tubeH : l.y;
        return (
          <Pressable
            key={i}
            onPress={() => onTubePress(i)}
            style={[
              styles.tubeHit,
              {
                left: l.x - TUBE_W / 2 - 8,
                top: tubeY - 26,
                width: TUBE_W + 16,
                height: tubeH + 52,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.tube,
                {
                  width: TUBE_W,
                  height: tubeH,
                  borderColor: isSelected ? '#fff' : skin.tubeAccent,
                  borderWidth: isSelected ? 3 : 2,
                  backgroundColor: skin.tube + '55',
                  opacity: isLocked ? 0.45 : 1,
                  transform: [{ translateY: isSelected ? -10 : 0 }],
                },
              ]}
            >
              {isLocked && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
              )}
              {/* Balls, bottom-up */}
              <View style={[styles.ballStack, { height: tubeH - TUBE_PAD }]}>
                {tube.map((colorIdx, bi) => (
                  <View key={bi} style={styles.ballSlot}>
                    <Ball color={skin.balls[colorIdx % skin.balls.length]} />
                  </View>
                ))}
              </View>
              {cap === 2 && (
                <Text style={[styles.narrowLabel, { color: textDim }]}>2</Text>
              )}
            </Animated.View>
          </Pressable>
        );
      })}

      {pour && (
        <PouringBalls
          pour={pour}
          fromLayout={layouts[pour.from]}
          toLayout={layouts[pour.to]}
          ballColor={skin.balls[pour.color % skin.balls.length]}
          destCount={tubes[pour.to].length}
          onDone={onPourDone}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
  },
  tubeHit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  tube: {
    borderRadius: 14,
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  ballStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  ballSlot: {
    height: BALL_D,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: '38%',
    zIndex: 5,
  },
  lockText: {
    fontSize: 22,
  },
  narrowLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 10,
    fontWeight: '700',
  },
});
