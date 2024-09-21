import User from "../models/User.js";
import jwt from "jsonwebtoken";
import geolib from "geolib";

export const createUser = async (req, res) => {
  const { name, email, password, address, latitude, longitude, status } =
    req.body;

  if (!name || !email || !password || !address || !latitude || !longitude) {
    return res
      .status(400)
      .json({ status_code: 400, message: "All inputs are required" });
  }

  try {
    const preuser = await User.findOne({ email });

    if (preuser) {
      return res
        .status(409)
        .json({ status_code: 409, message: "This user already exists" });
    }

    if (status && status !== "active" && status !== "inactive") {
      return res
        .status(400)
        .json({
          status_code: 400,
          message: "Status must be active or inactive",
        });
    }

    const user = new User({
      name,
      email,
      password,
      address,
      latitude,
      longitude,
      status: status || "active",
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(201).json({
      status_code: 201,
      message: "User created successfully",
      data: {
        name: user.name,
        email: user.email,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        status: user.status,
        register_at: user.register_at,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ status_code: 500, message: error.message });
  }
};

export const changeUserStatus = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      return res
        .status(404)
        .json({ status_code: 404, message: "No users found in the database." });
    }

    await User.updateMany({}, [
      {
        $set: {
          status: {
            $cond: {
              if: { $eq: ["$status", "active"] },
              then: "inactive",
              else: "active",
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      status_code: 200,
      message: "All users' status has been changed successfully.",
    });
  } catch (error) {
    console.error("Error changing user status:", error);
    return res.status(500).json({
      status_code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getDistance = async (req, res) => {
  try {
    const { latitude2, longitude2 } = req.query;

    if (!latitude2 || !longitude2) {
      return res
        .status(400)
        .json({
          status_code: 400,
          message: "Destination coordinates required.",
        });
    }

    const user = req.user;
    if (!user || !user.latitude || !user.longitude) {
      return res
        .status(400)
        .json({ status_code: 400, message: "User coordinates not found." });
    }

    const destLat = parseFloat(latitude2);
    const destLon = parseFloat(longitude2);

    if (isNaN(destLat) || isNaN(destLon)) {
      return res
        .status(400)
        .json({
          status_code: 400,
          message: "Invalid destination coordinates provided",
        });
    }

    const distance = geolib.getDistance(
      { latitude: user.latitude, longitude: user.longitude },
      { latitude: destLat, longitude: destLon }
    );

    return res.status(200).json({
      status_code: 200,
      message: "Distance calculated successfully",
      distance: `${(distance / 1000).toFixed(2)} km`,
    });
  } catch (error) {
    console.error("Error calculating distance:", error);
    return res
      .status(500)
      .json({ status_code: 500, message: "Internal Server Error" });
  }
};

export const getUserListingByWeekday = async (req, res) => {
  const { week_number } = req.body;

  if (
    week_number === undefined ||
    week_number === null ||
    (Array.isArray(week_number) && week_number.length === 0)
  ) {
    return res
      .status(400)
      .json({
        status_code: 400,
        message: "Week number is required and cannot be empty",
      });
  }

  let weekNumbers;

  if (Array.isArray(week_number)) {
    if (
      !week_number.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    ) {
      return res
        .status(400)
        .json({
          status_code: 400,
          message: "Week number array must contain integers from 0 to 6",
        });
    }
    weekNumbers = week_number.map((day) => day + 1); // Adjust for MongoDB's $dayOfWeek (Sunday = 1)
  } else if (
    Number.isInteger(week_number) &&
    week_number >= 0 &&
    week_number <= 6
  ) {
    weekNumbers = [week_number + 1];
  } else {
    return res
      .status(400)
      .json({
        status_code: 400,
        message:
          "Week number must be an integer between 0 and 6 or an array of such integers",
      });
  }

  try {
    const daysOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const users = await User.aggregate([
      {
        $project: {
          name: 1,
          email: 1,
          dayOfWeek: { $dayOfWeek: "$register_at" }, // MongoDB week starts with Sunday = 1
        },
      },
      { $match: { dayOfWeek: { $in: weekNumbers } } },
      {
        $group: {
          _id: "$dayOfWeek",
          users: { $push: { name: "$name", email: "$email" } },
        },
      },
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        status_code: 404,
        message: "No data found for the specified week number.",
      });
    }

    const usersByDay = {};
    users.forEach((group) => {
      const dayIndex = group._id - 1; // Convert dayOfWeek back to 0-6
      usersByDay[daysOfWeek[dayIndex]] = group.users;
    });

    return res.status(200).json({
      status_code: 200,
      message: "Weekly data retrieved",
      data: usersByDay,
    });
  } catch (error) {
    return res.status(500).json({ status_code: 500, message: error.message });
  }
};
