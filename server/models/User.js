import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator'; // Make sure to import the validator library
import jwt from 'jsonwebtoken'; // Import jwt for token generation

const SECRET_KEY = process.env.JWT_SECRET; // Ensure you have your secret key set in environment variables

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("not valid email");
        }
      },
    },
    password: { type: String, required: true },
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: { type: String, default: "active", enum:["active","inactive"]},
    register_at: { type: Date, default: Date.now },
  },
  { timeseries: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.generateAuthToken = async function () {
  try {
    const newToken = jwt.sign({ _id: this._id }, SECRET_KEY, {
      expiresIn: "1d",
    });
    this.tokens = this.tokens.concat({ token: newToken });

    await this.save();
    return newToken;
  } catch (error) {
    throw new Error(error); // Use Error instead of res.status(400).json()
  }
};

export default mongoose.model("User", userSchema);
