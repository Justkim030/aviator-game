import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_PHONE_UI = '254700000000'; // Match this with your ADMIN_PHONE server env

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
    <div style={{
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
        {NAV_ITEMS.map(n => (
          <div key={n.label} style={{
            position:'relative', flexShrink:0, padding:'8px 10px',
            fontSize:12, fontWeight: n.active ? 700 : 400,
            color: n.active ? '#fff' : C.textDim,
            borderBottom: n.active ? `2px solid ${C.green}` : '2px solid transparent',
            cursor:'pointer', whiteSpace:'nowrap',
          }}>
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
    function drawPlane(x, y, angle) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)

      if (imgOk.current && imgRef.current) {
        const W = 110, H = 70;
        const tailOffsetX = 3;
        const tailOffsetY = H * 0.82; 
        ctx.drawImage(imgRef.current, -tailOffsetX, -tailOffsetY, W, H)
      } else {
        // Fallback vector silhouette.
        // Design rule: tail fins touch x=0, nose points right to x≈44*S.
        // The curve stroke ends at origin — tail fins must start at/near x=0.
        const S = 3.2; 
        ctx.shadowColor = 'rgba(225,29,40,0.6)';
        ctx.shadowBlur  = 12;
        if (lowPerf) { // Apply lowPerf check here too
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle   = C.red
        ctx.translate(-2*S, -6*S)

        // Fuselage — runs from x=2 (tail) to x=44 (nose tip)
        ctx.beginPath()
        ctx.moveTo(44*S, 0)          // nose tip
        ctx.lineTo(2*S,  6*S)        // belly tail
        ctx.lineTo(8*S,  0)          // waist
        ctx.lineTo(2*S, -6*S)        // top tail
        ctx.closePath()
        ctx.fill()

        // Main wing (mid-body, sweeps back and down)
        ctx.beginPath()
        ctx.moveTo(26*S, -1*S)
        ctx.lineTo(10*S, -18*S)
        ctx.lineTo(4*S,  -2*S)
        ctx.closePath()
        ctx.fill()

        // Upper tail fin — anchored right at origin
        ctx.beginPath()
        ctx.moveTo(6*S,  -1*S)
        ctx.lineTo(0,    -10*S)
        ctx.lineTo(0,    -3*S)
        ctx.closePath()
        ctx.fill()

        // Lower tail fin
        ctx.beginPath()
        ctx.moveTo(5*S,   1*S)
        ctx.lineTo(0,     7*S)
        ctx.lineTo(2*S,   3*S)
        ctx.closePath()
        ctx.fill()

        ctx.shadowBlur = 0
      }
      ctx.restore()
    }

    function multToY(m, oy, availH) {
      const p = Math.min(Math.pow(Math.max(m - 1, 0), 0.6) / 4.0, 0.70);
      return Math.max(60, oy - p * availH)
    }

    // Returns the bezier tangent angle at the tip
    // Implementation using Quadratic Bézier Curves for optimal growth visualization
    function drawCurve(ox, oy, tx, ty) {
      const cpx = (ox + tx) / 2;
      const cpy = oy; // Keeping control point at start height keeps the curve flat at the beginning

      const grad = ctx.createLinearGradient(0, ty, 0, oy);
      grad.addColorStop(0, 'rgba(225, 29, 40, 0.42)'); // Stronger red at the trail line
      grad.addColorStop(0.7, 'rgba(225, 29, 40, 0.08)'); // Rapid fade
      grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent at the bottom

      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.lineTo(tx, oy);
      ctx.lineTo(ox, oy);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3.5; 
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Calculate the angle of the curve at the plane's position
      return Math.atan2(ty - cpy, tx - cpx);
    }

    const render = () => {
      raf = requestAnimationFrame(render)

      const c = fctx.current; // Get the offscreen buffer context
      if (!c) { swapBuffers(); return; } // Ensure context is available
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

      const topMargin = 90
      const ox = 52, oy = H - 42, availH = oy - topMargin
      const t = Date.now() * 0.001

      // Axes
      c.strokeStyle = 'rgba(255,255,255,0.35)'
      c.lineWidth = 1.5; c.setLineDash([])
      if (phase === 'waiting' || phase === 'countdown') {
        frozen.current      = { tx: ox, ty: oy, ox, oy }
        pinnedSince.current = null
        smoothedTy.current  = null

        // Plane tail sits exactly on the x-axis at origin.
        // Gentle left-right taxi: oscillates ±18px around ox, period ~4s
        const taxiX = ox + Math.sin(t * (Math.PI * 2) / 4) * 18
        const taxiAng = Math.sin(t * (Math.PI * 2) / 4) * 0.04 - 0.03
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(taxiX, oy); c.strokeStyle = C.red; c.lineWidth = 3.5; c.lineCap = 'round'; c.stroke()
        c.beginPath(); c.arc(ox, oy, 4, 0, Math.PI * 2); c.fillStyle = C.red; c.fill()
        drawPlane(c, taxiX, oy, taxiAng)
        swapBuffers();
        return
      }

      // ── FLYING ──────────────────────────────────────────────────────────────
      if (phase === 'flying') {
        const elapsed = Math.max(0, Date.now() - startTime)
        const maxX    = W * 0.8
        const rawTx   = ox + elapsed * 0.12;
        const pinned  = rawTx >= maxX
        const tx      = Math.min(rawTx, maxX)

        // ── Lag Compensation: Extrapolate Vertical Multiplier ──
        // The server multiplier grows at e^(0.12 * t). We extrapolate between socket updates.
        const dtUpdate = (now - lastUpdateRef.current) / 1000;
        const predictedMult = multiplierRef.current * Math.exp(0.12 * dtUpdate);

        const rawTy   = multToY(predictedMult, oy, availH)

        // ── Frame-rate independent Lerp ──
        // We use Math.pow to ensure the smoothing feels identical at 60Hz and 120Hz.
        // Formula: 1 - Math.pow(1 - lerpFactor, deltaRatio)
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
        let planeAngle = tangentAngle * 0.6
        planeAngle = Math.max(-0.43, Math.min(0.20, planeAngle))

        planeAngle += Math.sin(t * 2.1) * 0.008
        const displayMult = predictedMult.toFixed(2) + 'x';
        c.save();
        c.fillStyle = '#fff';
        const fontSize = W < 720 ? 58 : 92;
        c.font = `900 ${fontSize}px "Arial Black", Arial`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        if (!lowPerf) {
          c.shadowColor = 'rgba(0,0,0,0.8)';
          c.shadowBlur = 10;
          c.shadowOffsetY = 2;
        }
        drawPlane(c, tx, ty, planeAngle) // Draw plane after setting shadows for text
        c.fillText(displayMult, W / 2, H / 2 - 20);
        c.restore();
        swapBuffers();
        return
      }

      // ── CRASHED ──────────────────────────────────────────────────────────────
      if (phase === 'crashed') {
        const { tx: ftx, ty: fty, ox: fox, oy: foy } = frozen.current
        if (ftx && fty) {
          const cpx = fox + (ftx - fox) * 0.45;
          const cpy = foy;
          const grad = c.createLinearGradient(ftx, fty, fox, foy);
          grad.addColorStop(0, 'rgba(225, 29, 40, 0.35)'); grad.addColorStop(1, 'rgba(225, 29, 40, 0.01)');
          c.beginPath(); c.moveTo(fox, foy); c.quadraticCurveTo(cpx, cpy, ftx, fty); c.lineTo(ftx, foy); c.closePath(); c.fillStyle = grad; c.fill()
          c.beginPath(); c.moveTo(fox, foy); c.quadraticCurveTo(cpx, cpy, ftx, fty); c.strokeStyle = 'rgba(225,29,40,0.45)'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke()