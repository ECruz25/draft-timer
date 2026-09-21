export default function Done(props: { onHome: () => void; onAgain: () => void }) {
  return (
    <main className="screen done">
      <div className="done-emoji" aria-hidden>
        🎉
      </div>
      <h1>Draft complete!</h1>
      <p className="muted">Time to build your decks. Good luck!</p>
      <div className="home-actions">
        <button className="btn primary big" onClick={props.onHome}>
          Home
        </button>
        <button className="btn secondary" onClick={props.onAgain}>
          Draft again
        </button>
      </div>
    </main>
  )
}
