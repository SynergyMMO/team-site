import { useNavigate } from 'react-router-dom'

const buttonStyle = {
  background: 'linear-gradient(135deg, #5e3370, #9b59b6)',
  color: 'white',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '10px',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginBottom: '20px',
  boxShadow: '0 0 10px rgba(155, 89, 182, 0.6)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  display: 'block',
  marginLeft: 'auto',
  marginRight: 'auto',
}

export default function BackButton({ to, label = '\u2190 Back' }) {
  const navigate = useNavigate()

  // Helper to ensure trailing slash for non-empty URLs
  const withTrailingSlash = (url) => {
    if (!url) return url
    // Only add trailing slash if not present and url is not just a query/hash
    if (typeof url === 'string' && !url.endsWith('/') && !url.startsWith('?') && !url.startsWith('#')) {
      return url + '/'
    }
    return url
  }

  return (
    <button
      style={buttonStyle}
      onClick={() => (to ? navigate(withTrailingSlash(to)) : navigate(-1))}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 0 18px rgba(155, 89, 182, 0.9)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 0 10px rgba(155, 89, 182, 0.6)'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
    >
      {label}
    </button>
  )
}
