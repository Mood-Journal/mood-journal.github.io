import { useMemo } from 'react'
import { Alert, List, Paper, Skeleton, Stack, Title, Text } from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useEntries } from '@/hooks/useEntries'
import { aggregateMoodTrend } from './aggregate'
import { computeMoodInsights } from './insights'

export default function GraphView() {
  const { entries, status, error } = useEntries()

  // Aggregate only when the underlying entries change, not on every render.
  const { data, series } = useMemo(() => aggregateMoodTrend(entries), [entries])
  const insights = useMemo(() => computeMoodInsights(entries), [entries])

  const isInitialLoad = status === 'idle' || status === 'loading'

  return (
    <Stack gap="md" py="md">
      <Title order={3}>Your mood trend</Title>

      {isInitialLoad && <Skeleton height={300} radius="md" />}

      {status === 'error' && (
        <Alert color="red" variant="light">
          {error ?? 'Failed to load your trend.'}
        </Alert>
      )}

      {!isInitialLoad && status !== 'error' && data.length === 0 && (
        <Text c="dimmed" size="sm">
          Your mood trend will appear here once you start logging entries.
        </Text>
      )}

      {!isInitialLoad && status !== 'error' && data.length > 0 && (
        <>
          <BarChart h={300} data={data} dataKey="date" type="stacked" series={series} />

          {insights.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="xs">
                What we're noticing
              </Title>
              <List spacing="xs" size="sm">
                {insights.map((insight) => (
                  <List.Item key={insight}>{insight}</List.Item>
                ))}
              </List>
            </Paper>
          )}
        </>
      )}
    </Stack>
  )
}
