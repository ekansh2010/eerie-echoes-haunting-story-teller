# 🩸 Eerie Echoes — Haunting Story Teller 💀

An immersive, gothic-themed web platform for publishing, reading, and listening to bone-chilling horror stories. Featuring dynamic AI-generated covers, haunting audio controls, and an atmospheric user interface designed to send shivers down your spine.

![Eerie Echoes Demo](./frontend/public/images/demo.webp)

---

## 🌌 Features of the Void

### 🖤 Atmospheric User Experience
* **The Skull Intro**: A dark loading sequence featuring a glowing, pulse-animated interactive skull page that sets the stage before transitioning into the main horror feed.
* **Haunting Melodies**: Integrated background audio controllers allowing users to toggle ambient static or creepy tunes to enhance their reading experience.
* **Crimson & Dark Aesthetics**: Sleek glassmorphism, blood-red glow states, and customized masonry card layouts.

### 🤖 Dynamic AI-Generated Art
* Custom **horror cover illustrations** are auto-generated dynamically for every single published story!
* Uses the free **Pollinations AI** engine to craft gothic digital illustrations incorporating the story's title and category.
* Integrates a randomized seed value so that every story receives a completely unique cover illustration.

### 🛡️ Admin Banishment Panel
* Separate admin-only interface accessible solely by accounts flagged as `admin` (securely separated from general public users).
* **Quick Actions**: Force-feature stories, silence whispers (delete comments), delete users, or banish/delete stories into the void.
* Real-time statistical metrics displaying database storage and user activity.

### 🔐 Secure Authentication & Profiles
* Secure password hashing using `bcryptjs` and session tokens with `jsonwebtoken (JWT)`.
* User-specific profiles showing their published tales and applications for story adoptions.

---

## 🛠️ Built with the Occult (Tech Stack)

### Frontend:
* **React 18** & **Vite** (TypeScript)
* **Framer Motion** for smooth transitions and the pulsing skull animation
* **TailwindCSS** for layout and styling
* **Lucide React** for icons

### Backend & Database:
* **Node.js** & **Express**
* **MongoDB** & **Mongoose** (Object Modeling)
* **JWT (JSON Web Tokens)** for stateless user authentication
* **Nodemon** & **tsx** for active hot reloading

---

## 🧙‍♂️ How to Run Locally

### 1. Summon the Source Code
```bash
git clone https://github.com/ekansh2010/eerie-echoes-veil.git
cd "eerie-echoes haunting story teller"
```

### 2. Prepare the Incantations (Dependencies)
Install the dependencies for the workspace:
```bash
npm install
```

### 3. Setup the Shadow Realm (.env Config)
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/eerie_echoes
JWT_SECRET=haunting_eerie_echoes_secret_key_666
```

### 4. Unleash the App (Dev Mode)
Run both the React development client and Express server concurrently:
```bash
npm run dev
```
* **Frontend**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`

### 5. Build for Production
To build the static frontend files and compile:
```bash
npm run build
```
The server is configured to serve the frontend statically in production via the root `dist` directory.

---

## 💀 Contributing to the Dark
If you wish to make changes, summon a pull request. Make sure your code maintains the eerie aesthetic!
