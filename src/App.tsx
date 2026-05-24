import { useState } from 'react'
import { Container, Tabs } from '@mantine/core'
import { AuthProvider } from './context/AuthContext'
import { EntriesProvider } from './context/EntriesContext'
import SetupScreen from './components/SetupScreen'
import LogView from './components/LogView'
import HistoryView from './components/HistoryView'

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('log')

  return (
    <Container size="sm" py="md">
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val ?? 'log')}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="log">Log</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="log">
          <LogView />
        </Tabs.Panel>
        <Tabs.Panel value="history">
          <HistoryView />
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <EntriesProvider>
        <SetupScreen>
          <AppContent />
        </SetupScreen>
      </EntriesProvider>
    </AuthProvider>
  )
}
