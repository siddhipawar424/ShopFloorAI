const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const registerDB = require("../config/dbRegister");
const loginDB = require("../config/dbLogin");
const machineDB = require("../config/dbMachine");
const observerDB = require("../config/dbObserver");

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const userRole = role || "user";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await registerDB.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role",
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ message: "Email already exists" });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await registerDB.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role || "user" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: `${process.env.JWT_EXPIRATION_HOURS}h` }
    );

    // Save login timestamp (inserts historical log entry)
    await loginDB.query(
      "INSERT INTO login_logs (user_id, email, login_time) VALUES ($1, $2, NOW())",
      [user.id, user.email]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ================= LOGOUT ================= */
exports.logout = async (req, res) => {
  try {
    // Find the latest active login record for this user and set logout_time to now
    await loginDB.query(
      "UPDATE login_logs SET logout_time = NOW() WHERE id = (SELECT id FROM login_logs WHERE user_id = $1 AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1)",
      [req.user.id]
    );
    res.json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout log error:", err);
    res.status(500).json({ message: "Logout log failed" });
  }
};

/* ================= DASHBOARD (TEST ROUTE) ================= */
exports.dashboard = async (req, res) => {
  res.json({
    message: `Welcome ${req.user.name}`,
    user: req.user,
  });
};

/* ================= GET USER PROFILE ================= */
exports.getProfile = async (req, res) => {
  try {
    const result = await registerDB.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
};

/* ================= UPDATE USER PROFILE ================= */
exports.updateProfile = async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await registerDB.query(
      "UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING id,name,email,role",
      [name, email, req.user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(400).json({ message: "Update failed" });
  }
};

/* ================= GET LOGIN HISTORY (SINGLE USER) ================= */
exports.getLoginHistory = async (req, res) => {
  try {
    const result = await loginDB.query(
      "SELECT id, user_id, email, login_time, logout_time FROM login_logs WHERE user_id=$1 ORDER BY login_time DESC",
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching login history" });
  }
};

/* ================= UPDATE LOGIN RECORD ================= */
exports.updateLoginLog = async (req, res) => {
  const { login_time, logout_time } = req.body;

  try {
    const result = await loginDB.query(
      "UPDATE login_logs SET login_time=$1, logout_time=$2 WHERE user_id=$3 RETURNING *",
      [login_time, logout_time, req.user.id]
    );

    res.json({
      message: "Login log updated",
      data: result.rows,
    });
  } catch (err) {
    res.status(400).json({ message: "Login log update failed" });
  }
};

/* ================= GET ALL LOGIN HISTORY (ADMIN ONLY) ================= */
exports.getAllLoginHistory = async (req, res) => {
  try {
    // Role protection
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Step 1: fetch all login logs
    const logsResult = await loginDB.query(
      "SELECT id, user_id, email, login_time, logout_time FROM login_logs ORDER BY login_time DESC"
    );

    // Step 2: fetch all users from registration DB to map names and roles
    const usersResult = await registerDB.query(
      "SELECT id, name, email, role FROM users"
    );

    const userMap = {};
    usersResult.rows.forEach((u) => {
      userMap[u.id] = { name: u.name, role: u.role };
    });

    // Step 3: merge results
    const logs = logsResult.rows.map((log) => ({
      ...log,
      name: userMap[log.user_id]?.name || "Unknown User",
      role: userMap[log.user_id]?.role || "user",
    }));

    res.json(logs);
  } catch (err) {
    console.error("Error fetching all login logs:", err);
    res.status(500).json({ message: "Error fetching all login logs" });
  }
};

/* ================= GET ALL USERS (WITH LOGIN STATISTICS) ================= */
exports.getAllUsers = async (req, res) => {
  try {
    // Role protection
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Step 1: fetch users from registration DB
    const usersResult = await registerDB.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC"
    );

    // Step 2: fetch aggregate login frequencies and timestamps from login DB
    const statsResult = await loginDB.query(
      "SELECT user_id, COUNT(*) as login_count, MAX(login_time) as last_login FROM login_logs GROUP BY user_id"
    );

    // Step 3: check which users are currently online (logout_time is NULL in their latest log)
    const activeResult = await loginDB.query(
      "SELECT DISTINCT ON (user_id) user_id, logout_time FROM login_logs ORDER BY user_id, login_time DESC"
    );

    const statsMap = {};
    statsResult.rows.forEach(row => {
      statsMap[row.user_id] = {
        count: parseInt(row.login_count) || 0,
        lastLogin: row.last_login
      };
    });

    const activeMap = {};
    activeResult.rows.forEach(row => {
      activeMap[row.user_id] = !row.logout_time; // true if logout_time is NULL
    });

    // Step 4: merge
    const usersWithStats = usersResult.rows.map(u => {
      const stats = statsMap[u.id] || { count: 0, lastLogin: null };
      return {
        ...u,
        login_count: stats.count,
        last_login: stats.lastLogin,
        is_online: !!activeMap[u.id]
      };
    });

    res.json(usersWithStats);
  } catch (err) {
    console.error("Error fetching users with stats:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/* ================= GET USER BY ID ================= */
exports.getUserById = async (req, res) => {
  try {
    // Role protection
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const result = await registerDB.query(
      "SELECT id, name, email, role FROM users WHERE id=$1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user" });
  }
};

/* ================= UPDATE USER ================= */
exports.updateUser = async (req, res) => {
  const { name, email, role } = req.body;

  try {
    // Role protection
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const result = await registerDB.query(
      "UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id,name,email,role",
      [name, email, role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(400).json({ message: "Update failed" });
  }
};

/* ================= DELETE USER ================= */
exports.deleteUser = async (req, res) => {
  try {
    // Role protection
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const userId = req.params.id;

    // 1. Delete user from users table (registerDB)
    const result = await registerDB.query(
      "DELETE FROM users WHERE id=$1 RETURNING *",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Cascade delete login logs for this user (loginDB)
    await loginDB.query(
      "DELETE FROM login_logs WHERE user_id=$1",
      [userId]
    );

    res.json({
      message: "User and their log history deleted successfully",
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};

/* ================= GET ALL MACHINES ================= */
exports.getMachines = async (req, res) => {
  try {
    const result = await machineDB.query("SELECT * FROM machine_status ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching machines" });
  }
};

/* ================= GET SINGLE MACHINE ================= */
exports.getMachineById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await machineDB.query("SELECT * FROM machine_status WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Machine not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching machine" });
  }
};

/* ================= CREATE MACHINE ================= */
exports.createMachine = async (req, res) => {
  const { name, model, location, status, efficiency, last_maintenance, next_maintenance, operator, power_usage, temperature } = req.body;

  try {
    const result = await machineDB.query(
      `INSERT INTO machine_status
      (name, model, location, status, efficiency, last_maintenance, next_maintenance, operator, power_usage, temperature)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, model, location, status, efficiency, last_maintenance, next_maintenance, operator, power_usage, temperature]
    );

    res.status(201).json({ message: "Machine created successfully", machine: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error creating machine" });
  }
};

/* ================= UPDATE MACHINE ================= */
exports.updateMachine = async (req, res) => {
  const { id } = req.params;
  const { name, model, location, status, efficiency, last_maintenance, next_maintenance, operator, power_usage, temperature } = req.body;

  try {
    const result = await machineDB.query(
      `UPDATE machine_status SET
      name=$1, model=$2, location=$3, status=$4, efficiency=$5,
      last_maintenance=$6, next_maintenance=$7, operator=$8,
      power_usage=$9, temperature=$10, updated_at=NOW()
      WHERE id=$11 RETURNING *`,
      [name, model, location, status, efficiency, last_maintenance, next_maintenance, operator, power_usage, temperature, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Machine not found" });

    res.json({ message: "Machine updated successfully", machine: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error updating machine" });
  }
};

/* ================= DELETE MACHINE ================= */
exports.deleteMachine = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await machineDB.query("DELETE FROM machine_status WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Machine not found" });
    res.json({ message: "Machine deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error deleting machine" });
  }
};

/* ================= GET ALL OBSERVER SESSIONS (ADMIN ONLY) ================= */
exports.getObserverSessions = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const result = await observerDB.query(
      "SELECT session_id, user_id, session_type, agent_id, team_id, workflow_id, created_at, updated_at, session_data FROM observer_sessions ORDER BY created_at DESC NULLS LAST, updated_at DESC NULLS LAST"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching observer sessions:", err);
    res.status(500).json({ message: "Error fetching observer sessions" });
  }
};

/* ================= GET SINGLE OBSERVER SESSION (ADMIN ONLY) ================= */
exports.getObserverSessionById = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const result = await observerDB.query(
      "SELECT * FROM observer_sessions WHERE session_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching observer session by ID:", err);
    res.status(500).json({ message: "Error fetching observer session" });
  }
};

/* ================= DELETE OBSERVER SESSION (ADMIN ONLY) ================= */
exports.deleteObserverSession = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    const result = await observerDB.query(
      "DELETE FROM observer_sessions WHERE session_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ message: "Observer session deleted successfully" });
  } catch (err) {
    console.error("Error deleting observer session:", err);
    res.status(500).json({ message: "Error deleting observer session" });
  }
};