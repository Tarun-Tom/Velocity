import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  theme?: 'light' | 'dark';
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VELOCITY_ERROR_BOUNDARY_CAUGHT]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isLight = this.props.theme === 'light';
      const goldColor = isLight ? '#9A762E' : '#C5A059';
      const textColor = isLight ? '#1E1C19' : '#FDFDFB';
      const subtextColor = isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.60)';
      const bgColor = isLight ? '#FAF7F2' : '#000000';
      const panelBg = isLight ? 'rgba(30, 28, 25, 0.03)' : 'rgba(253, 253, 251, 0.03)';
      const borderIdle = isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.25)';

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isLight ? 'rgba(250, 247, 242, 0.96)' : 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '24px',
            fontFamily: "'JetBrains Mono', monospace",
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              background: bgColor,
              border: `1px solid ${goldColor}`,
              borderRadius: 0,
              padding: '36px 40px',
              boxShadow: isLight
                ? '0 12px 48px rgba(154, 118, 46, 0.15)'
                : '0 16px 56px rgba(197, 160, 89, 0.20)',
            }}
          >
            {/* Architectural corner markers */}
            <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, color: goldColor, opacity: 0.6, pointerEvents: 'none' }}>+</span>
            <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, color: goldColor, opacity: 0.6, pointerEvents: 'none' }}>+</span>
            <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, color: goldColor, opacity: 0.6, pointerEvents: 'none' }}>+</span>
            <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, color: goldColor, opacity: 0.6, pointerEvents: 'none' }}>+</span>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${borderIdle}`,
                paddingBottom: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#D9534F', fontSize: '13px' }}>[!]</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    color: goldColor,
                    textTransform: 'uppercase',
                  }}
                >
                  SYSTEM_CRASH_INTERCEPTED // FAILSAFE_TRIGGERED
                </span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  color: subtextColor,
                }}
              >
                STATUS: 500
              </span>
            </div>

            {/* Diagnostic Details */}
            <div
              style={{
                background: panelBg,
                border: `1px solid ${borderIdle}`,
                padding: '16px 20px',
                marginBottom: '28px',
                fontSize: '11px',
                lineHeight: 1.6,
                color: textColor,
                overflowX: 'auto',
              }}
            >
              <div style={{ color: '#D9534F', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.08em' }}>
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown view render exception'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre
                  style={{
                    margin: 0,
                    fontSize: '10px',
                    color: subtextColor,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            {/* Recovery Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: 'transparent',
                  color: subtextColor,
                  border: `1px solid ${borderIdle}`,
                  borderRadius: 0,
                  padding: '12px 20px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                [ HARD_RELOAD ]
              </button>
              <button
                type="button"
                onClick={this.handleRecover}
                style={{
                  background: goldColor,
                  color: isLight ? '#FAF7F2' : '#000000',
                  border: `1px solid ${goldColor}`,
                  borderRadius: 0,
                  padding: '12px 24px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: `0 0 20px ${isLight ? 'rgba(154, 118, 46, 0.35)' : 'rgba(197, 160, 89, 0.45)'}`,
                }}
              >
                [ RECOVER_TO_LANDING ]
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
