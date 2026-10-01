const platforms = [
  { key: 'instagram_url', name: 'Instagram' },
  { key: 'tiktok_url', name: 'TikTok' },
  { key: 'telegram_url', name: 'Telegram' },
]

function SocialIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {name === 'Instagram' ? <>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </> : name === 'TikTok' ?
      <path d="M14 3h3c.25 2.25 1.65 3.8 4 4.15v3.05a9.3 9.3 0 0 1-4-1.4v7.05A6.15 6.15 0 1 1 11 9.7v3.15a3.05 3.05 0 1 0 3 3.05V3Z" fill="currentColor" /> :
      <path d="m21.3 3.8-3.4 16c-.25 1.13-.94 1.4-1.9.86l-5.16-3.8-2.49 2.4c-.27.27-.49.5-1.01.5l.37-5.25 9.55-8.63c.42-.37-.09-.58-.64-.2L4.82 13.12l-5.08-1.59c-1.1-.35-1.12-1.1.23-1.63L19.83 2.25c.92-.34 1.73.22 1.47 1.55Z" transform="translate(1.4 1) scale(.91)" fill="currentColor" />}
  </svg>
}

export default function SocialLinks({ settings, error, loading, onRetry }) {
  return <div className="footer-socials">
    <div className="footer-social-icons" aria-label="AKEYA on social media">
      {platforms.map(({ key, name }) => settings?.[key]
        ? <a key={key} href={settings[key]} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label={`AKEYA on ${name} (opens in a new tab)`} title={name}><SocialIcon name={name} /></a>
        : <span key={key} className="footer-social-icon is-unconfigured" role="img" aria-label={`${name}: ${loading ? 'loading link' : error ? 'link unavailable' : 'link not added yet'}`} title={`${name} — ${loading ? 'loading' : error ? 'link unavailable' : 'link not added yet'}`}><SocialIcon name={name} /></span>)}
    </div>
    {error && <p className="footer-social-error" role="status">Social links could not be loaded. <button type="button" onClick={onRetry}>Retry</button></p>}
  </div>
}
