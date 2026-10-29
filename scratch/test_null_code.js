module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");
require("dotenv").config({ path: "Backend/.env" });
const mongoose = require("mongoose");
const Offer = require("./Backend/models/Offer.js");

(async () => {
  await mongoose.connect(process.env.MONGO_URL.trim());
  try {
    const o1 = new Offer({
      title: "Auto 1",
      code: null,
      isAutomatic: true,
      discountType: "Flat",
      discountValue: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    });
    await o1.save();
    console.log("Saved o1");

    const o2 = new Offer({
      title: "Auto 2",
      code: null,
      isAutomatic: true,
      discountType: "Flat",
      discountValue: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    });
    await o2.save();
    console.log("Saved o2");

    await Offer.deleteMany({ _id: { $in: [o1._id, o2._id] } });
  } catch (e) {
    console.error("CODE NULL ERROR:", e.message, "CODE:", e.code);
  } finally {
    await Offer.deleteMany({ title: { $in: ["Auto 1", "Auto 2"] } });
    await mongoose.disconnect();
  }
})();

