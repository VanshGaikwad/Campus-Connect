import React from 'react'

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <img src="/image/LOGO.png" alt="College logo" className="mx-auto h-12 w-12 object-contain" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The page hit an unexpected error. Please refresh the page and try again.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RouteErrorBoundary
