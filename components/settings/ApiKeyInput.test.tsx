import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeyInput } from './ApiKeyInput'
import { useStore } from '@/lib/store'

describe('ApiKeyInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      apiKeys: {},
      setApiKey: vi.fn(),
    })
  })

  it('should render with label and placeholder', () => {
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    expect(screen.getByText('Anthropic API Key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
  })

  it('should mask input by default', () => {
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    const input = screen.getByPlaceholderText('sk-ant-...')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should toggle input visibility', async () => {
    const user = userEvent.setup()
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    const input = screen.getByPlaceholderText('sk-ant-...')
    const toggleButton = screen.getByRole('button', { name: /show key|hide key/i })
    
    expect(input).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    
    expect(input).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should update input value on change', async () => {
    const user = userEvent.setup()
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    const input = screen.getByPlaceholderText('sk-ant-...')
    
    await user.type(input, 'sk-ant-test123')
    
    expect(input).toHaveValue('sk-ant-test123')
  })

  it('should save key to store on button click', async () => {
    const user = userEvent.setup()
    const setApiKeySpy = vi.fn()
    useStore.setState({ setApiKey: setApiKeySpy })
    
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    const input = screen.getByPlaceholderText('sk-ant-...')
    const saveButton = screen.getByRole('button', { name: /save/i })
    
    await user.type(input, 'sk-ant-test123')
    await user.click(saveButton)
    
    expect(setApiKeySpy).toHaveBeenCalledWith('anthropic', 'sk-ant-test123')
  })

  it('should load existing key from store', () => {
    useStore.setState({
      apiKeys: { anthropic: 'sk-ant-existing' },
    })
    
    render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    const input = screen.getByPlaceholderText('sk-ant-...')
    expect(input).toHaveValue('sk-ant-existing')
  })

  it('should handle multiple providers', () => {
    useStore.setState({
      apiKeys: {
        anthropic: 'sk-ant-test',
        openai: 'sk-test',
      },
    })
    
    const { unmount } = render(
      <ApiKeyInput 
        provider="anthropic" 
        label="Anthropic API Key" 
        placeholder="sk-ant-..." 
      />
    )
    
    expect(screen.getByPlaceholderText('sk-ant-...')).toHaveValue('sk-ant-test')
    
    unmount()
    
    render(
      <ApiKeyInput 
        provider="openai" 
        label="OpenAI API Key" 
        placeholder="sk-..." 
      />
    )
    
    expect(screen.getByPlaceholderText('sk-...')).toHaveValue('sk-test')
  })
})

