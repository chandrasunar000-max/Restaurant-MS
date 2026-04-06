# OrderByQR - Modern Restaurant Management System

## Introduction
OrderByQR is a comprehensive restaurant management solution designed to streamline the dining experience. It allows customers to view menus and place orders directly from their tables using QR codes, while providing restaurant owners with a powerful dashboard to manage orders, menus.

## Synopsis
The project aims to modernize the traditional restaurant ordering process. By leveraging QR code technology, it reduces the need for physical menus and minimizes wait times. The system is split into a customer-facing public menu and a secure administrative dashboard for restaurant staff. Real-time updates are handled via WebSockets, ensuring seamless communication between the kitchen, waitstaff, and customers.

## Technologies Used
### Backend
- **Node.js & Express**: Fast and minimalist web framework for building the API.
- **MongoDB & Mongoose**: NoSQL database for flexible data storage and object modeling.
- **Socket.io**: Enables real-time, bi-directional communication for instant order notifications.
- **JWT (JSON Web Tokens)**: Secure authentication and authorization for restaurant accounts.
- **Nodemailer & Resend**: Robust email delivery for OTPs and notifications.
- **Firebase Admin**: Integrated for advanced administrative tasks and push notifications.
- **Sharp**: High-performance image processing for menu and logo uploads.

### Frontend
- **React**: Modern UI library for building a responsive and interactive user interface.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework for rapid and consistent styling.
- **Framer Motion**: Powerful animation library for smooth transitions and feedback.
- **Socket.io-client**: Real-time updates on the client side.
- **Recharts**: Data visualization for restaurant performance analytics.
- **Date-fns**: Lightweight library for date manipulation and formatting.
- **Lucide React**: Beautifully simple icons.

## Working
1. **Restaurant Onboarding**: Restaurant owners sign up, verify their email via OTP, and set up their profile, including their logo and UPI ID for payments.
2. **Menu Management**: Owners can create, edit, and categorize menu items with different sizes, spice levels, and dietary types.
3. **QR Generation**: The system generates unique QR codes for each table or room in the restaurant.
4. **Customer Experience**:
   - Customers scan the QR code to open the digital menu on their mobile browsers.
   - They can filter items, select sizes, and add them to their cart.
   - Orders are placed directly to the restaurant dashboard.
5. **Order Lifecycle**:
   - The restaurant dashboard receives real-time notifications of new orders.
   - Staff can accept, prepare, and mark orders as served or paid.
   - Customers receive live status updates (Pending -> Accepted -> Completed).
6. **Analytics**: Owners can track revenue, popular items, and customer trends through an intuitive analytics dashboard.

## Key Features
- **Real-time Order Tracking**: Instant updates for both staff and customers.
- **Dynamic Menu**: Easily update items, prices, and availability.
- **Geofencing**: Optional location-based ordering to ensure customers are physically present.
- **Analytics Dashboard**: Comprehensive insights into restaurant performance.
- **Mobile-First Design**: Optimized for a seamless experience on all devices.
