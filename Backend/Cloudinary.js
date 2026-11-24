require("dotenv").config();

const cloudinary = require("cloudinary").v2;
cloudinary.v2 = cloudinary; // Compatibility fix: multer-storage-cloudinary expects cloudinary.v2

const cloudinaryStorageModule = require("multer-storage-cloudinary");
const CloudinaryStorage = typeof cloudinaryStorageModule === "function"
    ? cloudinaryStorageModule
    : cloudinaryStorageModule.CloudinaryStorage;

cloudinary.config({
    cloud_name: (process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    api_key: (process.env.API_KEY || process.env.CLOUDINARY_API_KEY || "").trim(),
    api_secret: (process.env.API_SECRET || process.env.CLOUDINARY_API_SECRET || "").trim(),
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "WorkShetu/DriverApplications",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
});

// Wrap _handleFile to guarantee .path, .filename, .url and .secure_url exist on req.file
const originalHandleFile = storage._handleFile.bind(storage);
storage._handleFile = function (req, file, cb) {
    originalHandleFile(req, file, (err, info) => {
        if (err) return cb(err);
        if (info) {
            info.path = info.secure_url || info.url || info.path;
            info.filename = info.public_id || info.filename;
            info.url = info.secure_url || info.url || info.path;
        }
        cb(null, info);
    });
};

module.exports = {
    cloudinary,
    storage,
};
