const multer = require("multer");
const ResultDocuments = require("./models/ResultDocuments");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const University = require("./models/University");

/* Chatbot Routes */
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
// ================= MULTER STORAGE =================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {

    cb(
      null,
      Date.now() +
      "-" +
      file.originalname
    );
  }
});

const upload = multer({

  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const allowedTypes = [

      "application/pdf",

      "image/png",

      "image/jpeg",

      "image/jpg"
    ];

    if (
      allowedTypes.includes(file.mimetype)
    ) {

      cb(null, true);

    } else {

      cb(
        new Error(
          "Only PDF and image files allowed"
        ),
        false
      );
    }
  }
});

// ================= STATIC FOLDER =================

app.use(
  "/uploads",
  express.static("uploads")
);

/* Chatbot API */
app.use("/api/chat", chatRoutes);

// ================= CONNECT DB =================
const connectDB = require("./db");
connectDB();

// ================= GET UNIVERSITIES =================
app.get("/universities", async (req, res) => {

  try {

    const data = await University.find();

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });
  }
});

// ================= ENTRY TEST RULE API =================
app.post("/get-entry-test-rule", async (req, res) => {

  try {

    const {
      selectedUni,
      department
    } = req.body;

    if (!selectedUni || !department) {

      return res.status(400).json({
        error: "Missing data"
      });
    }

    const uni = await University.findOne({
      name: selectedUni
    });

    if (!uni) {

      return res.status(404).json({
        error: "University not found"
      });
    }

    const dept = uni.departments.find(
      (d) => d.name === department
    );

    if (!dept) {

      return res.status(404).json({
        error: "Department not found"
      });
    }

    res.json({
      entryTestRequired:
        dept.meritFormula.entryTestRequired
    });

  } catch (error) {

    console.error("❌ Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// ================= CHECK ELIGIBILITY API =================
app.post("/check-eligibility", async (req, res) => {

  try {

    const {
      selectedUni,
      department,
      course,
      marks
    } = req.body;

    console.log("📥 Data received:", {
      selectedUni,
      department,
      course,
      marks
    });

    // ================= VALIDATION =================
    if (
      !selectedUni ||
      !department ||
      !course ||
      !marks
    ) {

      return res.json({
        error: "Please fill all fields"
      });
    }

    // ================= GET MARKS =================
    const matricObtained =
      parseFloat(marks.matricObtained) || 0;

    const matricTotal =
      parseFloat(marks.matricTotal) || 0;

    let interObtained =
      parseFloat(marks.interObtained) || 0;

    const interTotal =
      parseFloat(marks.interTotal) || 0;

    const entryObtained =
      parseFloat(marks.entryObtained) || 0;

    const entryTotal =
      parseFloat(marks.entryTotal) || 0;

    const hafizQuran =
      marks.hafizQuran || false;

    const interPassingYear =
      parseInt(marks.interPassingYear) || 2025;

    // ================= VALIDATE TOTAL MARKS =================
    if (
      matricObtained > matricTotal ||
      interObtained > interTotal ||
      entryObtained > entryTotal
    ) {

      return res.json({
        error:
          "Obtained marks cannot be greater than total marks"
      });
    }

    // ================= GAP YEAR DEDUCTION =================
    const currentYear = 2025;

    const gapYears =
      currentYear - interPassingYear;

    // Deduct 10 marks from Inter obtained marks
    if (gapYears >= 1) {

      interObtained =
        interObtained - (gapYears * 10);

      // Prevent negative marks
      if (interObtained < 0) {
        interObtained = 0;
      }
    }

    // ================= CONVERT TO PERCENTAGES =================
    const matric =
      (matricObtained / matricTotal) * 100;

    const inter =
      (interObtained / interTotal) * 100;
    // ================= Equalize To 1100 =================
    const matricEqualized =
      matric * 11;

    const interEqualized =
      inter * 11;
    const entryTest =
      entryTotal > 0
        ? (entryObtained / entryTotal) * 100
        : 0;

    // ================= FIND UNIVERSITY =================
    const uni = await University.findOne({
      name: selectedUni
    });

    if (!uni) {

      return res.json({
        error: "University not found"
      });
    }

    // ================= FIND DEPARTMENT =================
    const dept = uni.departments.find(
      (d) => d.name === department
    );

    if (!dept) {

      return res.json({
        error: "Department not found"
      });
    }

    // ================= COURSE VALIDATION =================
    if (!dept.courses.includes(course)) {

      return res.json({
        error: "Course not found"
      });
    }

    const formula = dept.meritFormula;

    // ================= ENTRY TEST REQUIRED =================
    if (
      formula.entryTestRequired &&
      entryObtained === 0
    ) {

      return res.json({
        error: "Entry test marks required"
      });
    }

    // ================= CALCULATE MERIT =================
    let merit;
    let additionalMarks = 0;

    // Hafiz Quran marks
    if (hafizQuran) {
      additionalMarks = 20;
    }
    // ================= PUNJAB UNIVERSITY =================
    if (formula.formulaType === "pu") {



      // Official PU Formula
      const academic =
        (
          (
            (matricObtained / 4) + interObtained + additionalMarks
          )
          /
          (
            (matricTotal / 4) + interTotal
          )
        ) * 75;

      const entryPart =
        (entryObtained / entryTotal) * 25;

      merit = academic + entryPart;
    }

    // ================= UOS NORMAL =================
    else if (
      formula.formulaType === "uos"
    ) {

      merit =
        (formula.matric * matricEqualized) +
        (formula.inter * interEqualized) + additionalMarks;
    }

    // ================= UOS ENGINEERING =================
    else if (
      formula.formulaType === "uos-engineering"
    ) {

      merit =
        (formula.matric * matricEqualized) +
        (formula.inter * interEqualized) +
        (formula.entryTest * entryTest) + additionalMarks;
    }

    // ================= UOS BTECH =================
    else if (
      formula.formulaType === "uos-betech"
    ) {

      merit =
        (formula.inter * interEqualized) +
        (formula.entryTest * entryTest) + additionalMarks;
    }

    // ================= UOS LAW =================
    else if (
      formula.formulaType === "uos-law"
    ) {

      merit = inter + additionalMarks;
    }

    // ================= GCUF GENERAL =================
    else if (
      formula.formulaType === "gcuf-general"
    ) {

      merit =
        (formula.matric * matricEqualized) +
        (formula.inter * interEqualized) + additionalMarks;
    }

    // ================= GCUF ENGINEERING =================
    else if (
      formula.formulaType === "gcuf-ee"
    ) {

      merit =
        (formula.matric * matricEqualized) +
        (formula.inter * interEqualized) +
        (formula.entryTest * entryTest) + additionalMarks;
    }

    // ================= GCUF BTECH =================
    else if (
      formula.formulaType === "gcuf-btech"
    ) {

      merit =
        (formula.inter * interEqualized) +
        (formula.entryTest * entryTest) + additionalMarks;
    }

    // ================= OTHER UNIVERSITIES =================
    else {

      if (formula.entryTestRequired) {

        merit =
          (formula.matric * matricEqualized) +
          (formula.inter * interEqualized) +
          (formula.entryTest * entryTest) + additionalMarks;

      } else {

        merit =
          (formula.matric * matricEqualized) +
          (formula.inter * interEqualized) + additionalMarks;
      }
    }

    // ================= ELIGIBILITY =================
    let finalMeritForComparison;

    if (formula.formulaType === "pu") {
      finalMeritForComparison = merit;
    } else {
      finalMeritForComparison = merit / 11;
    }

    const eligible =
      finalMeritForComparison >= formula.requiredMerit;

    console.log(
      "✅ Result:",
      finalMeritForComparison.toFixed(2),
      eligible
        ? "Eligible"
        : "Not Eligible"
    );

    const cleanTitle = (str) => {
      if (!str) return "";
      return str.toLowerCase()
        .replace(/\b(in|of|and|&)\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    const prog = dept.programs.find(
      (p) => cleanTitle(p.title) === cleanTitle(course)
    );
    const requiredDegree = prog ? prog.requiredDegree : "";

    // ================= RESPONSE =================
    res.json({
      merit: finalMeritForComparison.toFixed(2),

      eligible,

      entryTestRequired:
        formula.entryTestRequired,

      cutoffHistory:
        dept.cutoffHistory,

      similarPrograms:
        dept.similarPrograms,

      requiredDegree,

      applyLink:
        dept.applyLink
    });
  } catch (error) {

    console.error("❌ Error:", error);

    res.json({
      error:
        "Server error: " + error.message
    });
  }
});
// ================= UPLOAD RESULTS API =================

app.post(

  "/uploadResults",

  upload.fields([
    { name: "matric", maxCount: 1 },
    { name: "inter", maxCount: 1 },
    { name: "EntryTest", maxCount: 1 }
  ]),

  async (req, res) => {

    try {
      if (
        !req.files.matric ||
        !req.files.inter
      ) {

        return res.status(400).json({
          error:
            "Matric and Inter files required"
        });
      }

      const newDocument =
        new ResultDocuments({

          userEmail:
            req.body.userEmail,

          matric:
            req.files.matric
              ? req.files.matric[0].path
              : "",

          inter:
            req.files.inter
              ? req.files.inter[0].path
              : "",

          entryTest:
            req.files.EntryTest
              ? req.files.EntryTest[0].path
              : ""
        });

      await newDocument.save();

      res.json({
        message:
          "Results Uploaded Successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error:
          "Upload failed"
      });
    }
  }
);
// ================= RECOMMEND UNIVERSITIES =================
app.post(
  "/recommend-universities",

  async (req, res) => {

    try {

      const {
        merit,
        city,
        degree,
        type,
        hostel,
        maxFee
      } = req.body;

      const universities =
        await University.find();

      let recommendations = [];

      universities.forEach((uni) => {

        let score = 0;
        // CITY SCORE

        if (city === uni.city) {
          score += 20;
        }

        // degree SCORE

        if (degree === uni.degree) {
          score += 20;
        }

        // TYPE SCORE

        if (type === uni.type) {
          score += 20;
        }

        // FEE SCORE

        if (maxFee >= uni.averageFee) {
          score += 30;
        }

        // HOSTEL SCORE

        if (
          hostel === false ||
          uni.hostel === true
        ) {
          score += 10;
        }

        // DEGREE MATCH

        const degreeFound =
          uni.departments.some(
            (dept) =>
              dept.courses.includes(degree)
          );

        if (degreeFound) {
          score += 20;
        }

        recommendations.push({

          name: uni.name,

          city: uni.city,

          type: uni.type,

          averageFee: uni.averageFee,

          hostel: uni.hostel,

          matchScore: score
        });
      });

      recommendations.sort(
        (a, b) =>
          b.matchScore - a.matchScore
      );

      res.json(
        recommendations.slice(0, 10)
      );

    } catch (error) {

      console.log(error);

      res.status(500).json({
        error: error.message
      });
    }
  }
);
// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );

});