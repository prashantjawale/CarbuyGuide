const express = require("express");
const path = require("path");
const session = require("express-session");

const homeRoutes = require("./routes/homeRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const carsRoutes = require("./routes/carsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "carbuyguide-session-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Routes
app.use("/", homeRoutes);
app.use("/find-my-car", assistantRoutes);
app.use("/cars", carsRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("error", { title: "Page Not Found", message: "The page you're looking for doesn't exist." });
});

app.listen(PORT, () => {
  console.log(`🚗 CarbuyGuide running at http://localhost:${PORT}`);
});

module.exports = app;
