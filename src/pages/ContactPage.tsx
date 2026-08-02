export default function ContactPage() {
  return (
    <div className="contact-page">
      <div className="container">
        <h1>Contact Us</h1>
        
        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>
              Have a question about your order or want to suggest a new design? 
              We'd love to hear from you.
            </p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <h3>Email</h3>
                <p>hello@soundsgoodtshirts.com</p>
              </div>
              
              <div className="contact-method">
                <h3>Response Time</h3>
                <p>We typically respond within 24 hours</p>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <h2>Send us a Message</h2>
            <form>
              <input
                type="text"
                placeholder="Your Name"
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                required
              />
              <input
                type="text"
                placeholder="Subject"
                required
              />
              <textarea
                placeholder="Your Message"
                rows={5}
                required
              ></textarea>
              <button type="submit">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
