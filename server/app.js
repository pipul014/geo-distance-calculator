import express from 'express';
import connectDB from './database/db.js';
import userRoutes from './routes/userRoutes.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// app.use("/",(req,res)=>{res.send("server is running")})

// Routes
app.use('/api/users', userRoutes);

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`server is connected on http://localhost:${port}`);
});
