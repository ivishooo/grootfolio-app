/**
 * Bottom sheet reutilizable (F7). Los modales de web se traducen a esto en
 * mobile: Modal slide, handle arriba, contenido pegado abajo y scroll +
 * KeyboardAvoidingView (casi todos tienen inputs).
 */
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View
          style={{
            backgroundColor: theme.background.elevated,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '86%',
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.default }} />
          </View>
          {title ? (
            <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '800', paddingHorizontal: 20, paddingTop: 6 }}>
              {title}
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
