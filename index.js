require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const callRoutes = require("./routes/call");
const webhookRoutes = require("./routes/webhook");
const exotelRoutes = require("./routes/exotel");

app.use("/call", callRoutes);
app.use("/webhook", webhookRoutes);
app.use("/exotel", exotelRoutes);


app.get("/", (req, res) => {
  res.send("AI Receptionist is live ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
