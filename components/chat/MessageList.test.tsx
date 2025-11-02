import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from './MessageList'

describe('MessageList', () => {
  it('should show empty state when no messages', () => {
    render(<MessageList messages={[]} />)
    
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument()
  })

  it('should render user messages', () => {
    const messages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello there',
      },
    ]
    
    render(<MessageList messages={messages} />)
    
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('should render assistant messages', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Hello! How can I help?',
      },
    ]
    
    render(<MessageList messages={messages} />)
    
    expect(screen.getByText('Assistant')).toBeInTheDocument()
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument()
  })

  it('should display tool invocations', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Let me check that',
        toolInvocations: [
          {
            toolCallId: 'call_1',
            toolName: 'list_facilities',
            args: {},
            state: 'result' as const,
          },
        ],
      },
    ]
    
    render(<MessageList messages={messages} />)
    
    // Should show the tool name
    expect(screen.getByText(/list_facilities/)).toBeInTheDocument()
    // Should show success indicator
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should display tool execution results', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Found 2 facilities',
        toolInvocations: [
          {
            toolCallId: 'call_1',
            toolName: 'list_facilities',
            args: { location: 'NYC' },
            state: 'result' as const,
            result: {
              facilities: [
                { id: '1', name: 'Facility A' },
                { id: '2', name: 'Facility B' },
              ]
            },
          },
        ],
      },
    ]
    
    render(<MessageList messages={messages} />)
    
    // Should show Arguments section
    expect(screen.getByText('Arguments:')).toBeInTheDocument()
    expect(screen.getByText(/"location"/)).toBeInTheDocument()
    
    // Should show Result section
    expect(screen.getByText('Result:')).toBeInTheDocument()
    expect(screen.getByText(/Facility A/)).toBeInTheDocument()
    expect(screen.getByText(/Facility B/)).toBeInTheDocument()
  })

  it('should render multiple messages', () => {
    const messages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'First message',
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Second message',
      },
    ]
    
    render(<MessageList messages={messages} />)
    
    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
  })
})

