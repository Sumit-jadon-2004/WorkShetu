const fs = require("fs");
const file = "Backend/routes/adminOffers.js";
let content = fs.readFileSync(file, "utf8");

const oldCreateTarget = `    const offer = new Offer({
      title: title.trim(),
      description: description ? description.trim() : "",
      code: formattedCode,
      isAutomatic: Boolean(isAutomatic),
      bannerUrl: bannerUrl ? bannerUrl.trim() : "",
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      applicableService,
      applicableCategories: Array.isArray(applicableCategories) ? applicableCategories : [],
      userEligibility,
      firstBookingOnly: Boolean(firstBookingOnly),
      groupBookingOnly: Boolean(groupBookingOnly),
      minimumBookingAmount: Math.max(0, Number(minimumBookingAmount) || 0),
      applicableLocations: Array.isArray(applicableLocations) ? applicableLocations.map((l) => l.trim()).filter(Boolean) : [],
      totalUsageLimit: totalUsageLimit ? Math.max(1, Number(totalUsageLimit)) : null,
      perUserUsageLimit: Math.max(1, Number(perUserUsageLimit) || 1),
      startDate: start,
      endDate: end,
      status: start > new Date() ? "Scheduled" : "Active",
      isActive: true,
      createdBy: req.user._id,
    });

    await offer.save();

    return res.status(201).json({
      success: true,
      message: \`Offer '\${offer.title}' created successfully!\`,
      offer,
    });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Coupon code already exists in the system." });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create offer.",
      error: error.message,
    });
  }`;

const newCreateReplacement = `    const offer = new Offer({
      title: title.trim(),
      description: description ? description.trim() : "",
      code: formattedCode || undefined,
      isAutomatic: Boolean(isAutomatic),
      bannerUrl: bannerUrl ? bannerUrl.trim() : "",
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount && Number(maxDiscount) > 0 ? Number(maxDiscount) : null,
      applicableService,
      applicableCategories: Array.isArray(applicableCategories) ? applicableCategories : [],
      userEligibility,
      firstBookingOnly: Boolean(firstBookingOnly),
      groupBookingOnly: Boolean(groupBookingOnly),
      minimumBookingAmount: Math.max(0, Number(minimumBookingAmount) || 0),
      applicableLocations: Array.isArray(applicableLocations) ? applicableLocations.map((l) => l.trim()).filter(Boolean) : [],
      totalUsageLimit: totalUsageLimit && Number(totalUsageLimit) > 0 ? Math.max(1, Number(totalUsageLimit)) : null,
      perUserUsageLimit: Math.max(1, Number(perUserUsageLimit) || 1),
      startDate: start,
      endDate: end,
      status: start > new Date() ? "Scheduled" : "Active",
      isActive: true,
      createdBy: req.user?._id || req.user?.id || null,
    });

    await offer.save();

    return res.status(201).json({
      success: true,
      message: \`Offer '\${offer.title}' created successfully!\`,
      offer,
    });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A promotion with this coupon code already exists." });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create offer.",
      error: error.message,
    });
  }`;

content = content.replace(/\r\n/g, "\n");
const normTarget = oldCreateTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("Target not found!");
  process.exit(1);
}

content = content.replace(normTarget, newCreateReplacement);

// Also fix PUT catch block
const putCatchTarget = `  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update offer.",
      error: error.message,
    });
  }`;

const putCatchReplacement = `  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A promotion with this coupon code already exists." });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update offer.",
      error: error.message,
    });
  }`;

const normPutTarget = putCatchTarget.replace(/\r\n/g, "\n");
if (content.includes(normPutTarget)) {
  content = content.replace(normPutTarget, putCatchReplacement);
}

fs.writeFileSync(file, content, "utf8");
console.log("Updated adminOffers.js successfully!");

