const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  register,
  login,
  logout,
  dashboard,
  getProfile,
  updateProfile,
  getLoginHistory,
  updateLoginLog,
  getAllLoginHistory,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  getObserverSessions,
  getObserverSessionById,
  deleteObserverSession
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", auth, logout);

/* ===== NEW ROUTES ===== */
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

router.get("/login-history", auth, getLoginHistory);
router.put("/login-history", auth, updateLoginLog);
router.get("/all-login-logs", auth, getAllLoginHistory);

/* ===== USERS CRUD (Registration DB) ===== */
router.get("/users", auth, getAllUsers);
router.get("/users/:id", auth, getUserById);
router.put("/users/:id", auth, updateUser);
router.delete("/users/:id", auth, deleteUser);

/* ===== OBSERVER SESSIONS ===== */
router.get("/observer-sessions", auth, getObserverSessions);
router.get("/observer-sessions/:id", auth, getObserverSessionById);
router.delete("/observer-sessions/:id", auth, deleteObserverSession);

/* ===== MACHINES CRUD ===== */
router.get("/", getMachines);
router.get("/:id", getMachineById);
router.post("/", createMachine);
router.put("/:id", updateMachine);
router.delete("/:id", deleteMachine);

module.exports = router;
