'use client'

interface TimelineConnectorProps {
  from: 'thought' | 'plan' | 'task'
  to: 'thought' | 'plan' | 'task'
  variant?: 'solid' | 'dashed'
}

export function TimelineConnector({ from, to, variant = 'solid' }: TimelineConnectorProps) {
  const getColor = (type: string) => {
    switch (type) {
      case 'thought':
        return 'border-blue-500 bg-blue-500'
      case 'plan':
        return 'border-green-500 bg-green-500'
      case 'task':
        return 'border-purple-500 bg-purple-500'
      default:
        return 'border-gray-300 bg-gray-300'
    }
  }

  const borderStyle = variant === 'dashed' ? 'border-dashed' : 'border-solid'

  return (
    <div className="flex items-center justify-center py-2 relative">
      <div
        className={`w-0.5 h-8 ${getColor(from)} ${borderStyle} border-l-2`}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={`w-2 h-2 rounded-full ${getColor(from).split(' ')[1]} opacity-75`} />
      </div>
    </div>
  )
}

