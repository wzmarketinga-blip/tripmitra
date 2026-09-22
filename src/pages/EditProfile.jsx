import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Save,
  UserRound,
  AlertCircle,
  Camera,
  Loader2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [form, setForm] = useState({
    fullName: "",
    city: "",
    state: "",
    languages: "",
    interests: "",
    travelStyle: "",
    about: "",
  });

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          city,
          state,
          languages,
          travel_interests,
          travel_style,
          about,
          photo_url
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        throw new Error(
          "Your profile could not be found."
        );
      }

      setForm({
        fullName:
          data.full_name || "",

        city:
          data.city || "",

        state:
          data.state || "",

        languages:
          Array.isArray(data.languages)
            ? data.languages.join(", ")
            : data.languages || "",

        interests:
          Array.isArray(
            data.travel_interests
          )
            ? data.travel_interests.join(
                ", "
              )
            : data.travel_interests || "",

        travelStyle:
          data.travel_style || "",

        about:
          data.about || "",
      });

      setPhotoUrl(
        data.photo_url || ""
      );
    } catch (err) {
      console.error(
        "Load profile error:",
        err
      );

      setError(
        err?.message ||
          "Profile load nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadProfile();
  }, []);

  // ==========================================
  // PROFILE COMPLETION
  // ==========================================

  const getCompletionPercentage = () => {
    const fields = [
      form.fullName,
      form.city,
      form.state,
      form.languages,
      form.interests,
      form.travelStyle,
      form.about,
      photoUrl,
    ];

    const completed =
      fields.filter((value) => {
        if (
          value === null ||
          value === undefined
        ) {
          return false;
        }

        return (
          String(value).trim() !== ""
        );
      }).length;

    return Math.round(
      (completed / fields.length) *
        100
    );
  };

  const completionPercentage =
    getCompletionPercentage();

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  // ==========================================
  // PHOTO UPLOAD
  // ==========================================

  const handlePhotoSelect = async (
    e
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    setSaved(false);
    setError("");

    // ------------------------------------------
    // VALID FILE TYPE
    // ------------------------------------------

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Sirf JPG, PNG ya WEBP photo upload karein."
      );

      e.target.value = "";
      return;
    }

    // ------------------------------------------
    // MAX FILE SIZE = 5 MB
    // ------------------------------------------

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Profile photo maximum 5 MB ki ho sakti hai."
      );

      e.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      // ------------------------------------------
      // FILE EXTENSION
      // ------------------------------------------

      let extension =
        "jpg";

      if (
        file.type ===
        "image/png"
      ) {
        extension = "png";
      }

      if (
        file.type ===
        "image/webp"
      ) {
        extension = "webp";
      }

      // ------------------------------------------
      // UNIQUE FILE PATH
      // ------------------------------------------

      const filePath =
        `${user.id}/profile-${Date.now()}.${extension}`;

      // ------------------------------------------
      // UPLOAD
      // ------------------------------------------

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "profile-photos"
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                file.type,
            }
          );

      if (uploadError) {
        console.error(
          "PHOTO UPLOAD ERROR:",
          uploadError
        );

        throw new Error(
          `Photo upload failed: ${uploadError.message}`
        );
      }

      // ------------------------------------------
      // PUBLIC URL
      // ------------------------------------------

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from(
            "profile-photos"
          )
          .getPublicUrl(
            filePath
          );

      const publicUrl =
        publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error(
          "Photo URL generate nahi ho paya."
        );
      }

      // ------------------------------------------
      // SAVE PHOTO URL
      // ------------------------------------------

      const {
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .update({
            photo_url:
              publicUrl,
          })
          .eq(
            "id",
            user.id
          );

      if (profileError) {
        console.error(
          "PHOTO PROFILE ERROR:",
          profileError
        );

        throw new Error(
          `Profile photo URL save failed: ${profileError.message}`
        );
      }

      // ------------------------------------------
      // UPDATE SCREEN
      // ------------------------------------------

      setPhotoUrl(
        publicUrl
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(
        "Photo upload error:",
        err
      );

      setError(
        err?.message ||
          "Photo upload nahi ho payi."
      );
    } finally {
      setUploadingPhoto(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  };

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSave = async (
    e
  ) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    setSaved(false);
    setError("");

    try {
      setSaving(true);

      // ----------------------------------------
      // GET USER
      // ----------------------------------------

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      // ----------------------------------------
      // VALIDATION
      // ----------------------------------------

      const fullName =
        form.fullName.trim();

      const city =
        form.city.trim();

      const state =
        form.state.trim();

      const languages =
        form.languages.trim();

      const interests =
        form.interests.trim();

      const about =
        form.about.trim();

      if (!fullName) {
        throw new Error(
          "Full name required hai."
        );
      }

      if (fullName.length < 2) {
        throw new Error(
          "Full name kam se kam 2 characters ka hona chahiye."
        );
      }

      if (fullName.length > 80) {
        throw new Error(
          "Full name maximum 80 characters ka ho sakta hai."
        );
      }

      if (!city) {
        throw new Error(
          "City required hai."
        );
      }

      if (city.length > 80) {
        throw new Error(
          "City maximum 80 characters ki ho sakti hai."
        );
      }

      if (!state) {
        throw new Error(
          "State required hai."
        );
      }

      if (state.length > 80) {
        throw new Error(
          "State maximum 80 characters ka ho sakta hai."
        );
      }

      if (languages.length > 200) {
        throw new Error(
          "Languages maximum 200 characters ho sakti hain."
        );
      }

      if (interests.length > 300) {
        throw new Error(
          "Travel interests maximum 300 characters ke ho sakte hain."
        );
      }

      if (
        form.travelStyle &&
        form.travelStyle.length >
          50
      ) {
        throw new Error(
          "Travel style invalid hai."
        );
      }

      if (about.length > 1000) {
        throw new Error(
          "About section maximum 1000 characters ka ho sakta hai."
        );
      }

      // ----------------------------------------
      // SAVE DATA
      // ----------------------------------------

      const profileData = {
        full_name:
          fullName,

        city:
          city,

        state:
          state,

        languages:
          languages,

        travel_interests:
          interests,

        travel_style:
          form.travelStyle || null,

        about:
          about,

        photo_url:
          photoUrl || null,
      };

      const {
        error: saveError,
      } =
        await supabase
          .from("profiles")
          .update(
            profileData
          )
          .eq(
            "id",
            user.id
          );

      if (saveError) {
        console.error(
          "PROFILE SAVE ERROR:",
          saveError
        );

        const message =
          saveError.message ||
          "";

        if (
          message
            .toLowerCase()
            .includes(
              "row-level security"
            )
        ) {
          throw new Error(
            "Profile update permission issue. Please check the profiles RLS policy."
          );
        }

        throw new Error(
          `Profile save failed: ${message}`
        );
      }

      // ----------------------------------------
      // SUCCESS
      // ----------------------------------------

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3500);
    } catch (err) {
      console.error(
        "Save profile error:",
        err
      );

      setError(
        err?.message ||
          "Profile save nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          background:
            "#f8fafc",

          color:
            "#475569",

          fontSize:
            "16px",

          fontWeight:
            600,
        }}
      >
        Loading profile...
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="edit-profile-page">
      {/* HEADER */}

      <header className="dashboard-nav">
        <button
          type="button"
          className="auth-back"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <ArrowLeft
            size={17}
          />

          Dashboard
        </button>

        <div className="dashboard-nav-right">
          <span className="edit-profile-header-title">
            Edit Profile
          </span>
        </div>
      </header>

      <main className="edit-profile-container">
        {/* HEADING */}

        <section className="edit-profile-heading">
          <div>
            <p>
              YOUR TRAVEL PROFILE
            </p>

            <h1>
              Complete Your Profile
            </h1>

            <span>
              Add your travel preferences so you can find better companions.
            </span>
          </div>
        </section>

        {/* SUCCESS */}

        {saved && (
          <div className="edit-profile-success">
            <CheckCircle2
              size={19}
            />

            Profile saved
            successfully!
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              gap:
                "10px",

              padding:
                "14px 16px",

              marginBottom:
                "20px",

              borderRadius:
                "12px",

              background:
                "#fef2f2",

              color:
                "#b91c1c",

              border:
                "1px solid #fecaca",

              fontWeight:
                600,

              lineHeight:
                "1.5",

              wordBreak:
                "break-word",
            }}
          >
            <AlertCircle
              size={19}
              style={{
                flexShrink: 0,
                marginTop:
                  "2px",
              }}
            />

            <span>
              {error}
            </span>
          </div>
        )}

        <form
          onSubmit={
            handleSave
          }
        >
          {/* PROFILE CARD */}

          <section className="edit-profile-card">
            {/* PHOTO SECTION */}

            <div className="edit-profile-photo-section">
              <div
                className="edit-profile-avatar"
                style={{
                  overflow:
                    "hidden",

                  position:
                    "relative",
                }}
              >
                {photoUrl ? (
                  <img
                    src={
                      photoUrl
                    }
                    alt="Profile"
                    style={{
                      width:
                        "100%",

                      height:
                        "100%",

                      objectFit:
                        "cover",

                      display:
                        "block",
                    }}
                  />
                ) : (
                  <UserRound
                    size={
                      45
                    }
                  />
                )}
              </div>

              <div>
                <h3>
                  Profile Photo
                </h3>

                <p>
                  A clear profile photo helps other travellers recognize you.
                </p>

                {/* HIDDEN INPUT */}

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handlePhotoSelect
                  }
                  style={{
                    display:
                      "none",
                  }}
                />

                {/* PHOTO BUTTON */}

                <button
                  type="button"
                  className="edit-photo-btn"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    uploadingPhoto ||
                    saving
                  }
                  style={{
                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    gap:
                      "8px",

                    opacity:
                      uploadingPhoto ||
                      saving
                        ? 0.7
                        : 1,

                    cursor:
                      uploadingPhoto ||
                      saving
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2
                        size={
                          17
                        }
                        className="spin"
                      />

                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera
                        size={
                          17
                        }
                      />

                      {photoUrl
                        ? "Change Photo"
                        : "Add Photo"}
                    </>
                  )}
                </button>

                <div
                  style={{
                    marginTop:
                      "8px",

                    fontSize:
                      "12px",

                    color:
                      "#64748b",
                  }}
                >
                  JPG, PNG or WEBP
                  {" • "}
                  Max 5 MB
                </div>
              </div>
            </div>

            <div className="edit-profile-divider" />

            {/* FORM FIELDS */}

            <div className="edit-profile-grid">
              {/* FULL NAME */}

              <label>
                <span>
                  Full Name
                </span>

                <input
                  type="text"
                  name="fullName"
                  value={
                    form.fullName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Your full name"
                  maxLength={
                    80
                  }
                />
              </label>

              {/* CITY */}

              <label>
                <span>
                  City
                </span>

                <input
                  type="text"
                  name="city"
                  value={
                    form.city
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Delhi"
                  maxLength={
                    80
                  }
                />
              </label>

              {/* STATE */}

              <label>
                <span>
                  State
                </span>

                <input
                  type="text"
                  name="state"
                  value={
                    form.state
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Bihar"
                  maxLength={
                    80
                  }
                />
              </label>

              {/* LANGUAGES */}

              <label>
                <span>
                  Languages
                </span>

                <input
                  type="text"
                  name="languages"
                  value={
                    form.languages
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Hindi, English"
                  maxLength={
                    200
                  }
                />

                <small
                  style={{
                    marginTop:
                      "6px",
                    display:
                      "block",
                    color:
                      "#94a3b8",
                    fontSize:
                      "11px",
                  }}
                >
                  Example:
                  Hindi,
                  English
                </small>
              </label>

              {/* TRAVEL STYLE */}

              <label>
                <span>
                  Travel Style
                </span>

                <select
                  name="travelStyle"
                  value={
                    form.travelStyle
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Select travel style
                  </option>

                  <option value="Leisure">
                    Leisure
                  </option>

                  <option value="Adventure">
                    Adventure
                  </option>

                  <option value="Beach Trip">
                    Beach Trip
                  </option>

                  <option value="Nature">
                    Nature
                  </option>

                  <option value="Business">
                    Business
                  </option>

                  <option value="Backpacking">
                    Backpacking
                  </option>

                  <option value="Luxury">
                    Luxury
                  </option>
                </select>
              </label>

              {/* INTERESTS */}

              <label>
                <span>
                  Travel Interests
                </span>

                <input
                  type="text"
                  name="interests"
                  value={
                    form.interests
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Photography, Food, Trekking"
                  maxLength={
                    300
                  }
                />

                <small
                  style={{
                    marginTop:
                      "6px",
                    display:
                      "block",
                    color:
                      "#94a3b8",
                    fontSize:
                      "11px",
                  }}
                >
                  Example:
                  Photography,
                  Food,
                  Trekking
                </small>
              </label>

              {/* ABOUT */}

              <label className="edit-profile-full">
                <span>
                  About You
                </span>

                <textarea
                  name="about"
                  value={
                    form.about
                  }
                  onChange={
                    handleChange
                  }
                  rows="5"
                  placeholder="Tell other travellers a little about yourself..."
                  maxLength={
                    1000
                  }
                />

                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#94a3b8",
                    fontSize:
                      "11px",
                  }}
                >
                  {
                    form.about
                      .length
                  }
                  /1000 characters
                </small>
              </label>
            </div>
          </section>

          {/* PROFILE COMPLETION */}

          <section className="edit-profile-completion">
            <div className="completion-icon">
              <CheckCircle2
                size={22}
              />
            </div>

            <div
              style={{
                flex: 1,
              }}
            >
              <h3>
                Profile Completion
              </h3>

              <p>
                {completionPercentage ===
                100
                  ? "Excellent! Your profile is complete."
                  : "Complete more details to get better travel matches."}
              </p>

              <div
                className="completion-bar"
                style={{
                  width:
                    "100%",
                  overflow:
                    "hidden",
                }}
              >
                <span
                  style={{
                    display:
                      "block",

                    width:
                      `${completionPercentage}%`,

                    height:
                      "100%",

                    transition:
                      "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            <strong>
              {
                completionPercentage
              }
              %
            </strong>
          </section>

          {/* ACTIONS */}

          <div className="edit-profile-actions">
            <button
              type="button"
              className="edit-profile-cancel"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              disabled={
                saving ||
                uploadingPhoto
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                saving ||
                uploadingPhoto
              }
              style={{
                opacity:
                  saving ||
                  uploadingPhoto
                    ? 0.7
                    : 1,

                cursor:
                  saving ||
                  uploadingPhoto
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving ? (
                <>
                  <Loader2
                    size={
                      18
                    }
                    className="spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save
                    size={
                      18
                    }
                  />

                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}