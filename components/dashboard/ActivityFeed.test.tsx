import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ActivityFeed } from './ActivityFeed'
import * as queries from '@/lib/queries'

vi.mock('@/lib/queries')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('ActivityFeed', () => {
  it('should show loading state when no activity', () => {
    vi.mocked(queries.useRecentActivity).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    
    render(<ActivityFeed />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Loading activity...')).toBeInTheDocument()
  })

  it('should render recent inspections', () => {
    const mockActivity = {
      recentInspections: [
        {
          _id: '1',
          facility_id: { name: 'Test Facility', _id: '1', shortCode: 'TF', location: 'Amsterdam', createdAt: '', updatedAt: '' },
          is_delivery_accepted: true,
          does_delivery_meets_conditions: true,
          selected_wastetypes: [],
          heating_value_calculation: 15,
          waste_producer: 'Test Producer',
          contract_reference_id: 'C123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      recentContaminants: [],
      recentShipments: [],
    }
    vi.mocked(queries.useRecentActivity).mockReturnValue({
      data: mockActivity,
      isLoading: false,
      error: null,
    } as any)
    
    render(<ActivityFeed />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Test Facility')).toBeInTheDocument()
    expect(screen.getByText(/accepted/i)).toBeInTheDocument()
  })

  it('should render recent contaminants', () => {
    const mockActivity = {
      recentInspections: [],
      recentContaminants: [
        {
          _id: '1',
          wasteItemDetected: 'Plastic Bottle',
          material: 'PET',
          facility_id: { name: 'Test Facility', _id: '1', shortCode: 'TF', location: 'Amsterdam', createdAt: '', updatedAt: '' },
          detection_time: '2024-01-01T00:00:00Z',
          explosive_level: 'low' as const,
          hcl_level: 'low' as const,
          so2_level: 'low' as const,
          estimated_size: 100,
          shipment_id: 'S123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      recentShipments: [],
    }
    vi.mocked(queries.useRecentActivity).mockReturnValue({
      data: mockActivity,
      isLoading: false,
      error: null,
    } as any)
    
    render(<ActivityFeed />, { wrapper: createWrapper() })
    
    expect(screen.getByText('Plastic Bottle')).toBeInTheDocument()
    expect(screen.getByText(/PET/)).toBeInTheDocument()
  })
})

