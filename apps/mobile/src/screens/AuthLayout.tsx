/**
 * Layout de Login y Registro en mobile (rediseño v2, Fase 6). SPEC-pantallas ›
 * Login: Groot de 104 en un círculo de 112 sobre `groot.ground`, el lockup y el
 * formulario (máx. 380). El teclado no tapa el botón: KeyboardAvoidingView.
 */
import type { ReactNode } from 'react'
import { View, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { Logo } from '@/components/ui/Logo'
import { GrootAvatar } from '@/components/groot/GrootAvatar'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { theme } = useTheme()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 40, paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', gap: 16 }}>
            <View style={{ alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <View style={{ width: 112, height: 112, borderRadius: 56, overflow: 'hidden', backgroundColor: theme.groot.ground, alignItems: 'center', justifyContent: 'flex-end' }}>
                {/* Quieto: con los loops infinitos XCTest no llega a tipear en los campos
                    (pasaba lo mismo con los swipes, ver Fase 3). */}
                <GrootAvatar mood="calm" size={104} paused />
              </View>
              <Logo variant="lockup" size={30} />
            </View>
            <View>
              <Text accessibilityRole="header" style={{ color: theme.text.primary, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }}>{title}</Text>
              <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>{subtitle}</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** Botón primario de 48, radio 11. */
export function AuthSubmit({ children, onPress, disabled, testID }: { children: ReactNode; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { theme } = useTheme()
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={{ height: 48, borderRadius: 11, backgroundColor: theme.brand.solid, opacity: disabled ? 0.5 : 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: theme.text.onBrand, fontSize: 15, fontWeight: '600' }}>{children}</Text>
    </TouchableOpacity>
  )
}
