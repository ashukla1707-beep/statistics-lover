import { Component,type ErrorInfo,type ReactNode } from 'react'

type Props={children:ReactNode}
type State={hasError:boolean}

export class AppErrorBoundary extends Component<Props,State>{
  state:State={hasError:false}

  static getDerivedStateFromError():State{
    return{hasError:true}
  }

  componentDidCatch(error:Error,info:ErrorInfo){
    console.error('Unhandled application error',error,info)
  }

  private reload=()=>window.location.reload()

  render(){
    if(!this.state.hasError)return this.props.children
    return <main className="system-error-page" role="alert" aria-live="assertive">
      <div className="system-error-card">
        <span className="eyebrow">Something went wrong</span>
        <h1>We couldn’t display this page.</h1>
        <p>Your data has not been intentionally changed by this error. Reload the app, or return to the home page.</p>
        <div className="system-error-actions">
          <button className="button" type="button" onClick={this.reload}>Reload</button>
          <a className="button button-secondary" href="/">Go home</a>
        </div>
      </div>
    </main>
  }
}
