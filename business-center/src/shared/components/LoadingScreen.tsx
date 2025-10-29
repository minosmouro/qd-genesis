import { Crown } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-purple-600 to-brand-purple-800 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8 relative">
          <div className="animate-pulse-glow">
            <Crown className="h-16 w-16 text-brand-gold-400 mx-auto" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Business Center
        </h1>
        
        <p className="text-brand-purple-100 mb-6">
          Carregando plataforma de gestão SaaS...
        </p>
        
        <div className="flex space-x-1 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-brand-gold-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}