import React from 'react';
import { motion } from 'framer-motion';

export default function Hero({ onVideo }) {
  const reveal = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <section id="home" className="hero-landing" style={{marginBottom: "32px"}}>
      <motion.div
        className="hero-left"
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <h1>Digitize Your Restaurant Experience with QR Ordering</h1>
        <p className="sub">Empower your customers to browse, order, and pay directly from their table.</p>
        {/* <div className="hero-actions">
          <button className="btn-secondary" onClick={onVideo}>
            <i className="fa-solid fa-play"></i> Watch How It Works
          </button>
        </div> */}
      </motion.div>
      <motion.div
        className="hero-right"
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        transition={{ delay: 0.12 }}
      >
        <div className="mockup-img">
          <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=60" alt="QR on table" />
        </div>
      </motion.div>
    </section>
  );
}
