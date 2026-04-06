import React from 'react';
import { motion } from 'framer-motion';
import data from '../../data/landingContent.json';

export default function Pricing({ onGetStarted }) {
  const heading = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };
  const section = {
    hidden: { opacity: 0, y: 18 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.08 }
    })
  };
  const card = {
    hidden: { opacity: 0, y: 18 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.06 }
    })
  };

  return (
    <section id="pricing" className="section">
      <motion.h2
        variants={heading}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        Simple & Transparent Pricing
      </motion.h2>

      <div className="pricing-sections">
        {Object.entries(data.pricing).map(([key, sectionData], i) => (
          <motion.div
            key={key}
            className="pricing-section"
            variants={section}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <h3>{sectionData.title}</h3>
            <div className="pricing-grid">
              {sectionData.plans.map((p, idx) => (
                <motion.div
                  key={idx}
                  className={`plan-card ${p.popular ? 'popular' : ''}`}
                  variants={card}
                  custom={idx}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                >
                  {p.popular && <div className="badge">MOST POPULAR</div>}
                  <h4>{p.type}</h4>

                  <div className="price-row" style={{marginTop:'0.5rem'}}>
                    <div className="plan-price" style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{p.price}</div>
                  </div>

                  <ul className="plan-features">
                    {p.features.map((f, i2) => <li key={i2}>{f}</li>)}
                  </ul>

                  {p.details && <div className="plan-details" style={{marginTop:'0.5rem', color:'var(--color-muted)'}}>{p.details}</div>}
                  <button className="btn-primary" onClick={() => onGetStarted(p.type)} style={{marginTop:'0.75rem'}}>Choose {p.type}</button>
                  {p.note && <div className="plan-note" style={{marginTop:'0.5rem', color:'var(--color-muted)'}}>{p.note}</div>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
