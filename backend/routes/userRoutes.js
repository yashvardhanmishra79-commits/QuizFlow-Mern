import express from "express";
import User from "../models/User.js";
import {
  createSession,
  requireAdmin,
  revokeSession,
} from "../middleware/auth.js";
import {
  hashLegacyPassword,
  hashPassword,
  isArgon2EncodedValue,
  isArgon2idHash,
  PasswordPolicyError,
  verifyLegacyPassword,
  verifyPassword,
} from "../utils/passwordSecurity.js";

const router = express.Router();

// =========================
// ADD USER
// =========================

router.post("/add-user", requireAdmin, async (req, res) => {
  try {
    const { name, email, password, batch } = req.body;
    const newUser = new User({
      name,
      email,
      passwordHash: await hashPassword(password),
      batch,
      role: "student",
    });

    const newUserData = await newUser.save();

    res.send({
      success: true,
      message: "User Added Successfully",
      data: newUserData,
    });
  } catch (error) {
    if (error instanceof PasswordPolicyError) {
      return res.status(400).send({
        success: false,
        message: error.message,
      });
    }
    console.error("Add user error:", error?.name || "Error");

    res.status(500).send({
      success: false,
      message: "Error Adding User",
    });
  }
});

// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.send({
        success: false,
        message: "Email Or Password Is Invalid",
      });
    }

    let userData = await User.findOne({ email }).select(
      "+password +passwordHash +sessionVersion"
    );
    if (!userData) {
      return res.send({
        success: false,
        message: "Email Or Password Is Invalid",
      });
    }

    let passwordMatches = false;
    const storedPasswordHash = userData.passwordHash;
    if (isArgon2idHash(storedPasswordHash)) {
      passwordMatches = await verifyPassword(password, storedPasswordHash);
    } else if (typeof userData.password === "string") {
      const legacyPassword = userData.password;
      let replacementHash;

      if (isArgon2idHash(legacyPassword)) {
        passwordMatches = await verifyPassword(password, legacyPassword);
        if (passwordMatches) {
          replacementHash = legacyPassword;
        }
      } else if (
        !isArgon2EncodedValue(legacyPassword) &&
        verifyLegacyPassword(password, legacyPassword)
      ) {
        replacementHash = await hashLegacyPassword(legacyPassword);
        passwordMatches = true;
      }

      if (passwordMatches && replacementHash) {
        const hashCondition =
          storedPasswordHash === undefined
            ? { passwordHash: { $exists: false } }
            : { passwordHash: storedPasswordHash };
        const upgrade = await User.updateOne(
          {
            _id: userData._id,
            password: legacyPassword,
            ...hashCondition,
          },
          {
            $set: { passwordHash: replacementHash },
            $unset: { password: 1 },
          }
        );

        passwordMatches = upgrade.modifiedCount === 1;
        if (!passwordMatches) {
          userData = await User.findById(userData._id).select(
            "+password +passwordHash +sessionVersion"
          );
          if (isArgon2idHash(userData?.passwordHash)) {
            passwordMatches = await verifyPassword(
              password,
              userData.passwordHash
            );
          } else if (
            userData?.passwordHash === undefined &&
            isArgon2idHash(userData?.password)
          ) {
            passwordMatches = await verifyPassword(
              password,
              userData.password
            );
          }
        }
      }
    }

    if (!passwordMatches) {
      return res.send({
        success: false,
        message: "Email Or Password Is Invalid",
      });
    }

    const authToken = await createSession(
      userData._id,
      userData.sessionVersion ?? 0
    );
    const safeUserData = userData.toObject();
    delete safeUserData.password;
    delete safeUserData.passwordHash;

    res.send({
      success: true,
      message: "Login Successfully",
      data: safeUserData,
      authToken,
    });
  } catch (error) {
    console.error("Login error:", error?.name || "Error");

    res.status(500).send({
      success: false,
      message: "Login Error",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");
    if (scheme === "Bearer" && token) {
      await revokeSession(token);
    }

    return res.send({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error?.name || "Error");
    return res.status(500).send({
      success: false,
      message: "Unable to end the server session.",
    });
  }
});

// =========================
// GET ALL STUDENTS
// =========================

router.get("/get-all-students", requireAdmin, async (req, res) => {
  try {
    const allStudents = await User.find({ role: "student" }).select(
      "-password"
    );

    res.send({
      success: true,
      message: "Success",
      data: allStudents,
    });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).send({
      success: false,
      message: "Error Fetching Students",
      error: error.message,
    });
  }
});

// =========================
// DELETE USER
// =========================

router.post("/delete-user", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.send({
        success: false,
        message: "User ID is required",
      });
    }

    const deletedUser = await User.findOneAndDelete({
      _id: userId,
      role: "student",
    });

    if (!deletedUser) {
      return res.send({
        success: false,
        message: "Student not found",
      });
    }

    res.send({
      success: true,
      message: "Student Deleted Successfully",
      data: deletedUser,
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).send({
      success: false,
      message: "Error Deleting Student",
      error: error.message,
    });
  }
});

// =========================
// UPDATE USER
// =========================

router.post("/update-user", requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      password,
      batch,
    } = req.body;

    if (!userId) {
      return res.send({
        success: false,
        message: "User ID is required",
      });
    }

    const updateData = {
      name,
      email,
      batch,
    };

    if (password !== undefined && password !== "") {
      if (typeof password !== "string") {
        return res.status(400).send({
          success: false,
          message: "Password must be a string.",
        });
      }
      if (password.trim() !== "") {
        updateData.passwordHash = await hashPassword(password);
      }
    }

    const update = { $set: updateData };
    if (updateData.passwordHash) {
      update.$unset = { password: 1 };
      update.$inc = { sessionVersion: 1 };
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, role: "student" },
      update,
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.send({
        success: false,
        message: "Student not found",
      });
    }

    res.send({
      success: true,
      message: "Student Updated Successfully",
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof PasswordPolicyError) {
      return res.status(400).send({
        success: false,
        message: error.message,
      });
    }
    console.error("Update user error:", error?.name || "Error");

    res.status(500).send({
      success: false,
      message: "Error Updating Student",
    });
  }
});

export default router;