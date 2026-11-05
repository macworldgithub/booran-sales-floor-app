import React from 'react';
import { View, Image, StyleSheet, Text, ImageStyle } from 'react-native';

interface BooranLogoProps {
  style?: ImageStyle;
  height?: number;
}

export function BooranLogo({ style, height = 36 }: BooranLogoProps) {
  const width = height * (240 / 48); // 5:1 ratio

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/booran-motors-logo.png')}
        style={[{ width, height }, style]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});

