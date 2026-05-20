import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { hasUploadedDocuments } from "../utils";
import "./Eligibility.css";

const Eligibility = () => {

  const navigate = useNavigate();

  // ================= STATES =================
  const [selectedUni, setSelectedUni] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");

  const [marks, setMarks] = useState({
    matricObtained: "",
    matricTotal: "",

    interObtained: "",
    interTotal: "",

    entryObtained: "",
    entryTotal: "",

    hafizQuran: false,

    interPassingYear: ""
  });

  const [merit, setMerit] = useState(null);
  const [eligible, setEligible] = useState(null);
  const [popupData, setPopupData] = useState(null);

  const [showMeritPopup, setShowMeritPopup] =
    useState(false);
  const [userDegree, setUserDegree] = useState("");
  const [popupStage, setPopupStage] = useState("merit_result");

  const [entryTestRequired, setEntryTestRequired] =
    useState(false);

  const [universities, setUniversities] =
    useState([]);

  // ================= CHECK DOCUMENTS =================
  useEffect(() => {

    if (!hasUploadedDocuments()) {
      navigate("/upload");
    }

  }, [navigate]);

  // ================= FETCH UNIVERSITIES =================
  useEffect(() => {

    fetch("https://university-admission-support-system.up.railway.app/universities")

      .then((res) => res.json())

      .then((data) => {

        console.log("Universities:", data);

        // Prevent map errors
        if (Array.isArray(data)) {
          setUniversities(data);
        } else {
          setUniversities([]);
        }
      })

      .catch((err) => {

        console.error(
          "Error fetching universities:",
          err
        );

        setUniversities([]);
      });

  }, []);

  // ================= ENTRY TEST RULE =================
  useEffect(() => {

    const fetchEntryTestRule = async () => {

      if (selectedUni && department) {

        try {

          const res = await fetch(
            "https://university-admission-support-system.up.railway.app/get-entry-test-rule",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                selectedUni,
                department
              })
            }
          );

          const data = await res.json();

          setEntryTestRequired(
            data.entryTestRequired
          );

        } catch (error) {

          console.error(
            "Error fetching entry test rule:",
            error
          );
        }
      }
    };

    fetchEntryTestRule();

  }, [selectedUni, department]);

  // ================= CHECK ELIGIBILITY =================
  const handleCheckEligibility = async () => {

    // Validate selections
    if (
      !selectedUni ||
      !department ||
      !course
    ) {

      alert("Please select all fields!");
      return;
    }

    // Validate marks
    if (
      !marks.matricObtained ||
      !marks.matricTotal ||
      !marks.interObtained ||
      !marks.interTotal ||
      !marks.interPassingYear
    ) {

      alert(
        "Please fill all required marks fields!"
      );

      return;
    }

    // Validate entry test
    if (
      entryTestRequired &&
      (
        !marks.entryObtained ||
        !marks.entryTotal
      )
    ) {

      alert("Entry test marks required!");

      return;
    }

    try {

      const response = await fetch(
        "https://university-admission-support-system.up.railway.app/check-eligibility",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            selectedUni,
            department,
            course,

            marks: {

              matricObtained:
                Number(marks.matricObtained),

              matricTotal:
                Number(marks.matricTotal),

              interObtained:
                Number(marks.interObtained),

              interTotal:
                Number(marks.interTotal),

              entryObtained:
                Number(
                  marks.entryObtained || 0
                ),

              entryTotal:
                Number(
                  marks.entryTotal || 0
                ),

              hafizQuran:
                marks.hafizQuran,

              interPassingYear:
                Number(
                  marks.interPassingYear
                )
            }
          })
        }
      );

      const data = await response.json();

      console.log("Eligibility:", data);

      if (data.error) {

        alert(data.error);

        return;
      }

      setMerit(data.merit);

      setEligible(data.eligible);

      setPopupData(data);

      setUserDegree("");
      setPopupStage("merit_result");
      setShowMeritPopup(true);

      // ================= UPDATE USER MERIT =================
      const currentUserEmail = localStorage.getItem("currentUser");

      if (currentUserEmail) {
        try {
          await axios.put(`https://university-admission-support-system.up.railway.app/api/users/${currentUserEmail}`, {
            merit: data.merit
          });
          console.log("Merit score saved to database.");
        } catch (err) {
          console.error("Failed to save merit to DB:", err);
        }
      }
    } catch (error) {

      console.error(error);

      alert(
        "Server not running! Start backend server."
      );
    }
  };

  return (

    <div className="eligibility-container">

      <div className="eligibility-card">

        <h2>
          University Eligibility Checker
        </h2>

        {/* ================= UNIVERSITY ================= */}

        <label>University</label>

        <select
          value={selectedUni}

          onChange={(e) => {

            setSelectedUni(e.target.value);

            setDepartment("");

            setCourse("");

            setMarks({
              matricObtained: "",
              matricTotal: "",

              interObtained: "",
              interTotal: "",

              entryObtained: "",
              entryTotal: "",

              hafizQuran: false,

              interPassingYear: ""
            });
          }}
        >

          <option value="">
            -- Select University --
          </option>

          {Array.isArray(universities) &&

            universities.map((uni) => (

              <option
                key={uni._id}
                value={uni.name}
              >
                {uni.name}
              </option>
            ))
          }

        </select>

        {/* ================= DEPARTMENT ================= */}

        <label>Department</label>

        <select
          value={department}

          onChange={(e) => {

            setDepartment(e.target.value);

            setCourse("");
          }}

          disabled={!selectedUni}
        >

          <option value="">
            -- Select Department --
          </option>

          {selectedUni &&

            universities
              .find(
                (u) =>
                  u.name === selectedUni
              )

              ?.departments?.map(
                (dept) => (

                  <option
                    key={dept.name}
                    value={dept.name}
                  >
                    {dept.name}
                  </option>
                )
              )
          }

        </select>

        {/* ================= COURSE ================= */}

        <label>Course</label>

        <select
          value={course}

          onChange={(e) =>
            setCourse(e.target.value)
          }

          disabled={!department}
        >

          <option value="">
            -- Select Course --
          </option>

          {selectedUni &&
            department &&

            universities
              .find(
                (u) =>
                  u.name === selectedUni
              )

              ?.departments
              ?.find(
                (d) =>
                  d.name === department
              )

              ?.courses?.map((c) => (

                <option
                  key={c}
                  value={c}
                >
                  {c}
                </option>
              ))
          }

        </select>

        {/* ================= MATRIC ================= */}

        <div className="marks-grid">

          <div>

            <label>
              Matric Obtained Marks
            </label>

            <input
              type="number"

              placeholder="e.g. 1045"

              value={
                marks.matricObtained
              }

              onChange={(e) =>

                setMarks({
                  ...marks,

                  matricObtained:
                    e.target.value
                })
              }
            />

          </div>

          <div>

            <label>
              Matric Total Marks
            </label>

            <input
              type="number"

              placeholder="e.g. 1100"

              value={
                marks.matricTotal
              }

              onChange={(e) =>

                setMarks({
                  ...marks,

                  matricTotal:
                    e.target.value
                })
              }
            />

          </div>

        </div>

        {/* ================= INTER ================= */}

        <div className="marks-grid">

          <div>

            <label>
              Intermediate Obtained Marks
            </label>

            <input
              type="number"

              placeholder="e.g. 1067"

              value={
                marks.interObtained
              }

              onChange={(e) =>

                setMarks({
                  ...marks,

                  interObtained:
                    e.target.value
                })
              }
            />

          </div>

          <div>

            <label>
              Intermediate Total Marks
            </label>

            <input
              type="number"

              placeholder="e.g. 1100"

              value={
                marks.interTotal
              }

              onChange={(e) =>

                setMarks({
                  ...marks,

                  interTotal:
                    e.target.value
                })
              }
            />

          </div>

        </div>

        {/* ================= PASSING YEAR ================= */}

        <label>
          Intermediate Passing Year
        </label>

        <input
          type="number"

          placeholder="e.g. 2025"

          value={
            marks.interPassingYear
          }

          onChange={(e) =>

            setMarks({
              ...marks,

              interPassingYear:
                e.target.value
            })
          }
        />

        {/* ================= HAFIZ ================= */}

        <div className="checkbox-field">

          <input
            type="checkbox"

            checked={
              marks.hafizQuran
            }

            onChange={(e) =>

              setMarks({
                ...marks,

                hafizQuran:
                  e.target.checked
              })
            }
          />

          <label>
            Hafiz-e-Quran
          </label>

        </div>

        {/* ================= ENTRY TEST ================= */}

        {entryTestRequired && (

          <div className="marks-grid">

            <div>

              <label>
                Entry Test Obtained Marks
              </label>

              <input
                type="number"

                placeholder="e.g. 70"

                value={
                  marks.entryObtained
                }

                onChange={(e) =>

                  setMarks({
                    ...marks,

                    entryObtained:
                      e.target.value
                  })
                }
              />

            </div>

            <div>

              <label>
                Entry Test Total Marks
              </label>

              <input
                type="number"

                placeholder="e.g. 100"

                value={
                  marks.entryTotal
                }

                onChange={(e) =>

                  setMarks({
                    ...marks,

                    entryTotal:
                      e.target.value
                  })
                }
              />

            </div>

          </div>
        )}

        {/* ================= BUTTON ================= */}

        <button
          className="check-btn"

          onClick={
            handleCheckEligibility
          }

          disabled={
            !selectedUni ||
            !department ||
            !course
          }
        >
          Check Eligibility
        </button>

      </div>

      {/* ================= POPUP ================= */}

      {showMeritPopup && (
        <div className="merit-popup">
          <div className="merit-content">
            <h2>Eligibility Result</h2>

            {/* ================= STAGE 1: MERIT RESULT ================= */}
            {popupStage === "merit_result" && (
              <>
                <div className="popup-info centered">
                  <p className="popup-desc">
                    <b>Your Calculated Merit:</b> <span className="merit-badge-value">{merit}%</span>
                  </p>
                  
                  {eligible ? (
                    <div className="success">
                      <div style={{ marginBottom: '10px' }}>
                        🎉 Congratulations! Your merit meets the university's last year merit.
                      </div>
                      <div className="eligibility-prompt-row">
                        <span className="eligibility-prompt-text-success">
                          Please check your eligibility before applying:
                        </span>
                        <button 
                          onClick={() => setPopupStage("check_degree")}
                          className="eligibility-inline-btn success-btn"
                        >
                          Check Eligibility
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="fail">
                      <div style={{ marginBottom: '10px' }}>
                        😅 Oops! Your merit does not meet the university's last year merit.
                      </div>
                      <div className="eligibility-prompt-row">
                        <span className="eligibility-prompt-text-fail">
                          If you still want to apply, please check your eligibility:
                        </span>
                        <button 
                          onClick={() => setPopupStage("check_degree")}
                          className="eligibility-inline-btn fail-btn"
                        >
                          Check Eligibility
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="extra-info">
                  <div className="cutoff-box">
                    <h3>{course} last 3 year Cutoff in {selectedUni}</h3>
                    <p className="cutoff-years">
                      2024: {popupData?.cutoffHistory?.year2024}% | 2023: {popupData?.cutoffHistory?.year2023}% | 2022: {popupData?.cutoffHistory?.year2022}%
                    </p>
                  </div>

                  {popupData?.similarPrograms && popupData.similarPrograms.length > 0 && (
                    <div className="program-box">
                      <h3>Similar Programs at {selectedUni} with last year cutoff</h3>
                      <ul>
                        {popupData.similarPrograms.map((program, index) => (
                          <li key={index}>
                            <span>{program.name}</span>
                            <span>{program.merit}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="popup-buttons">
                  <button className="popup-close-btn" onClick={() => setShowMeritPopup(false)}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ================= STAGE 2: DEGREE SELECTION ================= */}
            {popupStage === "check_degree" && (
              <>
                <div className="popup-info block-layout">
                  <h3>Select your Intermediate Degree:</h3>
                  <p className="popup-desc">
                    We will verify if your degree matches the required qualification for <b>{course}</b> (Required: {popupData?.requiredDegree || "Any Intermediate"}).
                  </p>
                  
                  <select 
                    value={userDegree} 
                    onChange={(e) => setUserDegree(e.target.value)}
                    className="popup-select"
                  >
                    <option value="">-- Select Degree --</option>
                    {(() => {
                      const reqStr = popupData?.requiredDegree || "Any Intermediate";
                      const isAny = /any intermediate|intermediate or equivalent|intermediate/i.test(reqStr);
                      const degrees = isAny 
                        ? ["FSc Pre-Medical", "FSc Pre-Engineering", "ICS", "I.Com", "F.A", "A-Level", "DAE"]
                        : reqStr.split(',')
                            .map(d => d.trim().replace(/^(or|and)\s+/i, ''))
                            .filter(Boolean);
                      return degrees.map((deg, idx) => (
                        <option key={idx} value={deg}>{deg}</option>
                      ));
                    })()}
                    <option value="Other">Other / My degree is not listed</option>
                  </select>
                </div>

                <div className="popup-buttons margin-top">
                  <button 
                    className="apply-btn" 
                    disabled={!userDegree}
                    onClick={() => {
                      if (userDegree && userDegree !== "Other") {
                        setPopupStage("eligible");
                      } else {
                        setPopupStage("not_eligible");
                      }
                    }}
                  >
                    Verify Eligibility
                  </button>
                  <button className="popup-close-btn back-btn" onClick={() => setPopupStage("merit_result")}>
                    Back
                  </button>
                </div>
              </>
            )}

            {/* ================= STAGE 3: ELIGIBLE ================= */}
            {popupStage === "eligible" && (
              <>
                <div className="popup-info centered">
                  <div className="success large">
                    🎉 Congratulations! You are eligible to apply.
                  </div>
                  <div className="popup-detail-text">
                    Your academic degree (<b>{userDegree}</b>) is accepted for <b>{course}</b> at {selectedUni}.
                  </div>
                </div>

                <div className="popup-buttons">
                  {popupData?.applyLink ? (
                    <button className="apply-btn" onClick={() => window.open(popupData.applyLink, "_blank")}>
                      Apply Now
                    </button>
                  ) : (
                    <button className="apply-btn" disabled style={{ background: 'gray', cursor: 'not-allowed' }}>
                      Apply Link N/A
                    </button>
                  )}
                  <button className="popup-close-btn" onClick={() => setShowMeritPopup(false)}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ================= STAGE 4: NOT ELIGIBLE ================= */}
            {popupStage === "not_eligible" && (
              <>
                <div className="popup-info centered">
                  <div className="fail large">
                    ❌ You are not eligible to apply.
                  </div>
                  <div className="popup-detail-text">
                    Please check eligibility for course before applying. Your degree (<b>{userDegree}</b>) does not match the requirements for this course (Required: {popupData?.requiredDegree || "N/A"}).
                  </div>
                </div>

                <div className="popup-buttons">
                  <button 
                    className="apply-btn" 
                    onClick={() => {
                      setShowMeritPopup(false);
                      const uniObj = universities.find(u => u.name === selectedUni);
                      if (uniObj) {
                        navigate(`/university/${uniObj._id}/programs`);
                      } else {
                        alert("University details page not found.");
                      }
                    }}
                  >
                    Check Eligibility Details
                  </button>
                  <button className="popup-close-btn" onClick={() => setShowMeritPopup(false)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Eligibility;