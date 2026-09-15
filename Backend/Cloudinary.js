require("dotenv").config();

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');



    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUD_NAME, 
        api_key: process.env.API_KEY, 
        api_secret: process.env.API_SECRET 
    });

    const storage = new CloudinaryStorage({
        cloudinary : cloudinary,
        params : {
            folder : "WorkShetu",
            allowedFormats : ["png", "jpg", "jpeg", "pdf" , 'webp'],
        }
    });

module.exports={cloudinary , storage};