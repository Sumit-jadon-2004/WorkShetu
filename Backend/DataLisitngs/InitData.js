require("dotenv").config();

const mongoose = require("mongoose");
const Machine = require("../models/ListingMachin.js");
const machines = require("./DataList.js");

async function seedDatabase() {
	if (!process.env.MONGO_URL) {
		throw new Error("MONGO_URL is not configured in the environment.");
	}

	await mongoose.connect(process.env.MONGO_URL, { dbName: "workshetu" });
	await Machine.deleteMany({});
	const insertedMachines = await Machine.insertMany(machines);

	console.log(`Seeded ${insertedMachines.length} machines into the workshetu database.`);
}

seedDatabase()
	.catch((error) => {
		console.error("Database seeding failed:", error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
