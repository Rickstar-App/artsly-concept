import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page section-top narrow error-page">
      <p className="eyebrow">404</p>
      <h1 className="page-title">That wall is empty.</h1>
      <p className="lede">
        The page you were looking for isn’t here. It may have been a piece that has since
        sold, or a link that never existed.
      </p>
      <div className="extend-actions">
        <Link href="/discover" className="btn btn-primary">Browse the library</Link>
        <Link href="/" className="btn btn-secondary">Back home</Link>
      </div>
    </div>
  )
}
