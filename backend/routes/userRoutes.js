import express from "express";
import Batch from "../models/Batch.js";
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
import {
  isDuplicateKeyError,
  isValidationError,
  requireObjectBody,
  requireText,
  validateEmail,
  validateObjectId,
} from "../utils/validation.js";
import { withBatchAssignment } from "../utils/batchAssignments.js";

const router = express.Router();

function safeStudentData(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    batch: user.batch,
  };
}

function emailLookup(email) {
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { email: { $regex: `^${escapedEmail}$`, $options: "i" } };
}

function sendRouteError(res, error, fallbackMessage) {
  if (error instanceof PasswordPolicyError || isValidationError(error)) {
    return res.status(400).send({ success: false, message: error.message });
  }
  if (error.statusCode === 400) {
    return res.status(400).send({ success: false, message: error.message });
  }
  if (error.statusCode === 404) {
    return res.status(404).send({ success: false, message: error.message });
  }
  if (error.statusCode === 409) {
    return res.status(409).send({ success: false, message: error.message });
  }
  if (isDuplicateKeyError(error)) {
    return res.status(409).send({
      success: false,
      message: "An account with this email address already exists.",
    });
  }
  console.error(fallbackMessage, error?.name || "Error");
  return res.status(500).send({ success: false, message: fallbackMessage });
}

router.post("/add-user", requireAdmin, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const name = requireText(body.name, "Name", 100);
    const email = validateEmail(body.email);
    const password = body.password;
    const batch = validateObjectId(body.batch, "batch ID");
    if (typeof password !== "string") {
      return res.status(400).send({
        success: false,
        message: "Password must be a string.",
      });
    }
    if (await User.findOne(emailLookup(email))) {
      return res.status(409).send({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const newUser = new User({
      name,
      email,
      emailNormalized: email,
      passwordHash: await hashPassword(password),
      batch,
      role: "student",
    });

    const newUserData = await withBatchAssignment(batch, () =>
      newUser.save()
    );

    return res.status(201).send({
      success: true,
      message: "User Added Successfully",
      data: safeStudentData(newUserData),
    });
  } catch (error) {
    return sendRouteError(res, error, "Unable to add user.");
  }
});

// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const email = validateEmail(body.email);
    const password = body.password;
    if (
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > 1024 * 1024
    ) {
      return res.status(400).send({
        success: false,
        message: "Email or password is invalid.",
      });
    }

    let userData = await User.findOne(emailLookup(email)).select(
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
    const safeUserData = safeStudentData(userData);

    res.send({
      success: true,
      message: "Login Successfully",
      data: safeUserData,
      authToken,
    });
  } catch (error) {
    return sendRouteError(res, error, "Unable to sign in.");
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
      "-password -passwordHash -sessionVersion"
    );

    return res.send({
      success: true,
      message: "Success",
      data: allStudents.map(safeStudentData),
    });
  } catch (error) {
    return sendRouteError(res, error, "Unable to fetch students.");
  }
});

// =========================
// DELETE USER
// =========================

router.post("/delete-user", requireAdmin, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const userId = validateObjectId(body.userId, "user ID");

    const deletedUser = await User.findOneAndDelete({
      _id: userId,
      role: "student",
    });

    if (!deletedUser) {
      return res.status(404).send({
        success: false,
        message: "Student not found.",
      });
    }

    return res.send({
      success: true,
      message: "Student Deleted Successfully",
      data: safeStudentData(deletedUser),
    });
  } catch (error) {
    return sendRouteError(res, error, "Unable to delete student.");
  }
});

// =========================
// UPDATE USER
// =========================

router.post("/update-user", requireAdmin, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const userId = validateObjectId(body.userId, "user ID");
    const name = requireText(body.name, "Name", 100);
    const email = validateEmail(body.email);
    const batch = validateObjectId(body.batch, "batch ID");
    const password = body.password;
    const duplicateEmail = await User.findOne({
      ...emailLookup(email),
      _id: { $ne: userId },
    });
    if (duplicateEmail) {
      return res.status(409).send({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const updateData = {
      name,
      email,
      emailNormalized: email,
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

    const updatedUser = await withBatchAssignment(batch, () =>
      User.findOneAndUpdate(
        { _id: userId, role: "student" },
        update,
        {
          new: true,
        }
      )
    );

    if (!updatedUser) {
      return res.status(404).send({
        success: false,
        message: "Student not found.",
      });
    }

    return res.send({
      success: true,
      message: "Student Updated Successfully",
      data: safeStudentData(updatedUser),
    });
  } catch (error) {
    return sendRouteError(res, error, "Unable to update student.");
  }
});

export default router;