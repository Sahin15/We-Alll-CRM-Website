import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    if (import.meta.env.PROD) {
      // In production, you might want to send this to a logging service
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Oops! Something went wrong</Alert.Heading>
            <p>
              We're sorry, but something unexpected happened. This error has been logged
              and we'll look into it.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                <summary>Error Details (Development Only)</summary>
                <div className="mt-2">
                  <strong>Error:</strong> {this.state.error.toString()}
                  <br />
                  <strong>Stack:</strong>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              </details>
            )}
            <hr />
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={this.handleReload}>
                Reload Page
              </Button>
              <Button variant="outline-primary" onClick={this.handleGoHome}>
                Go to Home
              </Button>
            </div>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
