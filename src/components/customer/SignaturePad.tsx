import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

export type Signature = [number, number][][];

export function SignaturePad({ onChange, onDrawing }: { onChange: (value: Signature) => void; onDrawing: (drawing: boolean) => void }) {
  const [lines, setLines] = useState<Signature>([]);
  const drawing = useRef<Signature>([]);
  const size = useRef({ width: 1, height: 1 });
  const measure = (event: LayoutChangeEvent) => { size.current = event.nativeEvent.layout; };
  const normalise = (x: number, y: number): [number, number] => [
    Math.max(0, Math.min(1, x / size.current.width)),
    Math.max(0, Math.min(1, y / size.current.height)),
  ];
  const finish = () => {
    onDrawing(false);
    drawing.current = drawing.current.filter(line => line.length > 1);
    onChange(drawing.current);
  };
  return (
    <View>
      <Text>Sign below to acknowledge the loan-car terms.</Text>
      <View
        style={styles.surface}
        onLayout={measure}
        onStartShouldSetResponder={() => drawing.current.length < 8}
        onResponderGrant={event => {
          onDrawing(true);
          drawing.current = [...drawing.current, [normalise(event.nativeEvent.locationX, event.nativeEvent.locationY)]];
          setLines(drawing.current);
        }}
        onResponderMove={event => {
          const previous = drawing.current.at(-1);
          if (!previous || previous.length >= 400) return;
          drawing.current = [...drawing.current.slice(0, -1), [...previous, normalise(event.nativeEvent.locationX, event.nativeEvent.locationY)]];
          setLines(drawing.current);
        }}
        onResponderRelease={finish}
        onResponderTerminationRequest={() => false}
        onResponderTerminate={finish}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none">
            {lines.map((line, index) => <Polyline key={index} points={line.map(([x, y]) => `${x * 1000},${y * 400}`).join(' ')} fill="none" stroke="#17212b" strokeWidth="5" />)}
          </Svg>
        </View>
      </View>
      <Text accessibilityRole="button" onPress={() => { drawing.current = []; setLines([]); onChange([]); }} style={styles.clear}>Clear signature</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { height: 135, borderWidth: 1, borderColor: '#a1aab7', backgroundColor: '#fff', marginVertical: 6 },
  clear: { color: '#1258aa', paddingVertical: 8 },
});
