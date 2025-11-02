import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCard } from './StatsCard'
import { Building } from 'lucide-react'

describe('StatsCard', () => {
  it('should render title and value', () => {
    render(<StatsCard title="Facilities" value={5} />)
    
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(
      <StatsCard 
        title="Acceptance Rate" 
        value="85%" 
        description="Last 30 days"
      />
    )
    
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('should not render description when not provided', () => {
    render(<StatsCard title="Facilities" value={5} />)
    
    const card = screen.getByText('Facilities').closest('div')
    expect(card?.textContent).not.toContain('Last')
  })

  it('should render icon when provided', () => {
    const { container } = render(
      <StatsCard 
        title="Facilities" 
        value={5} 
        icon={<Building className="test-icon" />}
      />
    )
    
    const icon = container.querySelector('.test-icon')
    expect(icon).toBeInTheDocument()
  })

  it('should handle string values', () => {
    render(<StatsCard title="Rate" value="90%" />)
    
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('should handle number values', () => {
    render(<StatsCard title="Count" value={42} />)
    
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

