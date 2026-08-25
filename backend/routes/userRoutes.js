import express from "express";
import User from "../models/User.js";

const router = express.Router();

// =========================
// ADD USER
// =========================

router.post("/add-user", async (req, res) => {
  try {
    const data = req.body;

    const newUser = new User(data);

    const newUserData = await newUser.save();

    res.send({
      success: true,
      message: "User Added Successfully",
      data: newUserData,
    });
  } catch (error) {
    console.error("Add user error:", error);

    res.status(500).send({
      success: false,
      message: "Error Adding User",
      error: error.message,
    });
  }
});

// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userData = await User.findOne({ email: email });

    if (!userData) {
      return res.send({
        success: false,
        message: "Email Or Password Is Invalid",
      });
    }

    const isPasswordMatch = password == userData.password;

    if (!isPasswordMatch) {
      return res.send({
        success: false,
        message: "Email Or Password Is Invalid",
      });
    }

    res.send({
      success: true,
      message: "Login Successfully",
      data: userData,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).send({
      success: false,
      message: "Login Error",
      error: error.message,
    });
  }
});

// =========================
// GET ALL STUDENTS
// =========================

router.get("/get-all-students", async (req, res) => {
  try {
    const allStudents = await User.find({
      role: "student",
    });

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

router.post("/delete-user", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.send({
        success: false,
        message: "User ID is required",
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

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

router.post("/update-user", async (req, res) => {
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

    // Only update password if a new password was provided
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
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
    console.error("Update user error:", error);

    res.status(500).send({
      success: false,
      message: "Error Updating Student",
      error: error.message,
    });
  }
});

export default router;