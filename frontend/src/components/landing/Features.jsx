import React from 'react';
import { motion } from 'framer-motion';
import data from '../../data/landingContent.json';

export default function Features() {
  const heading = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };
  const card = {
    hidden: { opacity: 0, y: 18 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.07 }
    })
  };

  return (
    <section id="features" className="section">
      <motion.h2
        variants={heading}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        Why Choose OrderByQR?
      </motion.h2>
      <div className="features-grid">
        {data.features.map((f, i) => (
          <motion.div
            key={i}
            className="feature-card"
            variants={card}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="feature-icon"><i className={`fa-solid ${f.icon}`}></i></div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
