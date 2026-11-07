import React, { useEffect, useState } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { colors } from '../../theme/theme';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onDismiss, duration = 3000 }: ToastProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(20));

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onDismiss, opacity, translateY]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} color="#ffffff" />;
      case 'info':
        return <Info size={18} color="#ffffff" />;
      default:
        return <CheckCircle2 size={18} color="#ffffff" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return colors.danger;
      case 'info':
        return colors.blue;
      default:
        return '#15803d';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.icon}>{getIcon()}</View>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});

