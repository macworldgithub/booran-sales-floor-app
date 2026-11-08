import React from 'react';
import { View, Image, StyleSheet, ImageStyle } from 'react-native';

interface BooranLogoProps {
  style?: ImageStyle;
  height?: number;
}

export function BooranLogo({ style, height = 36 }: BooranLogoProps) {
  const width = height * (240 / 48); // 5:1 ratio

  return (
    <View style={[styles.container, { width }]}>
      <Image
        source={require('../../../assets/images/booran-motors-logo.png')}
        style={[{ width: '100%', height }, style]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});

