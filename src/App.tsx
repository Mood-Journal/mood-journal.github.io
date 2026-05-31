import { Box, Container, Tabs } from '@mantine/core'
import { AuthProvider } from './context/AuthContext'
import { EntriesProvider } from './context/EntriesContext'
import { useTabHash } from './hooks/useTabHash'
import SyncBar from './components/SyncBar'
import LogView from './components/LogView'
import HistoryView from './components/HistoryView'
import GraphView from './components/GraphView'

const TABS = ['log', 'history', 'trends'] as const

function AppContent() {
  const [activeTab, setActiveTab] = useTabHash(TABS, 'log')

  return (
    // pb reserves space for the fixed SyncBar
    <Box pb={64}>
      <Container size="sm" py="md">
        <Tabs value={activeTab} onChange={(val) => setActiveTab(val ?? 'log')}>
          <Tabs.List grow mb="md">
            <Tabs.Tab value="log">Log</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
            <Tabs.Tab value="trends">Trends</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="log">
            <LogView />
          </Tabs.Panel>
          <Tabs.Panel value="history">
            <HistoryView />
          </Tabs.Panel>
          <Tabs.Panel value="trends">
            <GraphView />
          </Tabs.Panel>
        </Tabs>
      </Container>
      <SyncBar />
    </Box>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <EntriesProvider>
        <AppContent />
      </EntriesProvider>
    </AuthProvider>
  )
}
