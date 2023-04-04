const express = require("express"); //importing Express & storing in express variable
const path = require("path"); // path for open object
const sqlite3 = require("sqlite3"); //Getting data from database & return to server
const bcrypt = require("bcrypt"); // For hashing & Comparing Password
const jwt = require("jsonwebtoken"); // For Token verification for API's

const dbPath = path.join(__dirname, "covid19IndiaPortal.db"); // Filename for open Object
const { open } = require("sqlite"); // provides connection to server & Database
const app = express(); // Instance is created
app.use(express.json()); // For Post/PUT SQL queries

let db = null;

//Database & Server Initialize

const initializeDBAndServer = async () => {
  try {
    // Try/Catch for exceptions
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    // db returns connection object from server to Database
    app.listen(3000, () => {
      console.log("Server running successfully");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Authentication Middleware. We have to write these for all API's, that means only user having these token is authorized to do something

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"]; //jwtToken is received from headers in app.http
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1]; //Getting token if [0] means Bearer
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid jwtToken");
  } else {
    jwt.verify(jwtToken, "secret_key", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid Token");
      } else {
        next(); // calls handler or another Middleware if present
      }
    });
  }
};

// GET STATES API
// First checks method & Url, next middleware, then handler
app.get("/states", authenticateToken, async (request, response) => {
  const stateQuery = `
    SELECT * FROM state`;
  const dbValue = await db.all(stateQuery); // db.all gets all data
  response.send(dbValue);
});

//GET STATE API

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
  SELECT * from state where state_id="${stateId}"`;
  const dbValue = await db.get(stateQuery); //db.get gets single row data
  response.send(dbValue);
});

//ADD District API
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addQuery = `
  INSERT INTO district(district_name, state_id, cases, cured, active, deaths)
  VALUES("${districtName}","${stateId}","${cases}","${cured}","${active}","${deaths}")`;
  const dbValue = await db.run(addQuery); //db.run for create or update
  response.send("District successfully added");
});

// GET District API
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getdisAPI = `
    SELECT * from district
    where district_id="${districtId}"`;
    const dbValue = await db.get(getdisAPI);
    response.send(dbValue);
  }
);

// DELETE District API
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    DELETE from district where district_id="${districtId}"`;
    const dbValue = await db.run(deleteQuery);
    response.send("Deleted District Successfully");
  }
);

// UPDATE District API
app.put(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const addQuery = `
      UPDATE district 
      SET district_name="${districtName}",state_id="${stateId}",cases="${cases}",cured="${cured}",active="${active}",deaths="${deaths}"
      WHERE district_id=${districtId}`; // In SET normal "" not backticks,comma is compulsory
    const dbValue = await db.run(addQuery);
    response.send("District Details Updated");
  }
);

//States Statistics API
// In app.http /states/1/stats, not states/:stateId/stats/ number to entered.In app.js /states/:stateId/stats/
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const statsQuery = `
    SELECT * FROM state NATURAL JOIN district
    WHERE state_id=${stateId}`;
    const dbValue = await db.all(statsQuery);
    response.send(dbValue);
  }
);

//Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userCheckQuery = `
    SELECT * FROM user WHERE username="${username}"`;
  const dbValue = await db.get(userCheckQuery);
  if (dbValue === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbValue.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "secret_key");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
