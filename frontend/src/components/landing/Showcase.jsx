import React from 'react';
import { motion } from 'framer-motion';

export default function Showcase() {
  const reveal = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <section className="section">
      <div className="showcase">
        <motion.div
          className="showcase-text"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2>Built for restaurants of every size — cafes, diners, and fine dining.</h2>
          <p style={{color:'var(--color-muted)'}}>Scale effortlessly from a single cafe to a multi-location chain with unified control, instant updates, and real-time analytics.</p>
        </motion.div>
        <motion.div
          className="showcase-media"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.12 }}
        >
          <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1100&q=60" alt="Restaurant ambience" />
        </motion.div>
      </div>
    </section>
  );
}
