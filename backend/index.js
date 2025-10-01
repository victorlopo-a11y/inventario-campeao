import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Example auth route
app.post('/api/login', (req, res) => {
  // Implement login logic here
  res.json({ message: 'Login route (implement logic)' });
});
// oiiii
// Example protected route
app.get('/api/protected', (req, res) => {
  // Implement auth check here
  res.json({ message: 'Protected route (implement logic)' });
});

// Add more routes as needed

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
