import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded">
          <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-600">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Please try refreshing the page or contact support.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;