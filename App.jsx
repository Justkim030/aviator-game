import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// Allow localhost fallback for local development only
const DEV_URL = 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || DEV_URL;
const ADMIN_PHONE_UI = import.meta.env.VITE_ADMIN_PHONE || '';

// SECURITY NOTE: Do NOT use VITE_ prefixes for actual secrets.
// These should be fetched from the backend per-round.
const DEFAULT_SERVER_HASH = 'Pending...';
const DEFAULT_CLIENT_SEED = 'Browser_Generated_Seed';

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#05060b',
  panel:      '#12131e',
  sidebar:    '#0d0e18',
  card:       '#181928',
  red:        '#e11d28',
  green:      '#22c55e',
  greenDark:  '#16a34a',
  yellow:     '#f5c518',
  orange:     '#f97316',
  muted:      '#6b7280',
  border:     '#1e2230',
  textDim:    '#9ca3af',
  blue:       '#3b82f6',
  purple:     '#a855f7',
  pink:       '#ec4899',
}

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#e11d28','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#14b8a6','#84cc16','#f43f5e','#8b5cf6','#10b981','#f59e0b','#60a5fa']
const BOT_NAMES = [
  '2***6','2***3','2***4','2***3','2***4','2***9','2***7','2***4',
  '2***0','2***5','2***8','2***1','2***2','2***6','2***9','2***3',
  '1***9','1***4','1***0','1***7','1***2','1***8','1***5','1***3',
  '2***7','2***2','2***0','2***8','2***5','2***1','2***9','2***6',
]
const BOT_CHAT = [
  'Sikua naomba hadi nakuna results zakuja ni genius 🙏🙏🙏',
  '0,7,3,4,1,4,5,5,6 nmetoa leo\n55k sal.........r t q',
  'ogodsGuarantee Winnings Aviator Deals, For timi..ngs and acc..ount mana..gement watsap.....0,1,1,1,2,0,8.....',
  'Uyu mtu amesaidia watu wengi Sana apa kucheza na unamipa ukishinda...is very legit 🙏🙏🙏 nmetoa leo',
  'yako? 0,7,3,4,1,4,5,5,6',
  'Game inakuwa ngumu leo 😤',
  'Nimepata 5x leo asubuhi!',
  'Subiri kidogo itafika 10x',
  'dsrfeGuarantee Winnings Aviator Deals. For timi.ngs and acc.ount mana.gement watsap....0,8,five,0,8,0,9,1........',
  '🍊 This is the real gurr of this play.. helped a lot of people gain profit. Watsap for help 🍊🍊',
  'f o g g 🟢 kuja watsap nkusaidie kurudisha pesa yako imekuliwa 👆',
  'umesh........aaid',
  'Wacha mchezo hii round inabounce kabla 2x 😂',
  'Nimetoa 12k leo asubuhi praise God 🙏',
  '55k sal nmetoa leo pia... ikuje tena',
  'Aviator inakaa nzuri leo lets go 🔥🔥',
  'akuranze dhamhipo after win............aaid',
  'Thank me later............. s l j',
]

function histColor(v) {
  if (v >= 10) return C.pink
  if (v >= 2)  return C.purple
  return C.blue
}

function makeBots(n = 28) {
  const amounts = [100,250,500,663,698,750,876,900,980,1000,1125,1130,1160,1250,1500,1770,2000,2500,3000,3500,4000,5000,6000,8000,10000,12000,20000]
  return Array.from({ length: n }, (_, i) => ({
    id:          Date.now() + i,
    user:        BOT_NAMES[i % BOT_NAMES.length],
    avatar:      AVATAR_COLORS[i % AVATAR_COLORS.length],
    amount:      amounts[Math.floor(Math.random() * amounts.length)],
    cashedOutAt: null,
    win:         0,
  }))
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div 
      role="status"
      aria-live="polite"
      aria-label="Loading application"
      style={{
        position:'fixed', inset:0, background:'#000', zIndex:9999,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:'Arial,sans-serif',
      }}>
      <div style={{ color:'#888', fontSize:10, letterSpacing:4, marginBottom:14, textTransform:'uppercase' }}>
        POWERED BY
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
        <div style={{
          width:36, height:36, borderRadius:'50%', border:'2px solid #fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:900, fontSize:18,
        }}>S</div>
        <span style={{ color:'#fff', fontWeight:900, fontSize:26, letterSpacing:3 }}>SPRIBE</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {[0,1].map(i => (
          <div key={i} style={{
            width:8, height:8, borderRadius:'50%', background:C.red,
            animation:`dot 1.2s ${i*0.3}s infinite ease-in-out`,
          }}/>
        ))}
      </div>
      <style>{`@keyframes dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

// ─── NAV — "Aviator" branding (no Betika references) ─────────────────────────
const NAV_ITEMS = [
  { label:'Home' },
  { label:'Live (88)' },
  { label:'Jackpots' },
  { label:'Quick Bet' },
  { label:'Aviator', active:true },
  { label:'Big Win!', badge:'NEW' },
  { label:'Casino' },
  { label:'Promotions (18)' },
  { label:'Virtuals', badge:'NEW' },
  { label:'Turbo Bet', badge:'NEW' },
  { label:'Crash Games', badge:'NEW' },
  { label:'Live Score' },
  { label:'App' },
]

function AviatorNav({ isLoggedIn, onLogin, onDeposit, onRegister, onLogoClick, isMobile }) {
  return (
    <div style={{ background:'#0d0f18', borderBottom:`1px solid ${C.border}`, flexShrink:0, fontFamily:'Arial,sans-serif' }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', height:44 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16, color:C.textDim, cursor:'pointer' }}>☰</span>
          {/* BRAND: Aviator (not Betika) */}
          <span 
            onClick={onLogoClick}
            style={{ fontWeight:900, fontSize:22, color:C.red, fontStyle:'italic', letterSpacing:-0.5, cursor:'pointer', userSelect:'none' }}
          >✈ Aviator</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* View Fullscreen — functional */}
          <span
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(()=>{})
              } else {
                document.exitFullscreen().catch(()=>{})
              }
            }}
            title="View Fullscreen"
            style={{ color:C.textDim, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
          >⊡ Fullscreen</span>
          <span style={{ color:C.textDim, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>🔍 Search</span>
          <div style={{ width:1, height:18, background:C.border }}/>
          <span style={{ color:C.textDim, fontSize:11, cursor:'pointer' }}>🔔</span>
          <span style={{ color:C.textDim, fontSize:11, cursor:'pointer' }}>My Bets</span>
          <span onClick={onLogin} style={{ color:C.textDim, fontSize:11, cursor:'pointer' }}>
            {isLoggedIn ? 'Profile' : 'Login'}
          </span>
          {!isLoggedIn && (
            <button onClick={onRegister} style={{
              background:C.green, border:'none', color:'#fff',
              padding:'6px 14px', borderRadius:4, fontWeight:900, fontSize:12, cursor:'pointer',
            }}>Register</button>
          )}
          <button onClick={onDeposit} style={{
            background:C.yellow, border:'none', color:'#000',
            padding:'6px 18px', borderRadius:4, fontWeight:900, fontSize:12, cursor:'pointer',
          }}>Deposit</button>
          <span style={{ cursor:'pointer', fontSize:14 }}>☀️</span>
        </div>
      </div>
      {/* Nav strip */}
      <div style={{ display:'flex', overflowX:'auto', padding:'0 6px', borderTop:`1px solid ${C.border}` }} className="hide-scroll">
        {NAV_ITEMS.map((n, i) => (
          <div 
            key={n.label}
            role="button"
            tabIndex={0}
            aria-label={n.label}
            onClick={() => {}}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
              }
            }}
            style={{
              position:'relative', flexShrink:0, padding:'8px 10px',
              fontSize:12, fontWeight: n.active ? 700 : 400,
              color: n.active ? '#fff' : C.textDim,
              borderBottom: n.active ? `2px solid ${C.green}` : '2px solid transparent',
              cursor:'pointer', whiteSpace:'nowrap',
            }}
          >
            {n.label}
            {n.badge && (
              <span style={{
                position:'absolute', top:2, right:0,
                background:C.red, color:'#fff', fontSize:7, fontWeight:800,
                padding:'1px 3px', borderRadius:2, lineHeight:1.4,
              }}>{n.badge}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── GO BACK BAR — "Go Back" navigates history; "View Fullscreen" is functional
function GoBackBar() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'5px 14px', background:'#0d0f18', borderBottom:`1px solid ${C.border}`, flexShrink:0,
    }}>
      {/* Functional Go Back */}
      <span
        onClick={() => window.history.back()}
        style={{ fontSize:12, color:C.textDim, cursor:'pointer' }}
      >← Go Back</span>
      {/* Functional View Fullscreen */}
      <span
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(()=>{})
          } else {
            document.exitFullscreen().catch(()=>{})
          }
        }}
        style={{ fontSize:12, color:C.textDim, cursor:'pointer' }}
      >View Fullscreen ⊡</span>
    </div>
  )
}

// ─── GAME CANVAS ──────────────────────────────────────────────────────────────
function GameCanvas({ phase, multiplierRef, lastUpdateRef, startTime, lowPerf }) {
  const canvasRef   = useRef(null)
  const imgRef      = useRef(null)
  const imgOk       = useRef(false)
  const frozen      = useRef({ tx:0, ty:0, ox:52, oy:0 })
  const crashPlane  = useRef({ x:0, y:0, vx:9, vy:-2, angle:-0.3 })
  const lastFrameTime = useRef(performance.now())
  const pinnedSince = useRef(null)
  const smoothedTy  = useRef(null)
  const frameBuffer = useRef(null) // Offscreen frame buffer
  const fctx        = useRef(null) // Context for frame buffer
  const bgCache     = useRef(null) // Offscreen cache for high-performance rendering

  useEffect(() => {
    const img = new Image()
    img.src = '/assets/plane.png'
    img.onload  = () => { imgRef.current = img; imgOk.current = true }
    img.onerror = () => { imgOk.current = false }
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const updateBuffers = (W, H, dpr) => {
      if (!frameBuffer.current) frameBuffer.current = document.createElement('canvas');
      const fb = frameBuffer.current;
      fb.width = W * dpr;
      fb.height = H * dpr;
      fctx.current = fb.getContext('2d');
      fctx.current.scale(dpr, dpr);
    }

    // GPU-accelerated background caching: Pre-renders static sunburst and gradients
    const updateBgCache = (W, H, dpr) => {
      if (!bgCache.current) bgCache.current = document.createElement('canvas');
      const cache = bgCache.current;
      cache.width = W * dpr;
      cache.height = H * dpr;
      const bctx = cache.getContext('2d');
      bctx.scale(dpr, dpr);

      // Draw Sunburst (Bézier-style rays)
      const sx = W * 0.02, sy = H * 1.08;
      const len = Math.hypot(W * 1.1, H * 1.1) * 2;
      const N = 36, a0 = -Math.PI * 1.08, a1 = -Math.PI * 0.01;
      for (let i = 0; i < N; i++) {
        const a = a0 + (i / N) * (a1 - a0), half = len * 0.075;
        bctx.save(); bctx.translate(sx, sy); bctx.rotate(a);
        bctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.005)';
        bctx.beginPath(); bctx.moveTo(0,0); bctx.lineTo(-half,-len); bctx.lineTo(half,-len); bctx.closePath(); bctx.fill();
        bctx.restore();
      }
      // Draw Spotlight (Deep Radial Gradient)
      const g = bctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W);
      g.addColorStop(0, 'rgba(180, 20, 30, 0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, H);
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const r   = canvas.getBoundingClientRect()
      canvas.width  = r.width  * dpr
      canvas.height = r.height * dpr
      ctx.scale(dpr, dpr)
      updateBuffers(r.width, r.height, dpr);
      updateBgCache(r.width, r.height, dpr);
    }
    window.addEventListener('resize', resize)
    resize()

    // ── Plane: origin = visual tail connection point ─────────────────────────
    // The red trail curve ends at (x,y). We translate there and draw the plane
    // so its TAIL visually starts at (0,0) — seamlessly continuing the line.
    function drawPlane(c, x, y, angle) {
      c.save()
      c.translate(x, y)
      c.rotate(angle)

      if (imgOk.current && imgRef.current) {
        const W = 110, H = 70;
        
        // Connection point: x=3 (near the back edge), y=82% down (the lower part of the tail)
        const tailOffsetX = 3;
        const tailOffsetY = H * 0.82; 
        c.drawImage(imgRef.current, -tailOffsetX, -tailOffsetY, W, H)
      } else {
        // Fallback vector silhouette.
        // Design rule: tail fins touch x=0, nose points right to x≈44*S.
        // The curve stroke ends at origin — tail fins must start at/near x=0.
        const S = 3.2; 
        if (!lowPerf) {
          c.shadowColor = 'rgba(225,29,40,0.6)';
          c.shadowBlur  = 12;
        }
        c.fillStyle   = C.red
        
        // Shift the silhouette so the trail connects to the "belly tail" point (lower part)
        c.translate(-2*S, -6*S)

        // Fuselage — runs from x=2 (tail) to x=44 (nose tip)
        c.beginPath()
        c.moveTo(44*S, 0)          // nose tip
        c.lineTo(2*S,  6*S)        // belly tail
        c.lineTo(8*S,  0)          // waist
        c.lineTo(2*S, -6*S)        // top tail
        c.closePath()
        c.fill()

        // Main wing (mid-body, sweeps back and down)
        c.beginPath()
        c.moveTo(26*S, -1*S)
        c.lineTo(10*S, -18*S)
        c.lineTo(4*S,  -2*S)
        c.closePath()
        c.fill()

        // Upper tail fin — anchored right at origin
        c.beginPath()
        c.moveTo(6*S,  -1*S)
        c.lineTo(0,    -10*S)
        c.lineTo(0,    -3*S)
        c.closePath()
        c.fill()

        // Lower tail fin
        c.beginPath()
        c.moveTo(5*S,   1*S)
        c.lineTo(0,     7*S)
        c.lineTo(2*S,   3*S)
        c.closePath()
        c.fill()

        c.shadowBlur = 0
      }
      c.restore()
    }

    function multToY(m, oy, availH) {
      const p = Math.min(Math.pow(Math.max(m - 1, 0), 0.6) / 4.0, 0.70);
      return Math.max(60, oy - p * availH)
    }

    // Returns the bezier tangent angle at the tip. Uses Quadratic Bézier Curves.
    function drawCurve(c, ox, oy, tx, ty) {
      const cpx = (ox + tx) / 2;
      const cpy = oy; // Keeping control point at start height keeps the curve flat at the beginning

      // 2. Visual: Create a beautiful vertical fading area under the curve
      // This makes the UI feel like the plane is leaving a trail of energy/exhaust
      const grad = c.createLinearGradient(0, ty, 0, oy);
      grad.addColorStop(0, 'rgba(225, 29, 40, 0.42)'); // Stronger red at the trail line
      grad.addColorStop(0.7, 'rgba(225, 29, 40, 0.08)'); // Rapid fade
      grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent at the bottom

      // 3. Draw the filled area (The "Shadow")
      c.beginPath();
      c.moveTo(ox, oy);
      c.quadraticCurveTo(cpx, cpy, tx, ty);
      c.lineTo(tx, oy);
      c.lineTo(ox, oy);
      c.fillStyle = grad;
      c.fill();

      // 4. Draw the main red trail line
      c.beginPath();
      c.moveTo(ox, oy);
      c.quadraticCurveTo(cpx, cpy, tx, ty);
      c.strokeStyle = C.red;
      c.lineWidth = 3.5; 
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.stroke();

      // Calculate the angle of the curve at the plane's position
      return Math.atan2(ty - cpy, tx - cpx);
    }

    const render = () => {
      raf = requestAnimationFrame(render)

      const now = performance.now()
      const dt = (now - lastFrameTime.current) / 1000 // delta in seconds
      lastFrameTime.current = now

      // Standardize logic to 60fps (approx 0.0166s per frame)
      const fpsRatio = dt / (1 / 60)

      const rect = canvas.getBoundingClientRect()
      const W = rect.width, H = rect.height
      if (!W || !H) return

      // Draw frame to offscreen buffer first (Double Buffering)
      c.fillStyle = '#05060b';
      c.fillRect(0, 0, W, H);
      if (bgCache.current) {
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0); 
        c.drawImage(bgCache.current, 0, 0);
        c.restore();
      }

      // topMargin: enough headroom so the plane (drawn upward from tip) never clips the top edge
      // planeH/2 ~28px + angle offset ~20px + safety = 70px minimum
      const topMargin = 90
      const ox = 52, oy = H - 42, availH = oy - topMargin
      const t = Date.now() * 0.001

      // Axes
      c.strokeStyle = 'rgba(255,255,255,0.35)'
      c.lineWidth = 1.5; c.setLineDash([])
      c.beginPath(); c.moveTo(ox-6, oy); c.lineTo(W-8, oy); c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1; c.setLineDash([3,10])
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox, 16); c.stroke()
      c.setLineDash([])
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.beginPath(); c.arc(ox, oy, 3, 0, Math.PI*2); c.fill()

      // ── WAITING / COUNTDOWN ──────────────────────────────────────────────────
      if (phase === 'waiting' || phase === 'countdown') {
        frozen.current      = { tx: ox, ty: oy, ox, oy }
        pinnedSince.current = null
        smoothedTy.current  = null

        // Plane tail sits exactly on the x-axis at origin.
        const taxiX = ox + Math.sin(t * (Math.PI * 2) / 4) * 18
        const taxiAng = Math.sin(t * (Math.PI * 2) / 4) * 0.04 - 0.03
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(taxiX, oy); c.strokeStyle = C.red; c.lineWidth = 3.5; c.lineCap = 'round'; c.stroke()
        c.beginPath(); c.arc(ox, oy, 4, 0, Math.PI * 2); c.fillStyle = C.red; c.fill() // Red dot at origin
        drawPlane(c, taxiX, oy, taxiAng)
        swapBuffers();
        return
      }

      if (phase === 'flying') {
        const elapsed = Math.max(0, Date.now() - startTime)
        const maxX    = W * 0.8
        const rawTx   = ox + elapsed * 0.12;
        const pinned  = rawTx >= maxX
        const tx      = Math.min(rawTx, maxX)
        
        // Lag Compensation: Extrapolate Vertical Multiplier
        const dtUpdate = (now - lastUpdateRef.current) / 1000;
        const predictedMult = multiplierRef.current * Math.exp(0.12 * dtUpdate);

        const rawTy   = multToY(predictedMult, oy, availH)
        if (!smoothedTy.current) smoothedTy.current = oy
        const baseLerp = 0.045
        const lerpSpeed = 1 - Math.pow(1 - baseLerp, fpsRatio)
        smoothedTy.current += (rawTy - smoothedTy.current) * lerpSpeed

        let ty = smoothedTy.current

        // ── When pinned at right edge, gentle vertical drift ─────────────────
        if (pinned) {
          if (!pinnedSince.current) pinnedSince.current = Date.now()
          const pSec = (Date.now() - pinnedSince.current) * 0.001

          if (ty <= topMargin + availH * 0.55) {
            // 5s period — natural breathing rhythm, not too fast, not too slow
            // Amplitude: 8% of available height — visible but calm
            const driftAmp = availH * 0.08
            const driftY   = ty + Math.sin(pSec * (Math.PI * 2) / 5.0) * driftAmp
            smoothedTy.current += (driftY - smoothedTy.current) * 0.03
            ty = smoothedTy.current
          }
        } else {
          pinnedSince.current = null
        }

        // Hard ceiling clamp
        ty = Math.max(topMargin, ty)

        frozen.current     = { tx, ty, ox, oy }
        crashPlane.current = { x: tx, y: ty, vx: 10, vy: -2.5, angle: -0.3 }

        const tangentAngle = drawCurve(c, ox, oy, tx, ty)
        // Plane angle: Refined rotation for aerodynamic flight
        let planeAngle = tangentAngle * 0.6
        planeAngle = Math.max(-0.43, Math.min(0.20, planeAngle))
        const displayMult = predictedMult.toFixed(2) + 'x';
        const fontSize = W < 720 ? 58 : 92;
        c.font = `900 ${fontSize}px "Arial Black", Arial`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        if (!lowPerf) {
          c.shadowColor = 'rgba(0,0,0,0.8)';
          c.shadowBlur = 10;
          c.shadowOffsetY = 2;
        }
        c.save(); // Save context before applying text-specific styles
        // Place text in the middle of the screen slightly up
        c.fillText(displayMult, W / 2, H / 2 - 20);
        c.restore();
        drawPlane(c, tx, ty, planeAngle) // Draw plane after multiplier text for visual layering
        swapBuffers();
        return
      }

      // ── CRASHED ──────────────────────────────────────────────────────────────
      if (phase === 'crashed') {
        const { tx: ftx, ty: fty, ox: fox, oy: foy } = frozen.current
        if (ftx && fty) {
          // Use the same Quadratic logic for the static crashed trail
          const cpx = fox + (ftx - fox) * 0.45;
          const cpy = foy;
          const grad = c.createLinearGradient(ftx, fty, fox, foy);
          grad.addColorStop(0, 'rgba(225, 29, 40, 0.35)'); grad.addColorStop(1, 'rgba(225, 29, 40, 0.01)');
          c.beginPath(); c.moveTo(fox, foy); c.quadraticCurveTo(cpx, cpy, ftx, fty); c.lineTo(ftx, foy); c.closePath(); c.fillStyle = grad; c.fill()
          c.beginPath(); c.moveTo(fox, foy); c.quadraticCurveTo(cpx, cpy, ftx, fty); c.strokeStyle = 'rgba(225,29,40,0.45)'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke()
        }
        const p = crashPlane.current;
        p.x += p.vx * fpsRatio; p.vx *= Math.pow(1.08, fpsRatio); p.y += p.vy * fpsRatio; p.vy -= 0.20 * fpsRatio;
        p.angle = Math.atan2(p.vy, p.vx);
        if (p.x < W + 140) drawPlane(c, p.x, p.y, p.angle);
        swapBuffers();
      }
    }

    const swapBuffers = () => {
      if (!frameBuffer.current || !ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frameBuffer.current, 0, 0);
      ctx.restore();
    }

    render(); // Initial call to start the animation loop
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [phase, startTime, lowPerf]); // Consolidated dependencies

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height:'100%', position:'absolute', inset:0, display:'block' }}
    />
  );
}

// ─── WAITING OVERLAY ──────────────────────────────────────────────────────────
function WaitingOverlay({ phase }) {
  if (phase !== 'waiting' && phase !== 'countdown') return null
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:5, pointerEvents:'none',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:'"Arial Black",Arial,sans-serif',
    }}>
      {/* UFC + Aviator logo row */}
      <div style={{ display:'flex', alignItems:'center', gap:28, marginBottom:20 }}>

        {/* UFC — large, bold, RED italic */}
        <span style={{
          color: C.red,
          fontWeight:900,
          fontSize:72,
          fontStyle:'italic',
          letterSpacing:-3,
          lineHeight:1,
          textShadow:'0 2px 20px rgba(225,29,40,0.4)',
          fontFamily:'"Arial Black",Arial',
        }}>UFC</span>

        {/* Tall white vertical divider */}
        <div style={{ width:2, height:90, background:'rgba(255,255,255,0.55)', borderRadius:1, flexShrink:0 }}/>

        {/* Aviator logo: red plane illustration on top, italic text below */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          {/* Plane illustration — large red plane silhouette */}
          <div style={{
            fontSize:52, lineHeight:1,
            filter:'drop-shadow(0 0 10px rgba(225,29,40,0.7))',
            color: C.red,
            transform:'scaleX(-1) rotate(-8deg)',  // nose pointing right, slight climb angle
          }}>✈</div>
          {/* Aviator text */}
          <span style={{
            color: C.red,
            fontWeight:900,
            fontSize:36,
            fontStyle:'italic',
            letterSpacing:1,
            lineHeight:1,
            textShadow:'0 0 24px rgba(225,29,40,0.6)',
            fontFamily:'"Arial Black",Arial',
          }}>Aviator</span>
        </div>
      </div>

      {/* OFFICIAL PARTNERS */}
      <div style={{
        color:'#fff',
        fontWeight:900,
        fontSize:22,
        letterSpacing:8,
        marginBottom:16,
        textShadow:'0 2px 10px rgba(0,0,0,0.9)',
        fontFamily:'"Arial Black",Arial',
      }}>OFFICIAL PARTNERS</div>

      {/* Progress bar — short, centered, red + dark */}
      <div style={{
        width:200, height:3, borderRadius:2,
        background:'rgba(255,255,255,0.12)',
        marginBottom:24, overflow:'hidden', position:'relative',
      }}>
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width:'55%', background:C.red, borderRadius:2,
          animation:'wProgress 2s ease-in-out infinite',
        }}/>
      </div>

      {/* SPRIBE Official Game badge */}
      <div style={{
        background:'rgba(10,28,10,0.97)',
        border:'1.5px solid #2d5a2d',
        borderRadius:10, padding:'12px 22px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        boxShadow:'0 4px 28px rgba(0,0,0,0.8)',
        minWidth:170,
      }}>
        {/* S icon + SPRIBE */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:30, height:30, borderRadius:'50%',
            border:'2px solid #4caf50',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#4caf50', fontWeight:900, fontSize:15,
            fontFamily:'"Arial Black",Arial',
          }}>$</div>
          <span style={{
            color:'#fff', fontWeight:900, fontSize:18,
            letterSpacing:3, fontFamily:'"Arial Black",Arial',
          }}>SPRIBE</span>
        </div>
        {/* Official Game ✓ pill */}
        <div style={{
          background:'rgba(255,255,255,0.06)',
          border:'1px solid #3a6e3a',
          borderRadius:20, padding:'4px 16px',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ color:'#ccc', fontSize:12, fontWeight:600, fontFamily:'Arial,sans-serif', letterSpacing:0.5 }}>Official Game</span>
          <span style={{ color:'#4caf50', fontSize:15 }}>✓</span>
        </div>
        {/* Since 2019 */}
        <span style={{ color:'#6b7280', fontSize:10, fontFamily:'Arial,sans-serif', letterSpacing:1 }}>Since 2019</span>
      </div>

      <style>{`@keyframes wProgress{0%{width:8%}50%{width:72%}100%{width:8%}}`}</style>
    </div>
  )
}

// ─── GAME SUB-HEADER ──────────────────────────────────────────────────────────
function GameSubHeader({ bal, onSettings, onChat, showChat }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'4px 10px', background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0,
    }}>
      <span style={{ color:C.red, fontWeight:900, fontSize:15, fontStyle:'italic', fontFamily:'"Arial Black",Arial' }}>✈ Aviator</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <AnimBalance value={bal} />
        <span onClick={onSettings} style={{
          color:C.muted, fontSize:18, cursor:'pointer', userSelect:'none',
          lineHeight:1, padding:'2px 4px',
        }}>≡</span>
        <span onClick={onChat} style={{
          color: showChat ? '#fff' : C.muted,
          fontSize:14, cursor:'pointer', userSelect:'none',
          background: showChat ? C.card : 'transparent',
          borderRadius:4, padding:'2px 5px',
        }}>💬</span>
        <span style={{ color:C.muted, fontSize:14, cursor:'pointer', userSelect:'none' }}>⊙</span>
      </div>
    </div>
  )
}

// ─── HISTORY BAR ─────────────────────────────────────────────────────────────
function HistoryBar({ history }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
  }, [history.length])

  return (
    <div
      ref={scrollRef}
      style={{ flex:1, display:'flex', alignItems:'center', gap:5, overflowX:'auto', padding:'0 6px' }}
      className="hide-scroll"
    >
      {history.map((v, i) => (
        <span
          key={`${v}-${i}`}
          style={{
            flexShrink:0, fontSize:10, fontWeight:700, color:histColor(v),
            background:'rgba(255,255,255,0.08)', padding:'2px 9px', borderRadius:10,
            animation: i === 0 ? 'histIn 0.4s ease-out' : 'none',
          }}
        >
          {v.toFixed(2)}x
        </span>
      ))}
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ bets, prevBets, activeTab, onTab, totalCount }) {
  const sortedBets = useMemo(() => [...bets].sort((a,b) => b.amount - a.amount), [bets])
  const sortedPrev = useMemo(() => [...prevBets].sort((a,b) => b.amount - a.amount), [prevBets])
  const topBets = useMemo(() => [...bets].sort((a,b) => (b.win||0)-(a.win||0)), [bets])
  const list = activeTab==='all' ? sortedBets : activeTab==='previous' ? sortedPrev : topBets
  return (
    <aside style={{ width:220, background:C.sidebar, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, fontFamily:'Arial,sans-serif' }}>
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
        {[['all','ALL BETS'],['previous','PREVIOUS'],['top','TOP']].map(([k,lbl]) => (
          <div key={k} onClick={() => onTab(k)} style={{
            flex:1, padding:'9px 4px', textAlign:'center', fontSize:10, fontWeight:800,
            cursor:'pointer', textTransform:'uppercase',
            color:activeTab===k?'#fff':C.muted,
            borderBottom:activeTab===k?`2px solid ${C.yellow}`:'2px solid transparent',
            transition:'color 0.15s',
          }}>{lbl}</div>
        ))}
      </div>
      {activeTab==='all' && (
        <div style={{ padding:'4px 8px 3px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10, color:'#fff', fontWeight:800, letterSpacing:0.5 }}>ALL BETS</div>
          <div style={{ fontSize:10, color:C.textDim }}>{totalCount.toLocaleString()}</div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 1fr 32px 1fr', padding:'3px 6px', fontSize:9, color:C.muted, fontWeight:700, borderBottom:`1px solid ${C.border}`, gap:2 }}>
        <span/><span>Player</span><span style={{textAlign:'right'}}>Bet KES</span><span style={{textAlign:'center'}}>@</span><span style={{textAlign:'right'}}>Win KES</span>
      </div>
      <div style={{ flex:1, overflowY:'auto' }} className="hide-scroll">
        {list.map(b => {
          const cashed = b.cashedOutAt !== null
          return (
            <div key={b.id} style={{
              display:'grid', gridTemplateColumns:'28px 1fr 1fr 32px 1fr',
              alignItems:'center', padding:'5px 6px', gap:2,
              background: cashed ? 'rgba(34,197,94,0.13)' : 'transparent',
              borderBottom:`1px solid rgba(255,255,255,0.028)`,
              fontSize:10, transition:'background 0.3s',
            }}>
              <div style={{
                width:26, height:26, borderRadius:'50%', background:b.avatar,
                border: cashed ? `2px solid ${C.green}` : '1.5px solid rgba(255,255,255,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontSize:10, fontWeight:900, flexShrink:0,
              }}>
                {b.user[0]}
              </div>
              <span style={{ color:cashed?C.green:C.textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:9 }}>{b.user}</span>
              <span style={{ textAlign:'right', fontWeight:600, color:'#fff', fontSize:9 }}>{b.amount.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
              <span style={{ textAlign:'center', color:cashed?C.green:C.muted, fontSize:8 }}>{cashed?`${b.cashedOutAt.toFixed(2)}x`:''}</span>
              <span style={{ textAlign:'right', fontWeight:700, color:cashed?C.green:C.muted, fontSize:9 }}>{cashed?(b.amount*b.cashedOutAt).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ─── CHAT PANEL ──────────────────────────────────────────────────────────────
function ChatPanel({ messages, onClose }) {
  const bottomRef = useRef(null)
  const [input, setInput] = useState('')
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages.length])

  const fmtTime = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  }

  return (
    <div style={{ width:230, background:C.sidebar, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', fontFamily:'Arial,sans-serif', flexShrink:0 }}>
      <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'#fff', letterSpacing:0.5 }}>Chat</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.muted, fontSize:13, cursor:'pointer' }}>ℹ️</span>
          <span onClick={onClose} style={{ cursor:'pointer', color:C.muted, fontSize:20, lineHeight:1 }}>×</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 6px', display:'flex', flexDirection:'column', gap:8 }} className="hide-scroll">
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:7, alignItems:'flex-start' }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', flexShrink:0,
              background: AVATAR_COLORS[i % AVATAR_COLORS.length],
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontSize:11, fontWeight:900,
              border:'1.5px solid rgba(255,255,255,0.15)',
            }}>
              {m.user[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                <span style={{ fontSize:10, color:C.green, fontWeight:700 }}>{m.user}</span>
                <span style={{ fontSize:8, color:C.muted, flexShrink:0, marginLeft:4 }}>{m.time || fmtTime()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4 }}>
                <div style={{ fontSize:11, color:C.textDim, lineHeight:1.4, wordBreak:'break-word', flex:1 }}>{m.text}</div>
                <span style={{ color:C.muted, fontSize:12, cursor:'pointer', flexShrink:0, marginTop:1, lineHeight:1 }}>❤️</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:'6px 8px', borderTop:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)' }}>
        <div style={{ background:'#1e293b', borderRadius:6, padding:'6px 14px', color:'#fff', fontSize:11, textAlign:'center', marginBottom:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          New messages <span style={{ background:'#374151', borderRadius:4, padding:'1px 6px', fontSize:10 }}>▼</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 6px', gap:4 }}>
          <span style={{ flexShrink:0, fontSize:14, cursor:'pointer' }}>😊</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Your message..."
            style={{ flex:1, background:'none', border:'none', color:'#fff', fontSize:11, outline:'none', minWidth:0 }}
            onKeyDown={e => e.stopPropagation()}
          />
          <span style={{ color:C.muted, fontSize:9, flexShrink:0 }}>AA 160</span>
          <span style={{ flexShrink:0, color:'#60a5fa', fontSize:14, cursor:'pointer' }}>➤</span>
        </div>
      </div>
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onBack, onRegisterRedirect }) {
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [keep,     setKeep]     = useState(true)
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    const rawPhone = phone.trim();
    const pw = password.trim();

    // Sanitize phone number - remove all non-digit characters except leading +
    const p = rawPhone.replace(/[^\d+]/g, '');

    if (!p || p.length < 9 || p.length > 15 || !/^\+?\d+$/.test(p)) {
      setError('Enter a valid phone number'); return;
    }
    if (!pw || pw.length > 128) {
      setError('Invalid password length'); return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p, password: pw })
      });

      if (response.status === 429) {
        setError('Too many login attempts. Please try again in 15 minutes.');
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || `Login failed (${response.status})`);
        return;
      }

      const data = await response.json();
      if (data.status) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0f1623', fontFamily:'Arial,sans-serif', color:'#fff' }}>
      <div style={{ background:'#0d0f18', borderBottom:`1px solid #1e2230`, padding:'0 16px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16, color:'#6b7280', cursor:'pointer' }}>☰</span>
          {/* Brand: Aviator */}
          <span style={{ fontWeight:900, fontSize:22, color:C.red, fontStyle:'italic' }}>✈ Aviator</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:12 }}>
          <span style={{ color:'#fff', fontWeight:700, cursor:'pointer' }}>Login</span>
          <button onClick={onRegisterRedirect} style={{ background:'#16a34a', border:'none', color:'#fff', padding:'6px 16px', borderRadius:4, fontWeight:900, fontSize:12, cursor:'pointer' }}>Register</button>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 0', borderBottom:`1px solid #1e2230`, position:'relative' }}>
        <span onClick={onBack} style={{ position:'absolute', left:16, cursor:'pointer', fontSize:18, color:'#fff' }}>‹</span>
        <span style={{ fontSize:15, fontWeight:700 }}>Login</span>
      </div>
      <div style={{ maxWidth:500, margin:'32px auto', padding:'0 20px' }}>
        <div style={{ marginBottom:28 }}>
          <span style={{ fontWeight:900, fontSize:28, color:C.red, fontStyle:'italic' }}>✈ Aviator</span>
        </div>
        <p style={{ color:'#9ca3af', fontSize:13, marginBottom:24, lineHeight:1.5 }}>
          Enter your phone number and password below to login to your account.
          Otherwise click Register with the same details to create a new account.
        </p>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Phone Number</div>
          <input
            maxLength={15}
            type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            placeholder="e.g. 0712 234567"
            style={{ width:'100%', background:'#1a2035', border:`1px solid #2a3050`, color:'#fff', padding:'12px 14px', borderRadius:6, fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
          <div style={{ color:'#6b7280', fontSize:11, marginTop:4 }}>Enter your phone number</div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Password</span>
            <span style={{ color:'#22c55e', fontSize:12, cursor:'pointer' }}>Forgot Your Password?</span>
          </div>
          <div style={{ position:'relative' }}>
            <input
              maxLength={128}
              type={showPw ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)}
              style={{ width:'100%', background:'#1a2035', border:`1px solid #2a3050`, color:'#fff', padding:'12px 40px 12px 14px', borderRadius:6, fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
            <span onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'#6b7280', fontSize:14 }}>
              {showPw ? '🙈' : '👁'}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, cursor:'pointer' }} onClick={()=>setKeep(p=>!p)}>
          <div style={{ width:20, height:20, borderRadius:4, background: keep ? '#22c55e' : '#1a2035', border:`1px solid ${keep?'#22c55e':'#2a3050'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {keep && <span style={{ color:'#fff', fontSize:12, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:13 }}>Keep me logged in</span>
        </div>
        {error && <div style={{ color:'#ef4444', fontSize:12, marginBottom:12, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:6 }}>{error}</div>}
        <button onClick={handleLogin} style={{ width:'100%', background:'#22c55e', border:'none', color:'#fff', padding:'14px', borderRadius:6, fontWeight:900, fontSize:15, cursor:'pointer', marginBottom:16 }}>
          Login
        </button>
        <div style={{ textAlign:'center', fontSize:13, color:'#9ca3af', marginBottom:24 }}>
          Don't have an account? <span onClick={onRegisterRedirect} style={{ color:'#22c55e', cursor:'pointer', fontWeight:700 }}>Register here</span>
        </div>
        <div style={{ textAlign:'center', fontSize:13, color:'#9ca3af' }}>
          🇰🇪 Kenya
        </div>
      </div>
    </div>
  )
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
function RegisterPage({ onRegister, onBack, onLoginRedirect }) {
  const [phone,     setPhone]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [referral,  setReferral]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showCfm,   setShowCfm]   = useState(false)
  const [agree,     setAgree]     = useState(false)
  const [over18,    setOver18]    = useState(false)
  const [error,     setError]     = useState('')

  const handleRegister = async () => {
    const rawPhone = phone.trim();
    const pw = password.trim();

    // Sanitize phone number - remove all non-digit characters except leading +
    const p = rawPhone.replace(/[^\d+]/g, '');

    if (!p || p.length < 10 || p.length > 15 || !/^\+?\d+$/.test(p)) { setError('Enter a valid phone number'); return }
    if (!pw || pw.length < 6 || pw.length > 128) { setError('Password must be between 6 and 128 characters'); return }
    if (pw !== confirm)             { setError('Passwords do not match'); return }
    if (!agree)                     { setError('You must agree to the Terms & Conditions'); return }
    if (!over18)                    { setError('You must confirm you are 18 years or older'); return }

    setError('')

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p, password: pw })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || `Registration failed (${response.status})`);
        return;
      }

      const data = await response.json();
      if (data.status) {
        // Auto-login after registration
        const loginRes = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: p, password: pw })
        });

        if (loginRes.status === 429) {
          setError('Registration successful, but too many login attempts. Please wait 15 minutes.');
          return;
        }

        if (!loginRes.ok) {
          const errData = await loginRes.json().catch(() => ({}));
          setError(errData.message || `Auto-login failed (${loginRes.status})`);
          return;
        }

        const loginData = await loginRes.json();
        if (loginData.status) onRegister(loginData.user);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    }
  }

  const inputStyle = {
    width:'100%', background:'#1a2035', border:`1px solid #2a3050`,
    color:'#fff', padding:'12px 14px', borderRadius:6, fontSize:14,
    outline:'none', boxSizing:'border-box',
  }
  const labelStyle = { fontWeight:700, fontSize:13, marginBottom:6, display:'block' }
  const hintStyle  = { color:'#6b7280', fontSize:11, marginTop:4 }

  return (
    <div style={{ minHeight:'100dvh', background:'#0f1623', fontFamily:'Arial,sans-serif', color:'#fff', overflowY:'auto' }}>
      {/* Nav */}
      <div style={{ background:'#0d0f18', borderBottom:`1px solid #1e2230`, padding:'0 16px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16, color:'#6b7280' }}>☰</span>
          <span style={{ fontWeight:900, fontSize:22, color:C.red, fontStyle:'italic' }}>✈ Aviator</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:12 }}>
          <span onClick={onLoginRedirect} style={{ color:'#fff', fontWeight:700, cursor:'pointer' }}>Login</span>
          <span style={{ background:'#16a34a', color:'#fff', padding:'6px 16px', borderRadius:4, fontWeight:900, fontSize:12 }}>Register</span>
        </div>
      </div>

      {/* Back + title */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 0', borderBottom:`1px solid #1e2230`, position:'relative' }}>
        <span onClick={onBack} style={{ position:'absolute', left:16, cursor:'pointer', fontSize:18, color:'#fff' }}>‹</span>
        <span style={{ fontSize:15, fontWeight:700 }}>Create Account</span>
      </div>

      {/* Form */}
      <div style={{ maxWidth:500, margin:'28px auto', padding:'0 20px 40px' }}>
        {/* Brand */}
        <div style={{ marginBottom:20 }}>
          <span style={{ fontWeight:900, fontSize:28, color:C.red, fontStyle:'italic' }}>✈ Aviator</span>
        </div>
        <p style={{ color:'#9ca3af', fontSize:13, marginBottom:24, lineHeight:1.6 }}>
          Create your free account to start playing. Already have an account?{' '}
          <span onClick={onLoginRedirect} style={{ color:C.green, cursor:'pointer', fontWeight:700 }}>Login here</span>
        </p>

        {/* Phone */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Phone Number</label>
          <input maxLength={15} type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            placeholder="e.g. 0712 234567" style={inputStyle}/>
          <div style={hintStyle}>Must be a valid Kenyan phone number</div>
        </div>

        {/* Password */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Password</label>
          <div style={{ position:'relative' }}>
            <input maxLength={128} type={showPw?'text':'password'} value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={{...inputStyle, paddingRight:44}}/>
            <span onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'#6b7280', fontSize:14 }}>
              {showPw?'🙈':'👁'}
            </span>
          </div>
          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop:6 }}>
              <div style={{ height:4, borderRadius:2, background:'#1e2230', overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:2,
                  width: password.length < 6 ? '25%' : password.length < 10 ? '55%' : '90%',
                  background: password.length < 6 ? C.red : password.length < 10 ? C.yellow : C.green,
                  transition:'width 0.3s, background 0.3s',
                }}/>
              </div>
              <div style={{ fontSize:10, color: password.length < 6 ? C.red : password.length < 10 ? C.yellow : C.green, marginTop:3 }}>
                {password.length < 6 ? 'Weak' : password.length < 10 ? 'Medium' : 'Strong'}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={{ position:'relative' }}>
            <input maxLength={128} type={showCfm?'text':'password'} value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              style={{
                ...inputStyle, paddingRight:44,
                border: confirm && confirm !== password ? '1px solid #ef4444' : `1px solid #2a3050`,
              }}/>
            <span onClick={()=>setShowCfm(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'#6b7280', fontSize:14 }}>
              {showCfm?'🙈':'👁'}
            </span>
          </div>
          {confirm && confirm !== password && (
            <div style={{ color:'#ef4444', fontSize:11, marginTop:4 }}>Passwords do not match</div>
          )}
        </div>

        {/* Referral code (optional) */}
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>
            Referral Code <span style={{ color:C.muted, fontWeight:400, fontSize:11 }}>(optional)</span>
          </label>
          <input maxLength={20} type="text" value={referral} onChange={e=>setReferral(e.target.value)}
            placeholder="Enter referral code if you have one"
            style={inputStyle}/>
        </div>

        {/* Terms checkbox */}
        <div onClick={()=>setAgree(p=>!p)} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12, cursor:'pointer' }}>
          <div style={{
            width:20, height:20, borderRadius:4, flexShrink:0, marginTop:1,
            background: agree ? C.green : '#1a2035',
            border:`1px solid ${agree ? C.green : '#2a3050'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {agree && <span style={{ color:'#fff', fontSize:12, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:12, color:'#9ca3af', lineHeight:1.5 }}>
            I agree to the{' '}
            <span style={{ color:C.green }}>Terms & Conditions</span>
            {' '}and{' '}
            <span style={{ color:C.green }}>Privacy Policy</span>
          </span>
        </div>

        {/* 18+ checkbox */}
        <div onClick={()=>setOver18(p=>!p)} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:22, cursor:'pointer' }}>
          <div style={{
            width:20, height:20, borderRadius:4, flexShrink:0, marginTop:1,
            background: over18 ? C.green : '#1a2035',
            border:`1px solid ${over18 ? C.green : '#2a3050'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {over18 && <span style={{ color:'#fff', fontSize:12, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:12, color:'#9ca3af', lineHeight:1.5 }}>
            I confirm I am <span style={{ color:'#fff', fontWeight:700 }}>18 years or older</span> and I understand gambling may have adverse effects if not done with moderation.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ color:'#ef4444', fontSize:12, marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.1)', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)' }}>
            ⚠ {error}
          </div>
        )}

        {/* Register button */}
        <button onClick={handleRegister} style={{
          width:'100%', background:C.green, border:'none', color:'#fff',
          padding:'14px', borderRadius:6, fontWeight:900, fontSize:15,
          cursor:'pointer', marginBottom:16, transition:'filter 0.15s',
        }}>
          Create Account
        </button>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'#1e2230' }}/>
          <span style={{ color:C.muted, fontSize:12 }}>or</span>
          <div style={{ flex:1, height:1, background:'#1e2230' }}/>
        </div>

        {/* Already have account */}
        <button onClick={onLoginRedirect} style={{
          width:'100%', background:'transparent', border:`1px solid #2a3050`,
          color:'#fff', padding:'13px', borderRadius:6, fontWeight:700,
          fontSize:14, cursor:'pointer', marginBottom:20,
        }}>
          Login to Existing Account
        </button>

        <div style={{ textAlign:'center', fontSize:13, color:'#9ca3af' }}>🇰🇪 Kenya</div>
      </div>
    </div>
  )
}


// Minimum deposit is KES 50 (not 99)
function DepositModal({ onClose, isLoggedIn, onLoginRedirect, onDeposit }) {
  const [amt, setAmt] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    const n = parseFloat(amt)
    const rawPhone = phone.trim();

    // Sanitize phone number
    const p = rawPhone.replace(/[^\d+]/g, '');

    if (!amt || isNaN(n) || n < 10 || n > 500000) {
      setErr('Enter an amount between 10 and 500,000')
      return
    }
    if (!p || p.length < 10 || p.length > 15 || !/^\+?\d+$/.test(p)) {
      setErr('Enter a valid phone number')
      return
    }

    setErr('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: n,
          phone: p
        })
      });

      if (response.status === 429) {
        setErr('Too many requests. Please try again later.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setErr(errData.message || `Payment failed (${response.status})`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.status) {
        alert('STK Push sent! Please check your phone.');
        onClose();
      } else {
        setErr(data.message || 'Payment failed to initiate');
      }
    } catch (e) {
      setErr('Connection error. Is the server running?');
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1b2e', borderRadius:12, padding:28, width:360, maxWidth:'92vw', fontFamily:'Arial,sans-serif', border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <span style={{ fontWeight:900, fontSize:18, color:'#fff' }}>Login Required</span>
            <span onClick={onClose} style={{ cursor:'pointer', color:C.muted, fontSize:24 }}>×</span>
          </div>
          <p style={{ color:C.textDim, fontSize:13, marginBottom:24, margin:'0 0 24px' }}>You need to be logged in to make a deposit.</p>
          <button onClick={onLoginRedirect} style={{ width:'100%', background:C.greenDark, border:'none', color:'#fff', padding:13, borderRadius:8, fontWeight:900, fontSize:14, cursor:'pointer', marginBottom:10 }}>
            LOGIN / REGISTER
          </button>
          <button onClick={onClose} style={{ width:'100%', background:'transparent', border:`1px solid ${C.border}`, color:C.textDim, padding:10, borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1b2e', borderRadius:12, padding:'22px 24px', width:380, maxWidth:'93vw', fontFamily:'Arial,sans-serif', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontWeight:900, fontSize:18, color:'#fff' }}>Deposit</span>
          <span onClick={onClose} style={{ cursor:'pointer', color:C.muted, fontSize:24, lineHeight:1 }}>×</span>
        </div>
        <p style={{ color:C.textDim, fontSize:12, margin:'0 0 14px' }}>Send money into your Aviator account</p>
        <div style={{ display:'flex', gap:16, marginBottom:14, padding:'0 4px' }}>
          {[100,200,500,1000].map(v => (
            <span key={v} onClick={() => { setAmt(String(v)); setErr('') }} style={{
              flex:1, color: String(amt)===String(v) ? C.green : C.textDim,
              fontSize:13, cursor:'pointer', fontWeight: String(amt)===String(v) ? 800 : 500,
              textAlign:'center', padding:'2px 0',
              borderBottom: String(amt)===String(v) ? `2px solid ${C.green}` : '2px solid transparent',
            }}>+{v}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <input
            maxLength={15}
            type="tel"
            placeholder="Phone (e.g. 254712345678)"
            value={phone}
            onChange={e => { setPhone(e.target.value); setErr('') }}
            style={{
              width: '100%', background: 'transparent', border: `1px solid ${C.border}`,
              color: '#fff', padding: '14px 14px', borderRadius: 6,
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <input
            max={500000}
            type="number"
            placeholder="Amount (min KES 10)"
            value={amt}
            onChange={e => { setAmt(e.target.value); setErr('') }}
            style={{
              width: '100%', background: 'transparent', border: `1px solid ${C.border}`,
              color:'#fff', padding:'14px 14px', borderRadius:6,
              fontSize:14, outline:'none', boxSizing:'border-box',
            }}
          />
        </div>

        {err && <div style={{ color:'#ef4444', fontSize:11, marginBottom:8 }}>{err}</div>}
        <div style={{ color:C.muted, fontSize:10, marginBottom:18 }}>Minimum KES 10. All transactions are subject to 5% tax.</div>
        <button onClick={handlePay} disabled={loading} style={{ width:'100%', background:C.greenDark, border:'none', color:'#fff', padding:'13px 0', borderRadius:8, fontWeight:900, fontSize:14, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>M</div>
          {loading ? 'PROCESSING...' : 'Pay with M-Pesa'}
        </button>
        <button style={{ width:'100%', background:'#d81b7a', border:'none', color:'#fff', padding:'13px 0', borderRadius:8, fontWeight:900, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>C</div>
          Pay with Cashia
        </button>
      </div>
    </div>
  )
}

// ─── SETTINGS MENU ────────────────────────────────────────────────────────────
function SettingsMenu({ onClose, onFairness, username, lowPerf, setLowPerf }) {
  const [sound, setSound] = useState(true)
  const [music, setMusic] = useState(false)
  const [anim,  setAnim]  = useState(true)
  const Toggle = ({val,set}) => (
    <div onClick={()=>set(p=>!p)} style={{ width:32, height:18, borderRadius:9, background:val?C.green:'#374151', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:2, left:val?16:2, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
    </div>
  )
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:150 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:44, right:8, background:'#1a1b2e', border:`1px solid ${C.border}`, borderRadius:10, padding:14, width:225, fontFamily:'Arial,sans-serif', boxShadow:'0 8px 32px rgba(0,0,0,0.6)', zIndex:151 }}>
        {username && <div style={{ fontWeight:700, fontSize:11, color:'#fff', marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>{username}</div>}
        {[
          ['🔊 Sound', sound, setSound],
          ['🎵 Music', music, setMusic],
          ['✨ Animation', anim, setAnim],
          ['⚡ Low Performance', lowPerf, setLowPerf]
        ].map(([lbl,val,set]) => (
          <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:'#fff' }}>{lbl}</span>
            <Toggle val={val} set={set}/>
          </div>
        ))}
        <div style={{ marginTop:6 }}>
          {['Free Bets','My Bet History','Game Limits','How To Play','Game Notes'].map(item => (
            <div key={item} style={{ padding:'9px 0', fontSize:12, color:C.textDim, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>{item}</div>
          ))}
          <div onClick={onFairness} style={{ padding:'9px 0', fontSize:12, color:C.yellow, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>Provably Fair Settings</div>
          <div style={{ padding:'9px 0', fontSize:12, color:C.textDim, cursor:'pointer' }}>Game Room: Room #1</div>
        </div>
      </div>
    </div>
  )
}

// ─── PROVABLY FAIR ────────────────────────────────────────────────────────────
function FairnessModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1b2e', padding:22, borderRadius:12, width:'90%', maxWidth:460, border:`1px solid ${C.border}`, fontFamily:'monospace', fontSize:11 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, color:C.yellow, fontSize:14 }}>🛡️ PROVABLY FAIR</h3>
          <span onClick={onClose} style={{ cursor:'pointer', color:C.muted, fontSize:20 }}>×</span>
        </div>
        <p style={{ color:C.textDim, fontSize:12, marginBottom:16 }}>The result for this round was generated using a server seed, a client seed, and a nonce.</p>
        {[['Server Seed (Hashed)', DEFAULT_SERVER_HASH],['Client Seed', DEFAULT_CLIENT_SEED],['Nonce','15']].map(([k,v]) => (
          <div key={k} style={{ background:'#000', padding:10, borderRadius:6, marginBottom:8, wordBreak:'break-all' }}>
            <div style={{ color:C.muted, fontSize:10, marginBottom:4 }}>{k}</div>
            <div style={{ color:'#fff' }}>{v}</div>
          </div>
        ))}
        <button onClick={onClose} style={{ width:'100%', background:C.red, border:'none', color:'#fff', padding:12, marginTop:12, borderRadius:8, fontWeight:800, cursor:'pointer', fontSize:13 }}>CLOSE</button>
      </div>
    </div>
  )
}

// ─── ERROR BAR ────────────────────────────────────────────────────────────────
function ErrorBar({ message, onDismiss }) {
  if (!message) return null
  return (
    <div style={{
      position:'absolute', top:0, left:0, right:0, zIndex:30,
      background:'rgba(127,29,29,0.97)', border:`1px solid #991b1b`,
      color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:600,
      display:'flex', justifyContent:'space-between', alignItems:'center',
      boxShadow:'0 2px 12px rgba(0,0,0,0.5)',
      animation:'errIn 0.2s ease-out',
    }}>
      <span>⚠ {message}</span>
      <span onClick={onDismiss} style={{ cursor:'pointer', fontSize:16, color:'rgba(255,255,255,0.7)', marginLeft:12 }}>×</span>
    </div>
  )
}

// ─── WIN TOAST ────────────────────────────────────────────────────────────────
// ─── ANIMATED BALANCE ─────────────────────────────────────────────────────────
function AnimBalance({ value }) {
  const [disp, setDisp] = useState(value)
  const prev = useRef(value), raf = useRef()
  useEffect(() => {
    const from = prev.current, to = value, dur = 450; let t0
    const tick = now => {
      if (!t0) t0 = now
      const p = Math.min((now-t0)/dur, 1)
      setDisp(from+(to-from)*p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else { setDisp(to); prev.current = to }
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <span style={{ color:'#fff', fontWeight:800, fontSize:12, minWidth:100, textAlign:'right', fontFamily:'Arial,sans-serif' }}>{disp.toFixed(2)} KES</span>
}

// ─── BET PANEL ────────────────────────────────────────────────────────────────
// FIX: Amount input is fully editable (no hardcoded floor forcing 10 only)
// FIX: Removed the green empty card — only one BetPanel is used in the layout
function BetPanel({ slot, phase, currentMult, onAction, showClose, onClose }) {
  const [amount,    setAmount]    = useState(10.00)
  const [isAuto,    setIsAuto]    = useState(false)
  const [autoBet,   setAutoBet]   = useState(false)
  const [acEnabled, setAcEnabled] = useState(false)
  const [autoAt,    setAutoAt]    = useState(2.00)

  const isQueued = slot.status === 'queued'
  const isActive = slot.status === 'active'
  const inputDis = isQueued || isActive

  let btnLabel  = 'Bet'
  let btnAmount = `${amount.toFixed(2)} KES`
  let btnBg     = C.green
  let action    = 'bet'
  let btnDis    = false
  let isCashout = false

  if (phase === 'flying' && isQueued)        { btnLabel = 'Waiting'; btnAmount = 'next round'; btnBg = '#2a2d3e'; action = 'none'; btnDis = true }
  else if (isActive && phase === 'flying')   { btnLabel = 'Cash Out'; btnAmount = `${(slot.amount*currentMult).toFixed(2)} KES`; btnBg = C.orange; action = 'cashout'; isCashout = true }
  else if (isQueued && phase !== 'flying')   { btnLabel = 'Cancel'; btnAmount = null; btnBg = C.red; action = 'cancel' }

  const handleClick = () => {
    if (action === 'none') return
    onAction(slot.id, action, amount, { autoCashout: acEnabled ? autoAt : null, autoBet })
  }

  // Amount is fully editable — allow any value the user types
  const handleAmountChange = (val) => {
    const n = Math.min(1000000, parseFloat(val))
    if (!isNaN(n)) setAmount(Math.max(0, n))
    else if (val === '' || val === '-') setAmount(0)
  }

  const adjustAmount = (delta) => {
    setAmount(prev => Math.max(0, Math.round((prev + delta) * 100) / 100))
  }

  return (
    <div style={{ flex:1, minWidth:0, background:'#151624', borderRadius:8, border:`1px solid ${C.border}`, padding:'10px 10px 8px', display:'flex', flexDirection:'column', gap:6, fontFamily:'Arial,sans-serif', position:'relative', overflow:'hidden' }}>
      {/* Close button for second panel */}
      {showClose && (
        <span onClick={onClose} style={{
          position:'absolute', top:6, right:8,
          color:C.muted, fontSize:16, cursor:'pointer',
          userSelect:'none', lineHeight:1, zIndex:2,
        }}>×</span>
      )}

      {/* Bet / Auto plain text tabs — exactly as in screenshot */}
      <div style={{ display:'flex', alignItems:'center', gap:0, borderBottom:`1px solid ${C.border}`, paddingBottom:6 }}>
        {['Bet','Auto'].map((t, i) => (
          <span key={t} onClick={()=>setIsAuto(t==='Auto')} style={{
            fontSize:12, fontWeight:700, cursor:'pointer',
            padding:'2px 14px 4px',
            color: (isAuto ? t==='Auto' : t==='Bet') ? '#fff' : C.muted,
            borderBottom: (isAuto ? t==='Auto' : t==='Bet') ? `2px solid ${C.yellow}` : '2px solid transparent',
            marginBottom:'-7px',
            transition:'color 0.15s',
          }}>{t}</span>
        ))}
      </div>

      {/* Row: compact stepper LEFT + big Bet button RIGHT */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* − value + stepper */}
        <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
          <button
            disabled={inputDis}
            onClick={() => adjustAmount(-10)}
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`,
              color: inputDis ? C.muted : '#fff',
              cursor: inputDis ? 'not-allowed' : 'pointer',
              fontSize:20, fontWeight:300, lineHeight:1,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}
          >−</button>
          <input
            type="number"
            disabled={inputDis}
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
            onBlur={e => { const n = parseFloat(e.target.value); if (isNaN(n) || n < 1) setAmount(1) }}
            style={{
              width:58, background:'none', border:'none',
              color: inputDis ? C.muted : '#fff',
              textAlign:'center', fontWeight:800, fontSize:14, outline:'none',
            }}
          />
          <button
            disabled={inputDis}
            onClick={() => adjustAmount(10)}
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`,
              color: inputDis ? C.muted : '#fff',
              cursor: inputDis ? 'not-allowed' : 'pointer',
              fontSize:20, fontWeight:300, lineHeight:1,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}
          >+</button>
        </div>

        {/* Big action button — takes remaining width */}
        <button
          onClick={handleClick} disabled={btnDis}
          style={{
            flex:1, background:btnBg, border:'none', color:'#fff',
            borderRadius:8, cursor: btnDis ? 'not-allowed' : 'pointer', height:48,
            transition:'background 0.2s, box-shadow 0.2s',
            boxShadow: isCashout ? `0 0 18px rgba(249,115,22,0.6)` : 'none',
            animation: isCashout ? 'cashoutPulse 1s ease-in-out infinite' : 'none',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
          }}
        >
          <span style={{ fontSize:14, fontWeight:900, lineHeight:1.2 }}>{btnLabel}</span>
          {btnAmount && <span style={{ fontSize:12, fontWeight:700, lineHeight:1.2, opacity:0.95 }}>{btnAmount}</span>}
        </button>
      </div>

      {/* Quick stakes — single row with pipe separators, exactly as screenshot */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', borderTop:`1px solid ${C.border}`, paddingTop:6 }}>
        {[100, 250, 1000, 25000].map((v, i) => (
          <div
            key={v}
            onClick={() => !inputDis && setAmount(v)}
            style={{
              textAlign:'center',
              fontSize:11, fontWeight:600,
              color: inputDis ? '#374151' : C.textDim,
              cursor: inputDis ? 'not-allowed' : 'pointer',
              padding:'3px 0',
              borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
              userSelect:'none',
            }}
          >
            {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
          </div>
        ))}
      </div>

      {/* Auto options */}
      {isAuto && (
        <div style={{ display:'flex', flexDirection:'column', gap:7, paddingTop:2, borderTop:`1px solid ${C.border}` }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:11, color:C.textDim, paddingTop:4 }}>
            <input type="checkbox" checked={autoBet} onChange={e => setAutoBet(e.target.checked)}/> Auto Bet
          </label>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={acEnabled} onChange={e => setAcEnabled(e.target.checked)} id={`ac${slot.id}`}/>
            <label htmlFor={`ac${slot.id}`} style={{ fontSize:11, color:C.textDim, cursor:'pointer' }}>Auto Cashout @</label>
            <input
              type="number"
              disabled={!acEnabled}
              value={autoAt}
              onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) setAutoAt(n) }}
              onBlur={e => { const n = parseFloat(e.target.value); if (isNaN(n) || n < 1.01) setAutoAt(1.01) }}
              style={{
                width:60, background:'#0a0b10', border:`1px solid ${C.border}`,
                color: acEnabled ? '#fff' : C.muted,
                borderRadius:4, padding:'3px 6px', fontSize:11, textAlign:'center', outline:'none'
              }}
            />
          </div>
        </div>
      )}
      <style>{`@keyframes cashoutPulse{0%,100%{box-shadow:0 0 18px rgba(249,115,22,0.6)}50%{box-shadow:0 0 28px rgba(249,115,22,0.9),0 0 8px rgba(249,115,22,0.5)}}`}</style>
    </div>
  )
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function AviatorFooter({ onHide }) {
  return (
    <div style={{ background:'#0d0f18', borderTop:`1px solid ${C.border}`, fontFamily:'Arial,sans-serif', color:C.textDim, fontSize:12, overflowY:'auto', maxHeight:'45vh' }}>
      <div style={{ padding:'8px 20px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', display:'flex', justifyContent:'space-between' }}>
        <span>↑ Back to Top</span>
        <span onClick={onHide} style={{ color:C.muted }}>✕ Hide</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:24, padding:'20px' }}>
        <div>
          <div style={{ color:C.red, fontWeight:900, fontSize:20, fontStyle:'italic', marginBottom:12 }}>✈ Aviator</div>
          {['Terms & Conditions','Responsible Gaming Policy','Privacy Policy'].map(s=>(
            <div key={s} style={{ cursor:'pointer', marginBottom:6 }}>{s}</div>
          ))}
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, marginBottom:10, fontSize:13 }}>Play</div>
          {['Sports','Jackpots','Virtuals','Casino'].map(s=>(
            <div key={s} style={{ cursor:'pointer', marginBottom:6 }}>{s}</div>
          ))}
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, marginBottom:10, fontSize:13 }}>Contact Us</div>
          <div style={{ marginBottom:8 }}><div style={{ color:'#fff', fontSize:11, fontWeight:600 }}>Email</div><div>support@aviator.game</div></div>
        </div>
      </div>
      <div style={{ padding:'16px 20px', borderTop:`1px solid ${C.border}`, fontSize:10, lineHeight:1.7 }}>
        <div style={{ color:'#fff', fontWeight:700, marginBottom:6 }}>18+</div>
        <div>Must be 18 years of age or older to register or play. Gambling may have adverse effects if not done with moderation.</div>
      </div>
    </div>
  )
}

// ─── ADMIN DASHBOARD COMPONENT ────────────────────────────────────────────────
function AdminDashboard({ token, onClose, refreshTrigger }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/api/admin/upcoming`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => {
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new Error('Unauthorized access')
        }
        throw new Error(`Request failed: ${r.status}`)
      }
      return r.json()
    })
    .then(d => { setData(d); setLoading(false) })
    .catch(err => { setError(err.message); setLoading(false) })
  }, [token, refreshKey, refreshTrigger])

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1b2e', borderRadius:12, padding:24, width:'100%', maxWidth:600, maxHeight:'80vh', overflowY:'auto', border:`1px solid ${C.yellow}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <h2 style={{ color:C.yellow, margin:0, fontSize:18 }}>🚀 ADMIN: UPCOMING</h2>
            <button onClick={() => setRefreshKey(p => p + 1)} style={{ background:C.yellow, color:'#000', border:'none', borderRadius:4, padding:'4px 10px', fontSize:11, fontWeight:800, cursor:'pointer' }}>REFRESH</button>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        {loading ? <p>Loading future rounds...</p> : error ? (
          <div style={{ color: C.red, padding: 20, textAlign: 'center' }}>
            <p>Error: {error}</p>
            <button onClick={() => setRefreshKey(p => p + 1)} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}`, color:C.muted }}>
                <th style={{ textAlign:'left', padding:8 }}>Round ID</th>
                <th style={{ textAlign:'left', padding:8 }}>Nonce</th>
                <th style={{ textAlign:'right', padding:8 }}>Crash Point</th>
              </tr>
            </thead>
            <tbody>
              {data?.upcoming?.map(r => (
                <tr key={r.roundId} style={{ borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                  <td style={{ padding:8 }}>{r.roundId}</td>
                  <td style={{ padding:8 }}>{r.nonce}</td>
                  <td style={{ padding:8, textAlign:'right', fontWeight:800, color: r.crashMultiplier >= 2 ? C.pink : '#fff' }}>{r.crashMultiplier.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,      setLoading]      = useState(true)
  const [phase,        setPhase]        = useState('waiting')
  const [mult,         setMult]         = useState(1.00)
  const [cnt,          setCnt]          = useState(5)
  const [startTime,    setStartTime]    = useState(0)

  // FIX: Starting balance is 0.00 — not 5000
  const [bal,          setBal]          = useState(0.00)

  const [history,      setHistory]      = useState([1.22,5.43,1.08,12.99,3.21,1.01,2.55,4.00,1.50,2.10,10.2,1.00])
  const [slots,        setSlots]        = useState([
    { id:1, status:'idle', amount:0, autoCashout:null, autoBet:false },
    { id:2, status:'idle', amount:0, autoCashout:null, autoBet:false },
  ])
  const [bots,         setBots]         = useState(() => makeBots(28))
  const [prevBots,     setPrevBots]     = useState([])
  const [totalBets,    setTotalBets]    = useState(1820)
  const [sideTab,      setSideTab]      = useState('all')
  const [chatMsgs,     setChatMsgs]     = useState(() => {
    const now = new Date()
    const ts = (off=0) => {
      const d = new Date(now.getTime() - off*1000)
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    }
    return [
      { user:'2***3', text:BOT_CHAT[0], time:ts(180) },
      { user:'2***9', text:BOT_CHAT[1], time:ts(120) },
      { user:'2***4', text:BOT_CHAT[2], time:ts(60)  },
      { user:'2***1', text:BOT_CHAT[3], time:ts(10)  },
    ]
  })
  const [showChat,     setShowChat]     = useState(false)
  const [showDeposit,  setShowDeposit]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFair,     setShowFair]     = useState(false)
  const [showFooter,   setShowFooter]   = useState(false)
  const [errorBar,     setErrorBar]     = useState('')
  const [isLoggedIn,   setIsLoggedIn]   = useState(false)
  const [showLogin,    setShowLogin]    = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [userPhone,    setUserPhone]    = useState('')
  const [lowPerf,      setLowPerf]      = useState(false)
  // In production, store your JWT here after login
  const [authToken,    setAuthToken]    = useState('') 
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 720)
  const [showSidebar,    setShowSidebar]    = useState(false)
  const [showSecondPanel,setShowSecondPanel]= useState(false)
  const [isAdmin,        setIsAdmin]        = useState(false)
  const [showAdminDb,    setShowAdminDb]    = useState(false)
  const [logoClicks,     setLogoClicks]     = useState(0)
  const [adminRefreshTrigger, setAdminRefreshTrigger] = useState(0)

  const socketRef    = useRef(null)
  const slotsRef     = useRef(slots)
  const balRef       = useRef(bal)
  const botsRef      = useRef(bots)
  const multRef      = useRef(1.0)
  const lastUpdateRef = useRef(performance.now())
  const cashedOutRef = useRef(new Set())

  useEffect(() => { slotsRef.current = slots }, [slots])
  useEffect(() => { balRef.current   = bal   }, [bal])
  useEffect(() => { botsRef.current  = bots  }, [bots])

  const handleAuthSuccess = (user) => {
    setUserPhone(user.phone);
    setIsAdmin(user.phone === ADMIN_PHONE_UI);
    setAuthToken(user.token); // Secure JWT from backend
    setBal(user.balance);
    setIsLoggedIn(true);
    setShowLogin(false);
    setShowRegister(false);
    setShowDeposit(true);
  };

  const handleLogoClick = () => {
    if (!isAdmin) return;
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 7) {
        setShowAdminDb(true);
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 720)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const showError = useCallback(msg => {
    setErrorBar(msg)
    setTimeout(() => setErrorBar(''), 4000)
  }, [])

  const doCashout = useCallback((slotId, atMult) => {
    setSlots(prev => {
      const slot = prev.find(s => s.id === slotId)
      if (!slot || slot.status !== 'active') return prev
      const win = slot.amount * atMult
      setBal(b => { const n = b+win; balRef.current = n; return n })
      return prev.map(s => s.id === slotId ? { ...s, status:'idle', amount:0, autoCashout:null } : s)
    })
  }, [])

  // Auto-cashout
  useEffect(() => {
    if (phase !== 'flying') return
    slotsRef.current.forEach(s => {
      if (s.status === 'active' && s.autoCashout && mult >= s.autoCashout && !cashedOutRef.current.has(s.id)) {
        cashedOutRef.current.add(s.id)
        doCashout(s.id, mult)
      }
    })
  }, [mult, phase, doCashout])

  // Socket.io
  useEffect(() => {
    // Force show main UI after 2.5 seconds regardless of socket status
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const s = io(API_URL, { 
      transports:['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
    socketRef.current = s

    s.on('connect', () => {
      clearTimeout(timer);
      setErrorBar('');
    })

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    })
    s.on('disconnect', () => {
      showError('Disconnected. Reconnecting...');
    })

    s.on('balanceUpdate', d => {
      setBal(d.balance);
    });

    s.on('gameState', d => {
      setPhase(d.phase); setCnt(d.countdown||0)
      setMult(d.multiplier||1.0); multRef.current = d.multiplier||1.0
      lastUpdateRef.current = performance.now();
      if (d.startTime) setStartTime(d.startTime)
      if (d.phase === 'countdown' || d.phase === 'waiting') {
        cashedOutRef.current = new Set()
        const newBots = makeBots(28)
        setBots(newBots)
        setTotalBets(t => t + newBots.length)
      }
    })
    s.on('countdown', d => {
      setPhase('countdown'); setCnt(d.countdown)
      cashedOutRef.current = new Set()
      
      setSlots(prev => prev.map(sl => {
        // Handle automatic betting for Auto-Play slots
        if (sl.autoBet && sl.status === 'idle') {
          const amount = sl.amount || 10
          if (balRef.current >= amount) {
            s.emit('placeBet', { amount })
            return { ...sl, status: 'queued', amount }
          }
        }
        // Handle automatic betting for manually Queued bets
        if (sl.status === 'queued') {
          s.emit('placeBet', { amount: sl.amount })
          return { ...sl, status: 'active' }
        }
        return sl
      }))
      if (Math.random() < 0.35) {
        const now = new Date()
        const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        setChatMsgs(prev => [...prev.slice(-40), {
          user: BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)],
          text: BOT_CHAT[Math.floor(Math.random()*BOT_CHAT.length)],
          time,
        }])
      }
    })
    s.on('flightStart', d => {
      setStartTime(d.startTime); setPhase('flying'); setMult(1.00); multRef.current = 1.0
      lastUpdateRef.current = performance.now();
      cashedOutRef.current = new Set()
      setBots(makeBots(28))
      setTotalBets(p => p + Math.floor(Math.random()*200+50))
      setSlots(prev => prev.map(sl => sl.status === 'queued' ? { ...sl, status:'active' } : sl))
    })
    s.on('multiplierUpdate', d => {
      multRef.current = d.multiplier
      lastUpdateRef.current = performance.now();
      setMult(d.multiplier)

      if (Math.random() < 0.09) {
        setBots(prev => {
          const nc = prev.filter(b => !b.cashedOutAt)
          if (!nc.length) return prev
          const bot = nc[Math.floor(Math.random()*nc.length)]
          return prev.map(b => b.id===bot.id ? { ...b, cashedOutAt:d.multiplier, win:b.amount*d.multiplier } : b)
        })
      }
      if (Math.random() < 0.018) {
        const now = new Date()
        const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        setChatMsgs(prev => [...prev.slice(-40), {
          user:BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)],
          text:BOT_CHAT[Math.floor(Math.random()*BOT_CHAT.length)],
          time,
        }])
      }
    })
    s.on('crash', d => {
      const cv = d.crashMultiplier
      setPhase('crashed'); setMult(cv); multRef.current = cv
      setHistory(prev => [cv, ...prev.slice(0,19)])
      setPrevBots(botsRef.current)
      setAdminRefreshTrigger(p => p + 1)
      setSlots(prev => {
        return prev.map(sl => {
          if (sl.status === 'active') {
            return { ...sl, status: 'idle', amount: 0, autoCashout: null };
          }
          return sl;
        });
      })
    })
    return () => s.disconnect()
  }, [])

  // Authenticate socket whenever login status changes
  useEffect(() => {
    if (isLoggedIn && socketRef.current) {
      // SECURITY: Emit a token, not a raw phone number
      socketRef.current.emit('authenticate', { 
        phone: userPhone, 
        token: authToken 
      });
    }
  }, [isLoggedIn, userPhone, authToken]);

  const handleBetAction = useCallback((slotId, action, amount, opts) => {
    if (action === 'bet') {
      if (balRef.current < amount) { showError('Not enough balance. Please deposit.'); return }

      // If round is in betting phase, notify server immediately
      if (phase === 'waiting' || phase === 'countdown') {
        socketRef.current?.emit('placeBet', { amount });
      }

      // Keep local balance sync for instant UI feedback
      setBal(b => { const n = b - amount; balRef.current = n; return n })
      
      setSlots(prev => prev.map(s => s.id===slotId
        ? { ...s, status:'queued', amount, autoCashout:opts.autoCashout, autoBet:opts.autoBet } : s))
    } else if (action === 'cancel') {
      setSlots(prev => {
        const s = prev.find(x => x.id===slotId)
        if (s) setBal(b => { const n = b+s.amount; balRef.current = n; return n })
        return prev.map(x => x.id===slotId ? { ...x, status:'idle', amount:0, autoCashout:null } : x)
      })
    } else if (action === 'cashout') {
      socketRef.current?.emit('cashOut'); // CRITICAL: Signal server to save winnings
      doCashout(slotId, multRef.current)
    }
  }, [doCashout, showError])

  // Deposit handler — adds to balance
  const handleDeposit = useCallback((amount) => {
    setBal(b => { const n = b + amount; balRef.current = n; return n })
  }, [])

  if (loading) return <SplashScreen/>
  if (showRegister) return (
    <RegisterPage
      onBack={()=>setShowRegister(false)}
      onLoginRedirect={()=>{ setShowRegister(false); setShowLogin(true) }}
      onRegister={handleAuthSuccess}
    />
  )
  if (showLogin) return (
    <LoginPage
      onBack={()=>setShowLogin(false)}
      onRegisterRedirect={()=>{ setShowLogin(false); setShowRegister(true) }}
      onLogin={handleAuthSuccess}
    />
  )

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:C.bg, color:'#fff', fontFamily:'Arial,sans-serif', overflow:'hidden' }}>
      <style>{`
        *{box-sizing:border-box}
        .hide-scroll::-webkit-scrollbar{display:none}
        .hide-scroll{-ms-overflow-style:none;scrollbar-width:none}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        @keyframes histIn{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes errIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flewIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        @keyframes liveDot{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes cashoutPulse{0%,100%{box-shadow:0 0 18px rgba(249,115,22,0.6)}50%{box-shadow:0 0 30px rgba(249,115,22,1),0 0 8px rgba(249,115,22,0.5)}}
        @keyframes rainbowShift{0%{background-position:0% 0%}100%{background-position:200% 0%}}
        .rainbow-line{height:2px;background:linear-gradient(90deg,#e11d28,#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#e11d28);background-size:200% 100%;animation:rainbowShift 4s linear infinite}
        .live-dot{animation:liveDot 1.2s ease-in-out infinite}
        button:hover:not(:disabled){filter:brightness(1.1)}
      `}</style>

      {/* Modals */}
      {showDeposit  && (
        <DepositModal
          onClose={()=>setShowDeposit(false)}
          isLoggedIn={isLoggedIn}
          onDeposit={handleDeposit}
          onLoginRedirect={()=>{ setShowDeposit(false); setShowLogin(true) }}
        />
      )}
      {showFair     && <FairnessModal onClose={()=>setShowFair(false)}/>}
      {showSettings && (
        <SettingsMenu
          onClose={()=>setShowSettings(false)}
          onFairness={()=>{ setShowSettings(false); setShowFair(true) }}
          username={isLoggedIn ? userPhone : null}
          lowPerf={lowPerf}
          setLowPerf={setLowPerf}
        />
      )}


      {/* Nav — Aviator branded */}
      <AviatorNav
        isLoggedIn={isLoggedIn}
        onLogin={()=>{ if(isLoggedIn) setIsLoggedIn(false); else setShowLogin(true) }}
        onRegister={()=>setShowRegister(true)}
        onDeposit={()=>{ if(!isLoggedIn){ setShowLogin(true) } else { setShowDeposit(true) } }}
        onLogoClick={handleLogoClick}
      />
      <GoBackBar/>

      {/* Game sub-header */}
      <GameSubHeader bal={bal} onSettings={()=>setShowSettings(p=>!p)} onChat={()=>setShowChat(p=>!p)} showChat={showChat}/>

      {showAdminDb && <AdminDashboard token={authToken} refreshTrigger={adminRefreshTrigger} onClose={() => setShowAdminDb(false)} />}

      {/* Main area */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Sidebar */}
        {!isMobile && (
          <Sidebar bets={bots} prevBets={prevBots} activeTab={sideTab} onTab={setSideTab} totalCount={totalBets}/>
        )}
        {isMobile && showSidebar && (
          <>
            <div onClick={()=>setShowSidebar(false)} style={{ position:'absolute', inset:0, zIndex:49, background:'rgba(0,0,0,0.5)' }}/>
            <div style={{ position:'absolute', top:0, left:0, bottom:0, zIndex:50, width:240, boxShadow:'4px 0 24px rgba(0,0,0,0.6)' }}>
              <Sidebar bets={bots} prevBets={prevBots} activeTab={sideTab} onTab={setSideTab} totalCount={totalBets}/>
            </div>
          </>
        )}

        {/* Game column */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* History bar */}
          <div style={{ height:36, background:C.panel, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:6, padding:'0 8px', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <span style={{
                background: (phase==='waiting'||phase==='countdown') ? '#1a2030' : '#14532d',
                color: (phase==='waiting'||phase==='countdown') ? '#8b9fc0' : C.green,
                border: `1px solid ${(phase==='waiting'||phase==='countdown') ? '#2a3555' : '#166534'}`,
                fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:3, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4
              }}>
                {(phase==='waiting'||phase==='countdown')
                  ? <><span>📅</span> UPCOMING</>
                  : <><span className="live-dot" style={{ width:5, height:5, borderRadius:'50%', background:C.green, display:'inline-block' }}/> LIVE</>
                }
              </span>
              {!isMobile && <span style={{ color:C.textDim, fontSize:11, whiteSpace:'nowrap' }}>Collect Highest Multiplier</span>}
            </div>
            <HistoryBar history={history}/>
            <span style={{ flexShrink:0, color:C.muted, fontSize:11, padding:'0 4px', cursor:'pointer' }}>···</span>
            <button onClick={()=>setShowFair(true)} style={{ flexShrink:0, background:C.yellow, border:'none', color:'#000', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontWeight:900, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            {isMobile && (
              <button onClick={()=>setShowSidebar(p=>!p)} style={{ flexShrink:0, background:'none', border:`1px solid ${C.border}`, color:C.muted, borderRadius:4, padding:'3px 7px', fontSize:11, cursor:'pointer' }}>☰</button>
            )}
          </div>

          {/* Rainbow line */}
          <div className="rainbow-line" style={{ flexShrink:0 }}/>

          {/* Canvas + overlays */}
          <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:0 }}>
            <GameCanvas 
              phase={phase} 
              multiplierRef={multRef} 
              lastUpdateRef={lastUpdateRef} 
              startTime={startTime} 
              lowPerf={lowPerf}
            />
            <WaitingOverlay phase={phase} />
            <ErrorBar message={errorBar} onDismiss={()=>setErrorBar('')}/>

            {/* Multiplier overlay */}
            <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', paddingBottom:'6%' }}>
              {phase === 'crashed' && (
                <div style={{ textAlign:'center', animation:'flewIn 0.25s ease-out' }}>
                  <div style={{ fontSize:isMobile?20:26, fontWeight:900, color:'#fff', letterSpacing:4, marginBottom:6, fontFamily:'"Arial Black",Arial', textShadow:'0 2px 16px rgba(0,0,0,0.95)' }}>
                    FLEW AWAY!
                  </div>
                  <div style={{ fontSize:isMobile?54:88, fontWeight:900, color:C.red, fontFamily:'"Arial Black",Arial', lineHeight:1, textShadow:`0 0 30px rgba(225,29,40,0.6), 0 2px 8px rgba(0,0,0,0.9)`, userSelect:'none' }}>
                    {mult.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Two bet panels side by side */}
          <div style={{ padding:'8px 10px', background:C.panel, borderTop:`1px solid ${C.border}`, display:'flex', gap:8, flexShrink:0, flexDirection:isMobile?'column':'row', alignItems:'stretch' }}>
            <BetPanel slot={slots[0]} phase={phase} currentMult={mult} onAction={handleBetAction}/>
            <BetPanel slot={slots[1]} phase={phase} currentMult={mult} onAction={handleBetAction}/>
          </div>

          {/* Bottom bar */}
          <div style={{ height:26, background:'#0a0b10', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px', flexShrink:0 }}>
            <span onClick={()=>setShowFair(true)} style={{ fontSize:9, color:C.muted, cursor:'pointer' }}>🛡️ Provably Fair Game</span>
            <span onClick={()=>setShowFooter(p=>!p)} style={{ fontSize:9, color:C.muted, cursor:'pointer' }}>
              Powered by <span style={{ color:'#6b7280', fontWeight:400 }}>SPRIBE</span>
            </span>
          </div>

          {showFooter && <AviatorFooter onHide={()=>setShowFooter(false)}/>}
        </div>

        {/* Chat */}
        {showChat && !isMobile && <ChatPanel messages={chatMsgs} onClose={()=>setShowChat(false)}/>}
      </div>
    </div>
  )
}