import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import "dotenv/config";
const app = express();
const port = 8000;

const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Myco", color: "red" },
  { id: 2, name: "Storm", color: "green" },
];

async function checkVisited() {
  const result = await db.query(
    // CONTINUE HERE
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const results = await db.query("SELECT * FROM users");
  users = results.rows;
  const countries = await checkVisited();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: "teal",
  });
});

app.get("/health", (req, res) => {
  res.sendStatus(200);
});
app.post("/add", async (req, res) => {
  const input = req.body["country"].toLowerCase();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  currentUserId = req.body.user;
  if (req.body.add) {
    res.redirect("/new");
  } else {
    res.redirect("/");
  }
});
app.get("/new", async (req, res) => {
  res.render("new.ejs");
});
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  try {
    const id = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
      [name, color]
    );
    currentUserId = id.rows[0].id;
    res.redirect("/");
  } catch (err) {
    if (err.code === "23505") {
      var error = "";
      error = "A user with this name already exists.";
    } else {
      error = "An error occurred. Please try again.";
    }
    res.render("new.ejs", { error: error });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
