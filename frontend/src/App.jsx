import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const EXAMPLES = [
  'Make the sky a dramatic purple sunset',
  'Convert to vintage oil painting style',
  'Replace background with neon city at night',
  'Make it look like a Studio Ghibli anime scene',
]

export default function App() {
  const [image, setImage]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [prompt, setPrompt]   = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [jobId, setJobId]     = useState(null)
  const [done, setDone]       = useState(false)

  const onDrop = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setImage(f); setPreview(URL.createObjectURL(f))
    setResult(null); setError(null); setDone(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png','.jpg','.jpeg','.webp'] }, maxFiles: 1,
  })

  const reset = () => {
    setPreview(null); setImage(null); setResult(null); setError(null); setDone(false)
  }

  const submit = async () => {
    if (!image || !prompt.trim()) return
    setLoading(true); setError(null); setResult(null); setDone(false)
    try {
      const fd = new FormData()
      fd.append('image', image)
      fd.append('prompt', prompt)
      const r = await axios.post('/api/edit', fd)
      setJobId(r.data.job_id)
      poll(r.data.job_id)
    } catch {
      setError('Server unreachable. Make sure the backend is running.')
      setLoading(false)
    }
  }

  const poll = (id) => {
    const iv = setInterval(async () => {
      try {
        const r = await axios.get('/api/result/' + id)
        if (r.data.status === 'done') {
          clearInterval(iv); setResult(r.data.result_url)
          setLoading(false); setDone(true)
        } else if (r.data.status === 'error') {
          clearInterval(iv); setError(r.data.message || 'Processing failed.')
          setLoading(false)
        }
      } catch { clearInterval(iv); setLoading(false) }
    }, 2000)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:smooth }
        body {
          font-family:'Inter',system-ui,sans-serif;
          background:#07070f; color:#eeeef8;
          min-height:100vh; overflow-x:hidden;
        }
        body::before {
          content:''; position:fixed; top:-30vh; left:-20vw;
          width:70vw; height:70vh;
          background:radial-gradient(ellipse,rgba(124,58,237,.14) 0%,transparent 65%);
          pointer-events:none; z-index:0;
        }
        body::after {
          content:''; position:fixed; bottom:-20vh; right:-15vw;
          width:60vw; height:60vh;
          background:radial-gradient(ellipse,rgba(37,99,235,.1) 0%,transparent 65%);
          pointer-events:none; z-index:0;
        }

        /* Watermark */
        .wm {
          position:fixed; right:18px; top:50%;
          transform:translateY(-50%);
          font-family:'Syne',sans-serif; font-size:11px; font-weight:800;
          letter-spacing:.25em; text-transform:uppercase;
          color:rgba(139,92,246,.18);
          pointer-events:none; user-select:none; z-index:999;
          writing-mode:vertical-rl; text-orientation:mixed;
        }

        .app { position:relative; z-index:1; max-width:980px; margin:0 auto; padding:0 1.5rem 6rem }

        /* Header */
        .hdr { text-align:center; padding:4rem 0 3.5rem }
        .pill {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(124,58,237,.1); border:1px solid rgba(124,58,237,.22);
          border-radius:100px; padding:5px 18px;
          font-size:10px; font-weight:700; letter-spacing:.14em;
          color:#a78bfa; text-transform:uppercase; margin-bottom:1.6rem;
        }
        .dot {
          width:7px; height:7px; background:#7c3aed; border-radius:50%;
          animation:blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
        h1 {
          font-family:'Syne',sans-serif;
          font-size:clamp(2.6rem,6vw,4.2rem);
          font-weight:800; line-height:1.03; letter-spacing:-.03em;
          margin-bottom:1.2rem;
          background:linear-gradient(130deg,#fff 0%,#c4b5fd 40%,#93c5fd 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .sub { font-size:1.05rem; color:#52526e; max-width:440px; margin:0 auto; line-height:1.7 }

        /* Grid */
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem }
        @media(max-width:620px) { .grid { grid-template-columns:1fr } }

        /* Card */
        .card {
          background:#0c0c1a; border:1px solid rgba(255,255,255,.06);
          border-radius:20px; padding:1.75rem;
          position:relative; overflow:hidden; transition:border-color .25s;
        }
        .card::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(145deg,rgba(124,58,237,.04),transparent 55%);
          pointer-events:none;
        }
        .card:hover { border-color:rgba(124,58,237,.2) }
        .clabel {
          font-size:9.5px; font-weight:700; letter-spacing:.18em;
          text-transform:uppercase; color:#6d28d9;
          display:flex; align-items:center; gap:9px; margin-bottom:1.2rem;
        }
        .clabel::before { content:''; width:16px; height:1px; background:#6d28d9; opacity:.4 }

        /* Dropzone */
        .dz {
          border:1.5px dashed rgba(124,58,237,.2); border-radius:13px;
          min-height:215px; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .22s; background:rgba(124,58,237,.02);
          position:relative; overflow:hidden;
        }
        .dz:hover, .dz.on { border-color:#7c3aed; background:rgba(124,58,237,.07) }
        .dz.filled { border-style:solid; border-color:rgba(124,58,237,.3); min-height:auto; padding:6px }
        .dz-inner { display:flex; flex-direction:column; align-items:center; gap:11px; padding:2rem 1rem }
        .icon-box {
          width:56px; height:56px;
          background:rgba(124,58,237,.1); border:1px solid rgba(124,58,237,.18);
          border-radius:15px; display:flex; align-items:center; justify-content:center;
        }
        .icon-box svg { width:23px; height:23px; stroke:#a78bfa; fill:none; stroke-width:1.6 }
        .dz-title { font-size:.88rem; font-weight:600; color:#8888aa }
        .dz-sub { font-size:.73rem; color:#44445a }
        .fmt-tags { display:flex; gap:6px; margin-top:4px }
        .fmt {
          font-size:9px; font-weight:700; letter-spacing:.07em;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
          border-radius:4px; padding:2px 8px; color:#44445a;
        }
        .prev { width:100%; max-height:295px; object-fit:contain; border-radius:9px; display:block }
        .rm-btn {
          margin-top:9px; width:100%; padding:7px;
          background:transparent; border:1px solid rgba(244,63,94,.2);
          border-radius:9px; color:rgba(244,63,94,.55);
          font-size:.77rem; cursor:pointer; transition:all .2s; font-family:inherit;
        }
        .rm-btn:hover { border-color:#f43f5e; color:#f43f5e; background:rgba(244,63,94,.05) }

        /* Prompt */
        .pa { display:flex; flex-direction:column; gap:13px }
        textarea {
          width:100%; background:rgba(255,255,255,.025);
          border:1px solid rgba(255,255,255,.06); border-radius:12px;
          color:#eeeef8; padding:.9rem 1rem;
          font-size:.87rem; font-family:'Inter',sans-serif;
          resize:vertical; line-height:1.7; min-height:115px;
          transition:border-color .2s;
        }
        textarea::placeholder { color:#33334a }
        textarea:focus { outline:none; border-color:rgba(124,58,237,.42); background:rgba(124,58,237,.03) }
        .ex-label {
          font-size:9px; font-weight:700; letter-spacing:.13em;
          text-transform:uppercase; color:#33334a; margin-bottom:7px;
        }
        .chips { display:flex; flex-wrap:wrap; gap:6px }
        .chip {
          font-size:11px; padding:5px 12px;
          background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06);
          border-radius:100px; color:#44445a; cursor:pointer; transition:all .18s;
          font-family:inherit;
        }
        .chip:hover { border-color:rgba(124,58,237,.35); color:#a78bfa; background:rgba(124,58,237,.07) }

        /* Submit */
        .scard {
          background:#0c0c1a; border:1px solid rgba(255,255,255,.06);
          border-radius:20px; padding:1.5rem 1.75rem;
        }
        .btn {
          width:100%; padding:1.05rem;
          background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);
          color:#fff; border:none; border-radius:12px;
          font-size:.95rem; font-weight:600; font-family:'Inter',sans-serif;
          cursor:pointer; position:relative; overflow:hidden;
          transition:opacity .2s, transform .15s; letter-spacing:.02em;
          box-shadow:0 4px 24px rgba(124,58,237,.25);
        }
        .btn::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,.1),transparent);
          pointer-events:none;
        }
        .btn:hover:not(:disabled) { opacity:.91; transform:translateY(-1px); box-shadow:0 6px 30px rgba(124,58,237,.35) }
        .btn:active:not(:disabled) { transform:translateY(0) }
        .btn:disabled { opacity:.28; cursor:not-allowed; box-shadow:none }
        .hint { margin-top:11px; font-size:.75rem; color:#33334a; text-align:center }
        .err {
          margin-top:11px; padding:10px 14px;
          background:rgba(244,63,94,.07); border:1px solid rgba(244,63,94,.18);
          border-radius:9px; color:#f43f5e; font-size:.81rem;
        }

        /* Result */
        .rcard {
          background:#0c0c1a; border:1px solid rgba(124,58,237,.17);
          border-radius:20px; padding:1.75rem; margin-top:1.25rem;
          position:relative; overflow:hidden;
        }
        .rcard::before {
          content:''; position:absolute; top:0; left:0; right:0; height:2px;
          background:linear-gradient(90deg,#7c3aed,#2563eb,#06b6d4);
        }
        .rimg {
          width:100%; max-height:500px; object-fit:contain;
          border-radius:11px; display:block; margin-bottom:1rem;
          border:1px solid rgba(124,58,237,.14);
        }
        .dl {
          display:block; text-align:center; padding:.82rem;
          background:rgba(124,58,237,.1); border:1px solid rgba(124,58,237,.28);
          border-radius:10px; color:#a78bfa; font-weight:600; font-size:.86rem;
          text-decoration:none; transition:all .2s;
        }
        .dl:hover { background:rgba(124,58,237,.18); border-color:rgba(124,58,237,.5) }

        /* Loader */
        .lw { display:flex; flex-direction:column; align-items:center; gap:1.1rem; padding:2.5rem }
        .ring {
          width:46px; height:46px;
          border:3px solid rgba(124,58,237,.12); border-top-color:#7c3aed;
          border-radius:50%; animation:spin .72s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        .lt { color:#44445a; font-size:.84rem; text-align:center }
        .lj { font-size:.69rem; color:rgba(124,58,237,.38); margin-top:3px; font-family:monospace }
        .dots { display:flex; gap:5px; margin-top:6px; justify-content:center }
        .dots span {
          width:5px; height:5px; border-radius:50%; background:#7c3aed;
          opacity:.2; animation:dp 1.4s ease-in-out infinite;
        }
        .dots span:nth-child(2) { animation-delay:.2s }
        .dots span:nth-child(3) { animation-delay:.4s }
        @keyframes dp { 0%,80%,100%{opacity:.15} 40%{opacity:1} }

        /* Success badge */
        .ok {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.2);
          border-radius:100px; padding:4px 12px;
          font-size:11px; font-weight:600; color:#10b981; margin-bottom:1rem;
        }
      `}</style>

      <div className="wm">Pranjal</div>

      <div className="app">
        <header className="hdr">
          <div className="pill"><span className="dot" />AI-Powered Editor</div>
          <h1>Edit photos with<br />Ease</h1>
          <p className="sub">Drop any image, describe what you want changed, and AI transforms it instantly.</p>
        </header>

        <div className="grid">
          {/* Upload */}
          <div className="card">
            <div className="clabel">Step 01 — Upload image</div>
            <div {...getRootProps()} className={`dz${isDragActive ? ' on' : ''}${preview ? ' filled' : ''}`}>
              <input {...getInputProps()} />
              {preview
                ? <img src={preview} alt="preview" className="prev" />
                : <div className="dz-inner">
                    <div className="icon-box">
                      <svg viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="dz-title">{isDragActive ? 'Drop it here!' : 'Drag & drop your image'}</div>
                    <div className="dz-sub">or click to browse files</div>
                    <div className="fmt-tags">
                      {['PNG', 'JPG', 'WEBP'].map(t => <span key={t} className="fmt">{t}</span>)}
                    </div>
                  </div>
              }
            </div>
            {preview && <button className="rm-btn" onClick={reset}>Remove image</button>}
          </div>

          {/* Prompt */}
          <div className="card">
            <div className="clabel">Step 02 — Describe your edit</div>
            <div className="pa">
              <textarea
                placeholder="e.g. make the sky a dramatic purple sunset, convert to oil painting style, remove the background and replace with a beach..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
              />
              <div>
                <div className="ex-label">Try an example</div>
                <div className="chips">
                  {EXAMPLES.map(ex => (
                    <button key={ex} className="chip" onClick={() => setPrompt(ex)}>{ex}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="scard">
          <button className="btn" onClick={submit} disabled={!image || !prompt.trim() || loading}>
            {loading ? 'Processing your image…' : '✦  Edit Photo with AI'}
          </button>
          {!image && !loading && <p className="hint">Upload an image and describe your edit to begin</p>}
          {error && <div className="err">{error}</div>}
        </div>

        {/* Result */}
        {(loading || result) && (
          <div className="rcard">
            <div className="clabel">Step 03 — Result</div>
            {loading && (
              <div className="lw">
                <div className="ring" />
                <div style={{ textAlign: 'center' }}>
                  <div className="lt">AI is transforming your photo</div>
                  {jobId && <div className="lj">job {jobId.slice(0, 8)}…</div>}
                  <div className="dots"><span /><span /><span /></div>
                </div>
              </div>
            )}
            {result && (
              <>
                <div className="ok">✓ Edit complete</div>
                <img src={result} alt="AI result" className="rimg" />
                <a href={result} download="ai-edited.png" className="dl">↓ Download edited image</a>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
