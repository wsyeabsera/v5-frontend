import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('should render textarea and send button', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault())
    const mockHandleInputChange = vi.fn()
    
    render(
      <ChatInput
        input=""
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
        isLoading={false}
      />
    )
    
    expect(screen.getByPlaceholderText(/ask about facilities/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should disable textarea and button when loading', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault())
    const mockHandleInputChange = vi.fn()
    
    render(
      <ChatInput
        input="test"
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
        isLoading={true}
      />
    )
    
    expect(screen.getByPlaceholderText(/ask about facilities/i)).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should disable button when input is empty', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault())
    const mockHandleInputChange = vi.fn()
    
    render(
      <ChatInput
        input=""
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
        isLoading={false}
      />
    )
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should enable button when input has text', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault())
    const mockHandleInputChange = vi.fn()
    
    render(
      <ChatInput
        input="Hello"
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
        isLoading={false}
      />
    )
    
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('should call handleSubmit on form submit', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault())
    const mockHandleInputChange = vi.fn()
    
    render(
      <ChatInput
        input="test"
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
        isLoading={false}
      />
    )
    
    const form = screen.getByRole('button').closest('form')!
    fireEvent.submit(form)
    
    expect(mockHandleSubmit).toHaveBeenCalled()
  })
})

