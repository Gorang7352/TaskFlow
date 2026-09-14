const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // Main roles
    roles: {
      type: [String],
      enum: ["user", "admin"],
      default: ["user"],
    },

    // Backward compatibility
    role: {
      type: String,
      enum: ["user", "admin"],
    },

    // Admin whose user-list this Normal User belongs to
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);