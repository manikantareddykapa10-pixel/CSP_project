const userModel = require('../models/userModel.js')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

const registerController = async (req, res) => {
    try {
      const exisitingUser = await userModel.findOne({ email: req.body.email });
      //validation
      if (exisitingUser) {
        return res.status(200).send({
          success: false,
          message: "User ALready exists",
        });
      }
      //hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashedPassword;
      //rest data
      const user = new userModel(req.body);
      await user.save();
      return res.status(201).send({
        success: true,
        message: "User Registerd Successfully",
        user,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        success: false,
        message: "Error In Register API",
        error,
      });
    }
  };

const loginController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    //check role
    if (user.role !== req.body.role) {
      return res.status(500).send({
        success: false,
        message: "role dosent match",
      });
    }
    //compare password
    const comparePassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!comparePassword) {
      return res.status(500).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    return res.status(200).send({
      success: true,
      message: "Login Successfully",
      token,
      user,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Login API",
      error,
    });
  }
};

const currentUserController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });
    return res.status(200).send({
      success: true,
      message: "User Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "error in getting current user",
      error,
    });
  }
};

const updateLocationController = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.body.userId;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });
    const { getDb } = require('../config/db');
    const db = getDb();
    db.prepare('UPDATE users SET location_lat = ?, location_lng = ?, updatedAt = ? WHERE _id = ?')
      .run(lat, lng, new Date().toISOString(), userId);
    return res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
};

const updateProfilePictureController = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (typeof profilePic !== 'string' ||
        !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(profilePic)) {
      return res.status(400).json({ success: false, message: 'Choose a JPEG, PNG, or WebP profile picture.' });
    }

    const imageData = profilePic.slice(profilePic.indexOf(',') + 1);
    if (Buffer.from(imageData, 'base64').length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Profile picture must be 2 MB or smaller.' });
    }

    const db = getDb();
    const result = db.prepare(
      "UPDATE users SET profilePic = ?, updatedAt = ? WHERE _id = ? AND role = 'donar'"
    ).run(profilePic, new Date().toISOString(), req.body.userId);

    if (result.changes === 0) {
      return res.status(403).json({ success: false, message: 'Only donor accounts can update a donor profile picture.' });
    }

    return res.status(200).json({ success: true, message: 'Profile picture updated.', profilePic });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile picture.' });
  }
};

module.exports = {
  registerController,
  loginController,
  currentUserController,
  updateLocationController,
  updateProfilePictureController
};