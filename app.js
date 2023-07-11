const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at 3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

const convertCase = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
  };
};

initializeDBAndServer();

//Get List of all states
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT * FROM state ORDER BY state_id;
    
    `;
  const statesList = await db.all(getStatesQuery);
  response.send(statesList.map((eachState) => convertCase(eachState)));
});

//Get state based on stateId
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getState = `
        SELECT * FROM state WHERE state_id = ${stateId};`;
  const dbResponse = await db.get(getState);
  response.send(convertCase(dbResponse));
});

//Create district
app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;
  const createDistrict = `
        INSERT INTO 
            district(district_name, state_id, cases, cured, active, deaths)
        VALUES(
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths}
        );
    `;
  const createdDistrict = await db.run(createDistrict);
  response.send("District Successfully Added");
});

///Get District
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `
        SELECT * FROM district WHERE district_id = ${districtId};
    `;
  const district = await db.get(getDistrict);
  response.send(convertCase(district));
});

//Delete district
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
        DELETE FROM district WHERE district_id = ${districtId};
    `;
  const deleteResponse = await db.run(deleteDistrict);
  response.send("District Removed");
});

//update District
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updateDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = updateDetails;
  const updateDistrict = `
        UPDATE district 
        SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE district_id = ${districtId};`;
  const updated = await db.run(updateDistrict);
  response.send("District Details Updated");
});

///Get stats
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    SELECT SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId};`;
  const statResponse = await db.get(getStatsQuery);
  response.send(convertCase(statResponse));
});

///Get stateName
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `
        SELECT state_name
        FROM state JOIN district 
            ON state.state_id = district.state_id
        WHERE district.district_id = ${districtId};
    `;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
