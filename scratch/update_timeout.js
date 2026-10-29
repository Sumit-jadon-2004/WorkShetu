const fs = require("fs");
const file = "Backend/App.js";
let content = fs.readFileSync(file, "utf8");

const oldTarget = `        await mongoose.connect(
            process.env.MONGO_URL,
            {

                dbName:
                    "workshetu",

                serverSelectionTimeoutMS:
                    5000

            }
        );`;

const newReplacement = `        await mongoose.connect(
            process.env.MONGO_URL,
            {

                dbName:
                    "workshetu",

                serverSelectionTimeoutMS:
                    30000

            }
        );`;

content = content.replace(/\r\n/g, "\n");
const normTarget = oldTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("Target not found in App.js!");
  process.exit(1);
}

content = content.replace(normTarget, newReplacement);
fs.writeFileSync(file, content, "utf8");
console.log("Updated serverSelectionTimeoutMS to 30000 in App.js");

