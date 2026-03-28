import React from "react"

type State = { hasError: boolean }

export class ErrorBoundary extends React.Component<any, State> {
  constructor(props:any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Application error ⚠️</h1>
            <p className="text-slate-400">Please refresh the page or try again later.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-orange-500 rounded-lg font-bold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
