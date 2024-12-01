require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("emedicine");
    const usercollection = db.collection("users");
    const medicinecollection = db.collection("medicine");
    const ordersCollection = db.collection("orders");

    // get all medicine
    app.get("/medicines", async (req, res) => {
      try {
        const medicines = await medicinecollection.find().toArray();
        res.json(medicines);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // get all orders
    app.get("/orders", async (req, res) => {
      try {
        const orders = await ordersCollection.find().toArray();
        res.json(orders);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // order find

    app.get("/orders", async (req, res) => {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const orders = await ordersCollection
        .find({ userEmail: email })
        .toArray(); // Fetch orders from your database
      res.json(orders);
    });

    // User Registration
    app.post("/register", async (req, res) => {
      const { username, email, password } = req.body;

      // Check if email already exists
      const existingUser = await usercollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exist!!!",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await usercollection.insertOne({
        username,
        email,
        password: hashedPassword,
        role: "user",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully!",
      });
    });

    // User Login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await usercollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      res.json({
        success: true,
        message: "User successfully logged in!",
        accessToken: token,
      });
    });

    // Place Order
    app.post("/orders", async (req, res) => {
      const { useremail, cart, totalPrice, shippingAddress } = req.body;

      // Check if user exists
      const user = await usercollection.findOne({ email: useremail });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Create new order data
      const order = {
        userEmail: useremail, // <-- Use useremail here
        cart,
        totalPrice,
        shippingAddress,
        orderDate: new Date(),
        status: "Pending",
      };

      // Insert the order into the orders collection
      await ordersCollection.insertOne(order);

      res.status(201).json({
        success: true,
        message: "Order placed successfully!",
      });
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
