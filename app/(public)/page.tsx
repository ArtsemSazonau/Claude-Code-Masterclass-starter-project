import Link from "next/link"
import {
  Clock8,
  Briefcase,
  Footprints,
  Fingerprint,
  Paperclip,
} from "lucide-react"
import styles from "./page.module.css"

export default function Home() {
  return (
    <div className={styles.splash}>
      <div className={styles.grid} aria-hidden />
      <div className={styles.glow} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <header className={styles.dossier}>
        <span>CASE FILE №00·07</span>
        <span className={styles.dossierMid}>
          <span className={styles.stamp}>TOP SECRET</span>
          <span className={styles.dossierHide}>CLEARANCE · LVL 3</span>
        </span>
        <span>DEPT // SUPPLY CLOSET</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>
          <Paperclip className={styles.kickerIcon} strokeWidth={2.5} />
          Tiny missions · Tight windows · Great staplers
        </p>

        <h1 className={styles.title}>
          P
          <Clock8 className={styles.titleClock} strokeWidth={2.5} />
          cket Heist
        </h1>

        <p className={styles.tagline}>
          Your mission. <span className={styles.taglineEm}>Their</span> stapler.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/signup" className={styles.ctaPrimary}>
            Enlist the Crew
            <span className={styles.ctaArrow} aria-hidden>
              →
            </span>
          </Link>
          <Link href="/login" className={styles.ctaGhost}>
            Already on the inside?{" "}
            <span className={styles.ctaGhostLink}>Sign in</span>
          </Link>
        </div>

        <div className={styles.cards}>
          <article className={styles.card}>
            <span className={styles.cardNum}>FILE · 01</span>
            <Briefcase className={styles.cardIcon} strokeWidth={2} />
            <h3 className={styles.cardTitle}>Brief the Job</h3>
            <p className={styles.cardCopy}>
              Outline the caper over lukewarm coffee and the soft hum of the
              printer. Every heist starts with a Post-it.
            </p>
          </article>

          <article className={styles.card}>
            <span className={styles.cardNum}>FILE · 02</span>
            <Footprints className={styles.cardIcon} strokeWidth={2} />
            <h3 className={styles.cardTitle}>Assemble the Crew</h3>
            <p className={styles.cardCopy}>
              Recruit accomplices from accounting. Bribe with snacks. Promise
              everyone a corner desk.
            </p>
          </article>

          <article className={styles.card}>
            <span className={styles.cardNum}>FILE · 03</span>
            <Fingerprint className={styles.cardIcon} strokeWidth={2} />
            <h3 className={styles.cardTitle}>Pull the Caper</h3>
            <p className={styles.cardCopy}>
              Exfiltrate one stapler. Maybe two. Try not to make eye contact
              with Karen in HR.
            </p>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        · FOR YOUR EYES ONLY · DESTROY AFTER READING · IGNORE THE SHREDDER ·
      </footer>
    </div>
  )
}
