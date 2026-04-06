import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios.jsx';

export default function ContactCTA({ onDemo }) {
  const [form, setForm] = useState({ name:'', email:'', phone:'', restaurant:'', message:'' });
  const [errors, setErrors] = useState({});
  const [newsletter, setNewsletter] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [serverErr, setServerErr] = useState('');

  function validate() {
    const e = {};
    if(!form.name.trim()) e.name = 'Required';
    if(!form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) e.email = 'Invalid email';
    if(!form.phone.trim()) e.phone = 'Required';
    if(!form.restaurant.trim()) e.restaurant = 'Required';
    if(form.message.length < 10) e.message = 'Min 10 chars';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if(!validate()) return;
    setLoading(true);
    setServerMsg('');
    setServerErr('');
    try {
      const payload = { ...form };
      const res = await api.post('restaurants/contact', payload);
      setServerMsg(res?.data?.message || 'Request submitted');
      setForm({ name:'', email:'', phone:'', restaurant:'', message:'' });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Request failed';
      setServerErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function submitNewsletter(e) {
    e.preventDefault();
    if(!newsletter.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setNewsletterMsg('Enter a valid email');
      return;
    }
    setNewsletterMsg('Subscribed!');
    setNewsletter('');
  }

  const reveal = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <section id="contact" className="section">
      <motion.div
        className="contact-cta"
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
      >
        <h2>Ready to Transform Your Restaurant?</h2>
        <p>Request a personalized demo and discover how OrderByQR can streamline operations, elevate guest experience, and boost revenue.</p>
        <form className="contact-form" onSubmit={submit}>
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <input placeholder="Phone Number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          <input placeholder="Restaurant Name" value={form.restaurant} onChange={e=>setForm({...form,restaurant:e.target.value})} />
          <textarea placeholder="Message" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} />
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>{loading? 'Sending...' : 'Request a Demo'}</button>
            {/* <form onSubmit={submitNewsletter} className="newsletter">
              <input placeholder="Your email for updates" value={newsletter} onChange={e=>{setNewsletter(e.target.value); setNewsletterMsg('');}} />
              <button className="btn-secondary" type="submit">Subscribe</button>
            </form> */}
            {newsletterMsg && <small style={{color: newsletterMsg==='Subscribed!'? 'var(--color-accent)':'#ff8080'}}>{newsletterMsg}</small>}
          </div>
          {serverMsg && <div style={{marginTop:'0.5rem', color:'var(--color-accent)'}}>{serverMsg}</div>}
          {serverErr && <div style={{marginTop:'0.5rem', color:'#ff8080'}}>{serverErr}</div> }
        </form>
        <div style={{display:'grid', gap:'0.4rem', marginTop:'0.6rem'}}>
          {Object.entries(errors).map(([k,v])=> <small key={k} style={{color:'#ff8080'}}>{k}: {v}</small>)}
        </div>
      </motion.div>
    </section>
  );
}
