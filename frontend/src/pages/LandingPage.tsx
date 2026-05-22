import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Intersection Observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(start);
    }, 18);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Smart Booking Engine',
    desc: 'Accept and manage event bookings with automated availability checks, custom quote generation, and real-time confirmations.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Menu & Inventory',
    desc: 'Build beautiful menus with pricing tiers, dietary tags, and live inventory tracking so you never overcommit on stock.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Invoicing & Payments',
    desc: 'Generate branded PDF invoices in one click, track payment statuses, and send automated reminders to clients.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Staff Management',
    desc: 'Assign roles, schedule team members per event, track availability, and keep everyone aligned with in-app messaging.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
      </svg>
    ),
    title: 'Event Calendar',
    desc: 'Visualise your entire schedule on an interactive calendar. Spot conflicts instantly and plan resources weeks ahead.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Analytics Dashboard',
    desc: 'Track revenue, popular menu items, repeat clients, and staff performance — all in a clean, real-time dashboard.',
  },
];

const testimonials = [
  {
    quote: 'We cut our admin time by 60% in the first month. The booking and invoicing system is exactly what a growing catering business needs.',
    name: 'Adaeze Okonkwo',
    role: 'CEO, Adaeze\'s Kitchen Lagos',
    initials: 'AO',
  },
  {
    quote: 'The staff scheduling alone is worth it. No more WhatsApp chaos — everyone sees their assignments right in the app.',
    name: 'Michael Eze',
    role: 'Operations Manager, Crown Banquet',
    initials: 'ME',
  },
  {
    quote: 'From wedding breakfasts to corporate lunches — CaterPro handles every event type flawlessly. I\'d never go back to spreadsheets.',
    name: 'Fatima Al-Hassan',
    role: 'Founder, Saffron Events Abuja',
    initials: 'FA',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const featsRef = useInView();
  const statsRef = useInView();
  const testsRef = useInView();
  const ctaRef = useInView();

  return (
    <div className="landing-root">
      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="logo">
            <span className="logo-icon">🍽</span>
            <span className="logo-text">CaterPro</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#stats">Why Us</a>
            <a href="#testimonials">Reviews</a>
          </div>
          <div className="nav-ctas">
            <Link to="/login" className="btn-ghost">Sign In</Link>
            <Link to="/register" className="btn-primary-sm">Get Started Free</Link>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#stats" onClick={() => setMenuOpen(false)}>Why Us</a>
            <a href="#testimonials" onClick={() => setMenuOpen(false)}>Reviews</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
            <Link to="/register" className="mobile-cta" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-gradient" />
        <div className="hero-pattern" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            Now with AI-powered quote estimation
          </div>
          <h1 className="hero-title">
            Run your catering<br />
            <span className="hero-accent">business smarter</span>
          </h1>
          <p className="hero-sub">
            CaterPro is the all-in-one platform for professional catering teams —
            bookings, menus, invoices, staff, and analytics, beautifully unified.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-hero-primary">
              Start for Free
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </Link>
            <Link to="/login" className="btn-hero-ghost">Sign in to dashboard</Link>
          </div>
          <p className="hero-note">No credit card required · Free 14-day trial</p>
        </div>
        <div className="hero-visual">
          <div className="dashboard-mock">
            <div className="mock-topbar">
              <div className="mock-dots"><span /><span /><span /></div>
              <div className="mock-title">CaterPro Dashboard</div>
            </div>
            <div className="mock-body">
              <div className="mock-sidebar">
                {['Dashboard','Bookings','Menu','Invoices','Staff','Calendar'].map(l => (
                  <div key={l} className={`mock-link ${l==='Dashboard'?'active':''}`}>{l}</div>
                ))}
              </div>
              <div className="mock-main">
                <div className="mock-cards">
                  <div className="mock-card orange"><div className="mc-val">₦2.4M</div><div className="mc-label">Revenue</div></div>
                  <div className="mock-card teal"><div className="mc-val">38</div><div className="mc-label">Bookings</div></div>
                  <div className="mock-card warm"><div className="mc-val">94%</div><div className="mc-label">Satisfaction</div></div>
                </div>
                <div className="mock-chart">
                  {[40,65,50,80,70,90,75].map((h, i) => (
                    <div key={i} className="mock-bar" style={{ height: `${h}%`, animationDelay: `${i*0.08}s` }} />
                  ))}
                </div>
                <div className="mock-events">
                  {['Corporate Lunch · June 3','Wedding Reception · June 8','Birthday Gala · June 14'].map(e => (
                    <div key={e} className="mock-event"><span className="me-dot" />{e}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="features-section" id="features">
        <div ref={featsRef.ref} className={`section-container fade-up ${featsRef.inView ? 'visible' : ''}`}>
          <div className="section-label">Everything you need</div>
          <h2 className="section-title">Built for modern catering teams</h2>
          <p className="section-sub">Every tool your business needs — designed to work together seamlessly.</p>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="stats-section" id="stats">
        <div ref={statsRef.ref} className={`section-container fade-up ${statsRef.inView ? 'visible' : ''}`}>
          <div className="section-label light">Trusted & proven</div>
          <h2 className="section-title light">Numbers that speak for themselves</h2>
          <div className="stats-grid">
            {[
              { target: 1200, suffix: '+', label: 'Catering businesses' },
              { target: 48000, suffix: '+', label: 'Events managed' },
              { target: 98, suffix: '%', label: 'Uptime guarantee' },
              { target: 60, suffix: '%', label: 'Less admin time' },
            ].map((s, i) => (
              <div key={i} className="stat-item">
                <div className="stat-num"><Counter target={s.target} suffix={s.suffix} /></div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="testimonials-section" id="testimonials">
        <div ref={testsRef.ref} className={`section-container fade-up ${testsRef.inView ? 'visible' : ''}`}>
          <div className="section-label">Real teams, real results</div>
          <h2 className="section-title">Loved by catering professionals</h2>
          <div className="test-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="test-card">
                <div className="test-stars">{'★'.repeat(5)}</div>
                <p className="test-quote">"{t.quote}"</p>
                <div className="test-author">
                  <div className="test-avatar">{t.initials}</div>
                  <div>
                    <div className="test-name">{t.name}</div>
                    <div className="test-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div ref={ctaRef.ref} className={`cta-inner fade-up ${ctaRef.inView ? 'visible' : ''}`}>
          <div className="cta-glow" />
          <h2 className="cta-title">Ready to grow your catering business?</h2>
          <p className="cta-sub">Join over 1,200 catering teams already using CaterPro to run more events with less stress.</p>
          <div className="cta-actions">
            <Link to="/register" className="btn-hero-primary">Create your free account</Link>
            <Link to="/login" className="btn-hero-ghost">I already have an account</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="logo-icon">🍽</span>
            <span className="logo-text">CaterPro</span>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} CaterPro. All rights reserved.</p>
          <div className="footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── RESET & ROOT ─────────────────────────── */
        .landing-root {
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1a1208;
          background: #fffdf9;
          overflow-x: hidden;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── NAV ─────────────────────────────────── */
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 1rem 2rem;
          transition: background 0.3s, box-shadow 0.3s, backdrop-filter 0.3s;
        }
        .nav-scrolled {
          background: rgba(255,253,249,0.92);
          backdrop-filter: blur(12px);
          box-shadow: 0 1px 0 rgba(0,0,0,0.08);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; gap: 2rem;
        }
        .logo { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; }
        .logo-icon { font-size: 1.5rem; }
        .logo-text { font-size: 1.25rem; font-weight: 700; color: #c45c0a; letter-spacing: -0.02em; }
        .nav-links { display: flex; gap: 2rem; margin-left: auto; }
        .nav-links a { text-decoration: none; color: #4a3520; font-size: 0.9rem; font-family: 'Helvetica Neue', sans-serif; transition: color 0.2s; }
        .nav-links a:hover { color: #c45c0a; }
        .nav-ctas { display: flex; gap: 0.75rem; align-items: center; }
        .btn-ghost { text-decoration: none; color: #4a3520; font-size: 0.875rem; font-family: 'Helvetica Neue', sans-serif; padding: 0.5rem 1rem; border-radius: 8px; transition: background 0.2s; }
        .btn-ghost:hover { background: #f5ece0; }
        .btn-primary-sm {
          text-decoration: none; background: #c45c0a; color: #fff;
          font-size: 0.875rem; font-family: 'Helvetica Neue', sans-serif; font-weight: 600;
          padding: 0.5rem 1.25rem; border-radius: 8px; transition: background 0.2s, transform 0.15s;
        }
        .btn-primary-sm:hover { background: #a34a07; transform: translateY(-1px); }
        .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
        .hamburger span { display: block; width: 24px; height: 2px; background: #4a3520; border-radius: 2px; }
        .mobile-menu {
          display: flex; flex-direction: column; gap: 0;
          background: #fffdf9; border-top: 1px solid #efe3d0;
          padding: 1rem 0;
        }
        .mobile-menu a { padding: 0.75rem 1.5rem; text-decoration: none; color: #4a3520; font-family: 'Helvetica Neue', sans-serif; font-size: 0.95rem; }
        .mobile-cta { background: #c45c0a !important; color: #fff !important; margin: 0.5rem 1rem; border-radius: 8px; text-align: center; font-weight: 600; }

        /* ── HERO ─────────────────────────────────── */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; align-items: center;
          padding: 7rem 2rem 4rem;
          gap: 3rem;
          max-width: 1200px; margin: 0 auto;
          overflow: hidden;
        }
        .hero-bg-gradient {
          position: fixed; inset: 0; z-index: -2;
          background: radial-gradient(ellipse 80% 60% at 60% 10%, #fde9c9 0%, #fffdf9 60%);
          pointer-events: none;
        }
        .hero-pattern {
          position: absolute; inset: 0; z-index: -1; opacity: 0.04;
          background-image: repeating-linear-gradient(0deg, #c45c0a 0px, #c45c0a 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, #c45c0a 0px, #c45c0a 1px, transparent 1px, transparent 40px);
          pointer-events: none;
        }
        .hero-content { flex: 1; max-width: 560px; animation: fadeInLeft 0.9s ease both; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: #fff4e6; border: 1px solid #f5c896; border-radius: 999px;
          padding: 0.35rem 1rem; font-size: 0.8rem; color: #9a4500;
          font-family: 'Helvetica Neue', sans-serif; margin-bottom: 1.5rem;
        }
        .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #c45c0a; animation: pulse 1.8s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        .hero-title {
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          line-height: 1.1; letter-spacing: -0.03em;
          color: #1a1208; margin-bottom: 1.25rem;
        }
        .hero-accent { color: #c45c0a; }
        .hero-sub {
          font-size: 1.1rem; line-height: 1.7; color: #6b5240;
          font-family: 'Helvetica Neue', sans-serif; margin-bottom: 2rem;
        }
        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: #c45c0a; color: #fff; text-decoration: none;
          font-family: 'Helvetica Neue', sans-serif; font-weight: 700;
          font-size: 1rem; padding: 0.9rem 1.75rem; border-radius: 12px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(196,92,10,0.35);
        }
        .btn-hero-primary:hover { background: #a34a07; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(196,92,10,0.45); }
        .btn-hero-ghost {
          display: inline-flex; align-items: center;
          color: #4a3520; text-decoration: none;
          font-family: 'Helvetica Neue', sans-serif; font-size: 0.95rem;
          padding: 0.9rem 1.5rem; border-radius: 12px; border: 1.5px solid #ddc9ae;
          transition: border-color 0.2s, background 0.2s;
        }
        .btn-hero-ghost:hover { border-color: #c45c0a; background: #fff6ed; }
        .hero-note { font-size: 0.8rem; color: #9c7a5c; font-family: 'Helvetica Neue', sans-serif; }

        /* ── DASHBOARD MOCK ───────────────────────── */
        .hero-visual { flex: 1; display: flex; justify-content: center; animation: fadeInRight 0.9s 0.2s ease both; }
        .dashboard-mock {
          width: 100%; max-width: 520px;
          background: #fff; border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .mock-topbar {
          background: #1e1208; padding: 0.75rem 1rem;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .mock-dots { display: flex; gap: 5px; }
        .mock-dots span { width: 10px; height: 10px; border-radius: 50%; }
        .mock-dots span:nth-child(1) { background: #ff5f57; }
        .mock-dots span:nth-child(2) { background: #febc2e; }
        .mock-dots span:nth-child(3) { background: #28c840; }
        .mock-title { color: #8a7060; font-size: 0.75rem; font-family: 'Helvetica Neue', sans-serif; }
        .mock-body { display: flex; }
        .mock-sidebar {
          width: 110px; background: #faf5ef; border-right: 1px solid #efe3d0;
          padding: 1rem 0;
        }
        .mock-link {
          padding: 0.45rem 1rem; font-size: 0.7rem; color: #9c7a5c;
          font-family: 'Helvetica Neue', sans-serif; cursor: default;
        }
        .mock-link.active { background: #fff6ed; color: #c45c0a; font-weight: 700; border-left: 3px solid #c45c0a; }
        .mock-main { flex: 1; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .mock-cards { display: flex; gap: 0.5rem; }
        .mock-card {
          flex: 1; border-radius: 10px; padding: 0.6rem 0.75rem;
        }
        .mock-card.orange { background: linear-gradient(135deg, #c45c0a, #f09333); }
        .mock-card.teal { background: linear-gradient(135deg, #0e7490, #06b6d4); }
        .mock-card.warm { background: linear-gradient(135deg, #7c3aed, #a78bfa); }
        .mc-val { font-size: 1rem; font-weight: 700; color: #fff; }
        .mc-label { font-size: 0.62rem; color: rgba(255,255,255,0.75); font-family: 'Helvetica Neue', sans-serif; }
        .mock-chart {
          height: 70px; display: flex; align-items: flex-end; gap: 4px;
          background: #faf5ef; border-radius: 8px; padding: 8px;
        }
        .mock-bar {
          flex: 1; background: linear-gradient(to top, #c45c0a, #f5ba6e);
          border-radius: 3px 3px 0 0;
          animation: growUp 0.6s ease both;
          transform-origin: bottom;
        }
        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .mock-events { display: flex; flex-direction: column; gap: 0.35rem; }
        .mock-event {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.68rem; color: #6b5240; font-family: 'Helvetica Neue', sans-serif;
          background: #faf5ef; border-radius: 6px; padding: 0.35rem 0.5rem;
        }
        .me-dot { width: 6px; height: 6px; border-radius: 50%; background: #c45c0a; flex-shrink: 0; }

        /* ── SECTIONS SHARED ──────────────────────── */
        .section-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; text-align: center; }
        .section-label {
          display: inline-block; font-size: 0.75rem; font-family: 'Helvetica Neue', sans-serif;
          font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: #c45c0a; margin-bottom: 0.75rem;
        }
        .section-label.light { color: #f5c896; }
        .section-title { font-size: clamp(1.8rem, 3.5vw, 2.75rem); letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 0.75rem; }
        .section-title.light { color: #fff; }
        .section-sub { font-size: 1rem; color: #8a6a50; font-family: 'Helvetica Neue', sans-serif; max-width: 540px; margin: 0 auto; }

        /* ── FEATURES ─────────────────────────────── */
        .features-section { padding: 6rem 0; }
        .features-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem; margin-top: 3.5rem; text-align: left;
        }
        .feature-card {
          background: #fff; border: 1px solid #efe3d0; border-radius: 16px;
          padding: 1.75rem; transition: box-shadow 0.25s, transform 0.25s;
        }
        .feature-card:hover { box-shadow: 0 12px 36px rgba(196,92,10,0.12); transform: translateY(-4px); }
        .feature-icon {
          width: 52px; height: 52px; border-radius: 12px;
          background: #fff6ed; display: flex; align-items: center; justify-content: center;
          color: #c45c0a; margin-bottom: 1.1rem;
        }
        .feature-title { font-size: 1.05rem; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .feature-desc { font-size: 0.875rem; line-height: 1.65; color: #6b5240; font-family: 'Helvetica Neue', sans-serif; }

        /* ── STATS ────────────────────────────────── */
        .stats-section {
          padding: 6rem 2rem;
          background: linear-gradient(135deg, #1e1208 0%, #3d2208 100%);
        }
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 2rem; margin-top: 3rem;
        }
        .stat-item { text-align: center; }
        .stat-num { font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 700; color: #f5ba6e; letter-spacing: -0.04em; line-height: 1; margin-bottom: 0.5rem; }
        .stat-label { font-size: 0.875rem; color: #c49a6c; font-family: 'Helvetica Neue', sans-serif; }

        /* ── TESTIMONIALS ─────────────────────────── */
        .testimonials-section { padding: 6rem 0; background: #faf5ef; }
        .test-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem; margin-top: 3rem; text-align: left;
        }
        .test-card {
          background: #fff; border-radius: 16px; padding: 2rem;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06); border: 1px solid #efe3d0;
        }
        .test-stars { color: #f09333; font-size: 1rem; margin-bottom: 1rem; letter-spacing: 2px; }
        .test-quote { font-size: 0.95rem; line-height: 1.7; color: #3d2208; margin-bottom: 1.5rem; font-style: italic; }
        .test-author { display: flex; align-items: center; gap: 0.75rem; }
        .test-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, #c45c0a, #f5ba6e);
          color: #fff; font-family: 'Helvetica Neue', sans-serif; font-weight: 700;
          font-size: 0.85rem; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .test-name { font-size: 0.875rem; font-weight: 700; color: #1a1208; }
        .test-role { font-size: 0.75rem; color: #9c7a5c; font-family: 'Helvetica Neue', sans-serif; }

        /* ── CTA ──────────────────────────────────── */
        .cta-section { padding: 6rem 2rem; }
        .cta-inner {
          max-width: 700px; margin: 0 auto; text-align: center; position: relative;
        }
        .cta-glow {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px; height: 300px;
          background: radial-gradient(ellipse, rgba(196,92,10,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-title { font-size: clamp(1.9rem, 4vw, 2.8rem); letter-spacing: -0.03em; margin-bottom: 1rem; }
        .cta-sub { font-size: 1rem; color: #8a6a50; font-family: 'Helvetica Neue', sans-serif; max-width: 500px; margin: 0 auto 2.5rem; line-height: 1.6; }
        .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

        /* ── FOOTER ───────────────────────────────── */
        .landing-footer { background: #1a1208; padding: 2rem; }
        .footer-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
        }
        .footer-brand { display: flex; align-items: center; gap: 0.5rem; }
        .footer-copy { font-size: 0.8rem; color: #6b5240; font-family: 'Helvetica Neue', sans-serif; }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { text-decoration: none; font-size: 0.8rem; color: #6b5240; font-family: 'Helvetica Neue', sans-serif; transition: color 0.2s; }
        .footer-links a:hover { color: #f5ba6e; }

        /* ── ANIMATIONS ───────────────────────────── */
        .fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeInLeft { from { opacity:0; transform:translateX(-30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeInRight { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }

        /* ── RESPONSIVE ───────────────────────────── */
        @media (max-width: 900px) {
          .hero { flex-direction: column; text-align: center; padding-top: 6rem; }
          .hero-content { max-width: 100%; }
          .hero-actions { justify-content: center; }
          .hero-visual { width: 100%; }
          .nav-links, .nav-ctas { display: none; }
          .hamburger { display: flex; margin-left: auto; }
        }
        @media (max-width: 600px) {
          .hero { padding: 5.5rem 1rem 3rem; }
          .features-section, .stats-section, .testimonials-section, .cta-section { padding: 4rem 1rem; }
          .mock-sidebar { display: none; }
          .landing-footer { padding: 1.5rem 1rem; }
          .footer-inner { flex-direction: column; align-items: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}
