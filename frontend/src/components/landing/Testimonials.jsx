import React from 'react';
import { motion } from 'framer-motion';
import data from '../../data/landingContent.json';

export default function Testimonials() {
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
    <section className="section testimonials">
      <motion.h2
        variants={heading}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        Loved by Modern Restaurants
      </motion.h2>
      <div className="testimonial-carousel">
        {data.testimonials.map((t, i) => (
          <motion.div
            key={i}
            className="testimonial"
            variants={card}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="stars">{'★'.repeat(t.stars)}</div>
            <p className="quote">“{t.quote}”</p>
            <h4>{t.name}</h4>
            <small style={{color:'var(--color-muted)'}}>{t.role}</small>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
