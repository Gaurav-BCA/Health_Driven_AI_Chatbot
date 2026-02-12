# ArogyaAI - Health Driven AI Chatbot for Disease Awareness

ArogyaAI is a MERN stack-based web application designed to provide AI-driven health awareness and disease information. It features a conversational chatbot powered by advanced AI to help users understand symptoms, prevention methods, and general health guidelines.

## 🚀 Features

- **AI Chatbot**: Context-aware conversational AI for health queries.
- **Disease Awareness**: Information on various diseases like Dengue, Malaria, Tuberculosis, etc.
- **User Authentication**: Secure login and signup functionality.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Modern UI**: Built with React and TailwindCSS for a sleek user experience.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, TailwindCSS, Firebase
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI Integration**: Grok (configured in backend)

## 📂 Project Structure

```
ArogyaAI/
├── client/     # Frontend application (React + Vite)
└── server/     # Backend application (Express + MongoDB)
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js installed
- MongoDB installed or MongoDB Atlas connection string

### 1. Clone the Repository

```bash
git clone https://github.com/Gaurav-BCA/Health_Driven_AI_Chatbot_For_Disease_Awareness.git
cd ArogyaAI
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and add:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

Start the backend server:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd ../client
npm install
```

Start the frontend development server:

```bash
npm run dev
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.
