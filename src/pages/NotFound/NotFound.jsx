import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>404 - Page Not Found</h1>
      <p style={{ color: '#aaa', marginTop: '16px', fontSize: '1.1rem' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 30px',
          borderRadius: '25px',
          background: '#5a2ee0',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '1rem',
          transition: 'all 0.3s ease',
        }}
      >
        Back to Showcase
      </Link>
    </div>
  )
}
