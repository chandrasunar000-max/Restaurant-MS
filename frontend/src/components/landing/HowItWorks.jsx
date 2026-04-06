import React from 'react';
import { motion } from 'framer-motion';
import data from '../../data/landingContent.json';

export default function HowItWorks() {
  const heading = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };
  const step = {
    hidden: { opacity: 0, y: 18 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.07 }
    })
  };

  return (
    <section id="how" className="section">
      <motion.h2
        style={{ color: "black" }}
        variants={heading}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        How It Works
      </motion.h2>
      <div className="hiw-steps">
        {data.steps.map((s, i) => (
          <motion.div
            key={i}
            className="step"
            variants={step}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="step-number">{i + 1}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
