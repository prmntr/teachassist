import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { parseStudentGrades } from "../(components)/CourseParser";

// every interaction to the outside world should be passed through here

// wrapper for expo-secure-store
export class SecureStorage {
  static async save(key: string, value: string) {
    console.log(`SecureStorage: Saving ${key}...`);
    await SecureStore.setItemAsync(key, value);
  }

  static async load(key: string) {
    console.log(`SecureStorage: Loading ${key}...`);
    return await SecureStore.getItemAsync(key);
  }

  static async delete(key: string) {
    console.log(`SecureStorage: Deleting ${key}...`);
    await SecureStore.deleteItemAsync(key);
  }
}

// vanilla login user pass
type LoginParams = {
  username: string;
  password: string;
};

// Form data for appointment booking
export interface AppointmentFormData {
  reason?: string;
  withParent?: boolean;
  online?: boolean;
  hiddenFields: Record<string, string>;
}

// book appt data structure
export interface AppointmentData {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM:SS format
  teacher?: string;
  subject?: string;
  reason?: string;
  bookedAt: string;
  schoolId: string;
}

interface TeachAssistAuthFetcherProps {
  loginParams?: LoginParams;
  // get specific course
  fetchCourseUrl?: string;
  // fetch with saved cookies; for getting courses
  fetchWithCookies?: boolean;
  // getting guidance w/ date
  getGuidance?: Date;
  // booking appointment
  bookAppointment?: string;
  // submitting appointment form data
  submitAppointmentForm?: AppointmentFormData;
  // cancel appointment
  cancelAppointment?: {
    date: string;
    time: string;
    id: string;
    schoolId: string;
  };

  onResult: (result: string) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void; // put as optional for future maybe but strongly reccemended
}

interface WebViewDataMessage {
  type: "htmlAndCookies";
  html: string;
  cookies: string;
}

// main function: recieves all these props
const TeachAssistAuthFetcher: React.FC<TeachAssistAuthFetcherProps> = ({
  loginParams,
  fetchWithCookies,
  fetchCourseUrl,
  getGuidance,
  bookAppointment,
  submitAppointmentForm,
  cancelAppointment,
  onResult,
  onError,
  onLoadingChange,
}) => {
  const webviewRef = useRef<WebView>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  // for retry; store what was originally requested
  const originalRequestRef = useRef<any>(null);

  // new appointment has been booked, save to securestore
  const saveAppointmentData = async (
    appointmentInfo: Partial<AppointmentData>
  ) => {
    try {
      // Load existing appointments
      const existingAppointmentsJson =
        await SecureStorage.load("ta_appointments");
      let appointments: AppointmentData[] = [];

      if (existingAppointmentsJson) {
        appointments = JSON.parse(existingAppointmentsJson);
      }

      // make new appointment object
      const newAppointment: AppointmentData = {
        id: appointmentInfo.id || Date.now().toString(),
        date: appointmentInfo.date || "",
        time: appointmentInfo.time || "",
        teacher: appointmentInfo.teacher || "",
        subject: appointmentInfo.subject || "",
        reason: appointmentInfo.reason || "",
        bookedAt: new Date().toISOString(),
        schoolId: appointmentInfo.schoolId || "",
      };

      appointments.push(newAppointment);

      await SecureStorage.save("ta_appointments", JSON.stringify(appointments));
      console.log("taauth: Appointment data saved successfully");
    } catch (error) {
      console.error("taauth: Error saving appointment data:", error);
    }
  };

  // remove appointment from secure store
  const removeAppointmentData = async (appointmentId: string) => {
    try {
      const existingAppointmentsJson =
        await SecureStorage.load("ta_appointments");
      if (existingAppointmentsJson) {
        let appointments: AppointmentData[] = JSON.parse(
          existingAppointmentsJson
        );
        appointments = appointments.filter((apt) => apt.id !== appointmentId);
        await SecureStorage.save(
          "ta_appointments",
          JSON.stringify(appointments)
        );
        console.log("taauth: Appointment removed successfully");
      }
    } catch (error) {
      console.error("taauth: Error removing appointment data:", error);
    }
  };

  // parse the url to get the important parts of the appointment
  const extractAppointmentFromUrl = (url: string) => {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    return {
      date: urlParams.get("dt") || urlParams.get("inputDate") || "",
      time: urlParams.get("tm") || "",
      id: urlParams.get("id") || "",
      schoolId: urlParams.get("school_id") || "",
    };
  };

  const fetchSchoolName = async (schoolId: string) => {
    try {
      console.log(`taauth: Fetching school name for school ID ${schoolId}`);
      const calendarUrl = `https://ta.yrdsb.ca/live/students/calendar_full.php?school_id=${schoolId}`;

      const response = await fetch(calendarUrl); // no cookies needed

      if (response.ok) {
        const calendarHtml = await response.text();
        // get school name
        const h1Match = calendarHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match && h1Match[1]) {
          const fullH1Text = h1Match[1].trim();
          // bc calender has school full cal at front
          const schoolName = fullH1Text
            .replace(/\s+School Full Calendar$/i, "")
            .trim();
          console.log(`taauth: school name is ${schoolName}`);
          await SecureStorage.save("school_name", schoolName);
          return schoolName;
        } else {
          console.warn("taauth: Could not find h1 tag in calendar page");
          return null;
        }
      } else {
        console.warn(
          `taauth: Failed to fetch calendar page, status: ${response.status}`
        );
        return null;
      }
    } catch (error) {
      console.error("taauth: Error fetching school name:", error);
      return null;
    }
  };

  // make the form data to prepare for POST
  const createFormDataString = (formData: AppointmentFormData): string => {
    const params = new URLSearchParams();

    // add all hidden fields
    Object.entries(formData.hiddenFields).forEach(([key, value]) => {
      params.append(key, value);
    });

    // Add form selections
    if (formData.reason) {
      params.append("reason", formData.reason);
    }

    if (formData.withParent) {
      params.append("withParent", "10");
    }

    if (formData.online) {
      params.append("online", "100");
    }

    params.append("submit", "Submit Reason");

    return params.toString();
  };

  // if it takes too long, it's prob b/c cookies expired, this reauths it
  const handleTimeout = async () => {
    if (isReauthenticating || loginParams) return;

    console.log(
      "taauth: request exceeded 1.5s, attempting re-authentication..."
    );
    setIsReauthenticating(true);

    try {
      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");

      // If username and password are detected, bypass everything and show courses tab (cached data)
      if (savedUsername && savedPassword) {
        const cachedMainHtml = await SecureStorage.load("ta_courses");
        if (cachedMainHtml) {
          onResult(cachedMainHtml);
        } else {
          onResult(
            "No cached data available. Please connect to the internet and try again."
          );
        }
        onLoadingChange?.(false);
        setIsReauthenticating(false);
        return;
      }

      // If no credentials, require login
      onError?.(
        "Session expired and no saved credentials found. Please log in again."
      );
      onLoadingChange?.(false);
      setIsReauthenticating(false);
      return;
    } catch (error) {
      console.error("taauth: Error during re-authentication:", error);
      onError?.("Failed to re-authenticate");
      onLoadingChange?.(false);
      setIsReauthenticating(false);
    }
  };

  // login got the cookies resolved, retry
  const retryOriginalRequest = async () => {
    setIsReauthenticating(false);
    console.log("here");
    console.log(await SecureStorage.load("ta_session_token"));
    const originalRequest = originalRequestRef.current;
    console.log("original request is" + JSON.stringify(originalRequest));
    if (!originalRequest) {
      console.error("taauth: No original request to retry");
      setIsReauthenticating(false);
      onError?.(
        "Re-authentication completed but no request to retry. Please try again."
      );
      onLoadingChange?.(false);
      return;
    }

    console.log("taauth: retrying original request...");

    try {
      const savedStudentId = await SecureStorage.load("ta_student_id");
      const savedSessionToken = await SecureStorage.load("ta_session_token");

      if (originalRequest.fetchCourseUrl) {
        setTargetUrl(originalRequest.fetchCourseUrl);
      } else if (
        originalRequest.fetchWithCookies &&
        savedStudentId &&
        savedSessionToken
      ) {
        setTargetUrl("https://ta.yrdsb.ca/live/index.php?subject_id=0");
      } else if (
        originalRequest.getGuidance &&
        savedStudentId &&
        savedSessionToken
      ) {
        const savedSchoolId = await SecureStorage.load("school_id");
        if (savedSchoolId) {
          const formatDateForAPI = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };
          const guidanceDate = formatDateForAPI(originalRequest.getGuidance);
          console.log(
            `https://ta.yrdsb.ca/live/students/bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`
          );
          setTargetUrl(
            `https://ta.yrdsb.ca/live/students/bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`
          );
        } else {
          throw new Error("No School ID found");
        }
      } else if (
        originalRequest.bookAppointment &&
        savedStudentId &&
        savedSessionToken
      ) {
        const decodedUrl = originalRequest.bookAppointment
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'");
        setTargetUrl(decodedUrl);
      } else if (
        originalRequest.cancelAppointment &&
        savedStudentId &&
        savedSessionToken
      ) {
        const { date, time, id, schoolId } = originalRequest.cancelAppointment;
        setTargetUrl(
          `https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=${date}&tm=${time}&id=${id}&school_id=${schoolId}&action=cancel`
        );
      } else if (
        originalRequest.submitAppointmentForm &&
        savedStudentId &&
        savedSessionToken
      ) {
        setTargetUrl("FORM_SUBMIT");
      } else {
        throw new Error("No valid request to retry");
      }
    } catch (error) {
      console.error("taauth: Error retrying request:", error);
      onError?.(`Failed to retry request: ${error}`);
      setIsReauthenticating(false);
      onLoadingChange?.(false);
    }
  };

  // Setup timeout
  const setupTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const timeout = setTimeout(handleTimeout, 2000);
    setTimeoutId(timeout);
  };

  // initialize everything; look at props and decide which path to put to setTarget
  useEffect(() => {
    const initializeFetcher = async () => {
      onLoadingChange?.(true);

      // get user and pass
      const savedStudentId = await SecureStorage.load("ta_student_id");
      const savedSessionToken = await SecureStorage.load("ta_session_token");

      // check for main courses page html first if not logging in
      if (
        !loginParams &&
        !fetchCourseUrl &&
        !getGuidance &&
        !bookAppointment &&
        !submitAppointmentForm &&
        !cancelAppointment
      ) {
        const cachedMainHtml = await SecureStorage.load("ta_courses");
        if (cachedMainHtml) {
          onResult(cachedMainHtml);
          onLoadingChange?.(false);
          return;
        }
      }

      if (loginParams) {
        // init login with username and password
        console.log("taauth: starting login");
        const { username, password } = loginParams;
        const encodedUsername = encodeURIComponent(username);
        const encodedPassword = encodeURIComponent(password);

        // example login
        if (encodedPassword === "password" && encodedUsername === "123456789") {
          await SecureStorage.save("ta_username", loginParams.username);
          await SecureStorage.save("ta_password", loginParams.password);
          await SecureStorage.save("ta_student_id", "");
          await SecureStorage.save("ta_session_token", "");
          await SecureStorage.save(
            "ta_courses",
            `[
  {
    "courseCode": "ENG4U1-7",
    "courseName": "English",
    "block": "1",
    "room": "41",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "93",
    "hasGrade": true
  },
  {
    "courseCode": "MHF3U1-5",
    "courseName": "Functions",
    "block": "2",
    "room": "67",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "99",
    "hasGrade": true
  },
  {
    "courseCode": "FRNCH-1",
    "courseName": "French As A Second language",
    "block": "4",
    "room": "41",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "84",
    "hasGrade": true
  },
  {
    "courseCode": "LUNCH-3",
    "courseName": "Lunch",
    "block": "3",
    "room": "CAF",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "See teacher",
    "hasGrade": false
  },
  {
    "courseCode": "SCH4U1-1",
    "courseName": "Chemistry",
    "block": "5",
    "room": "42",
    "startDate": "2026-01-30",
    "semester": 1,
    "endDate": "2026-06-24",
    "grade": "94",
    "hasGrade": true
  }
]`
          );
          await SecureStorage.save("school_id", "0");
          await SecureStorage.save("school_name", "Example School");
          onLoadingChange?.(false);
          onResult("Login Success");
        } else {
          const url = `https://ta.yrdsb.ca/live/index.php?subject_id=0&username=${encodedUsername}&password=${encodedPassword}&submit=Login`;
          setTargetUrl(url);
        }
      } else if (fetchCourseUrl) {
        console.log(`taauth: Fetching specific course URL: ${fetchCourseUrl}`);
        setTargetUrl(fetchCourseUrl);
        setupTimeout();
      } else if (fetchWithCookies && savedStudentId && savedSessionToken) {
        // fallback to main courses page if no specific URL provided
        console.log("taauth: Fetching main courses page with cookies");
        const url = `https://ta.yrdsb.ca/live/index.php?subject_id=0`;
        setTargetUrl(url);
        setupTimeout();
      } else if (getGuidance && savedStudentId && savedSessionToken) {
        const savedSchoolId = await SecureStorage.load("school_id");
        if (savedSchoolId) {
          // changed to use localdate instead of iso; canada gets screwed
          const formatDateForAPI = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          const guidanceDate = formatDateForAPI(getGuidance);
          console.log(`taauth: Fetching guidance for date ${guidanceDate}`);
          const url = `https://ta.yrdsb.ca/live/students/bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`;
          setTargetUrl(url);
          setupTimeout();
        } else {
          const errorMsg = "No School ID found";
          console.log(errorMsg);
          onError?.(errorMsg);
          onLoadingChange?.(false);
        }
      } else if (bookAppointment && savedStudentId && savedSessionToken) {
        // fixes url
        const decodedUrl = bookAppointment
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'");

        console.log(`taauth: Booking appointment with URL: ${decodedUrl}`);
        setTargetUrl(decodedUrl);
        setupTimeout();
      } else if (cancelAppointment && savedStudentId && savedSessionToken) {
        const { date, time, id, schoolId } = cancelAppointment;
        const cancelUrl = `https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=${date}&tm=${time}&id=${id}&school_id=${schoolId}&action=cancel`;
        console.log(`taauth: Canceling appointment with URL: ${cancelUrl}`);
        setTargetUrl(cancelUrl);
        setupTimeout();
      } else if (submitAppointmentForm && savedStudentId && savedSessionToken) {
        // webview has POST
        // TODO: use a smarter way of interfacing w/ ta
        console.log("taauth: Submitting appointment form data");
        setTargetUrl("FORM_SUBMIT"); // special marker for form submission
        setupTimeout();
      } else {
        const errorMessage = "invalid parameters or no saved session";
        console.error(errorMessage);
        onError?.(errorMessage);
        onLoadingChange?.(false);
      }
    };

    initializeFetcher();
  }, [
    loginParams,
    fetchWithCookies,
    fetchCourseUrl,
    getGuidance,
    bookAppointment,
    submitAppointmentForm,
    cancelAppointment,
    onResult,
    onError,
    onLoadingChange,
  ]);

  // clean timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const getInjectedJavaScript = () => {
    return `
      (function() {
        try {
          const html = document.documentElement.outerHTML;
          const cookies = document.cookie;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'htmlAndCookies', html: html, cookies: cookies }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: error.toString() }));
        }
      })();
    `;
  };

  // check if has form that needs to be filled
  const isAppointmentForm = (html: string): boolean => {
    return (
      html.includes('name="reason"') &&
      html.includes('type="radio"') &&
      html.includes("Submit Reason")
    );
  };

  // the webview has fetched whatever html was requested, handle it here
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      // Clear timeout when we receive response
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      const message: WebViewDataMessage = JSON.parse(event.nativeEvent.data);
      if (message.type === "htmlAndCookies") {
        let { html, cookies } = message;

        // got main page, we're done
        if (
          isReauthenticating &&
          html.toLowerCase().includes("student reports")
        ) {
          console.log("taauth: reauth WORKED updating session...");
          console.log("1");
          const coursesHtmlString: string = parseStudentGrades(html);
          console.log("2");
          const schoolId = html.match(/school_id=(\d+)/)?.[1];
          console.log("3");
          const cookiePairs = cookies.split("; ").map((c) => c.split("="));
          console.log("4");
          const studentId =
            cookiePairs.find((pair) => pair[0] === "student_id")?.[1] || null;
          console.log("5");
          const sessionToken =
            cookiePairs.find((pair) => pair[0] === "session_token")?.[1] ||
            null;
          console.log("6");

          if (studentId && sessionToken && schoolId) {
            await SecureStorage.save("ta_student_id", studentId);
            await SecureStorage.save("ta_session_token", sessionToken);
            await SecureStorage.save("ta_courses", coursesHtmlString);
            await SecureStorage.save("school_id", schoolId);

            // retry org request
            await retryOriginalRequest();
            onLoadingChange?.(false);
            onResult("REAUTH SUCCESS");
          } else {
            onError?.("REAUTH FAIL - could not extract session data");
            setIsReauthenticating(false);
            onLoadingChange?.(false);
            return;
          }
        }

        // Reset re-authentication state for successful operations
        if (isReauthenticating && !html.toLowerCase().includes("log in")) {
          setIsReauthenticating(false);
          originalRequestRef.current = null;
        }

        // only for init login
        if (loginParams) {
          if (html.toLowerCase().includes("log in")) {
            onResult(
              "Login Failed: Please check your student ID and password and try again."
            );
          } else if (html.toLowerCase().includes("student reports")) {
            console.log("taauth: Login successful.");

            const coursesHtmlString: string = parseStudentGrades(html);

            // get school id for guidance
            const schoolId = html.match(/school_id=(\d+)/)?.[1];

            const cookiePairs = cookies.split("; ").map((c) => c.split("="));
            const studentId =
              cookiePairs.find((pair) => pair[0] === "student_id")?.[1] || null;
            const sessionToken =
              cookiePairs.find((pair) => pair[0] === "session_token")?.[1] ||
              null;
            if (studentId && sessionToken && schoolId) {
              // save everything
              await SecureStorage.save("ta_username", loginParams.username);
              await SecureStorage.save("ta_password", loginParams.password);
              await SecureStorage.save("ta_student_id", studentId);
              await SecureStorage.save("ta_session_token", sessionToken);
              console.warn(sessionToken);
              await SecureStorage.save("ta_courses", coursesHtmlString);
              await SecureStorage.save("school_id", schoolId);
              await fetchSchoolName(schoolId);

              onLoadingChange?.(false);
              onResult("Login Success");
            } else {
              onLoadingChange?.(false);
              onResult("Login Failed: Could not find required cookies.");
            }
          } else {
            onResult("Login Failed: Unexpected content. Contact support!");
          }
        } else if (fetchCourseUrl) {
          if (html.toLowerCase().includes("log in")) {
            onResult("Login Failed: Session expired or invalid cookies.");
          } else {
            console.log("taauth: Course HTML fetched successfully from URL");
            onResult(html);
          }
        } else if (fetchWithCookies) {
          if (html.toLowerCase().includes("log in")) {
            onResult("Login Failed: Session expired or invalid cookies.");
          } else {
            onResult(html);
            console.log("taauth: html fetched successfully with cookies");
          }
        } else if (getGuidance) {
          if (html.toLowerCase().includes("log in")) {
            onResult("Retrieval failed: Session expired or invalid cookies.");
          } else if (html.includes("NOT A SCHOOL DAY")) {
            onResult("NOT A SCHOOL DAY");
          } else {
            onResult(html);
            console.log("taauth: guidance html fetched successfully");
          }
        } else if (bookAppointment) {
          console.log("taauth: Processing appointment booking response");
          if (html.toLowerCase().includes("log in")) {
            onResult("Booking Failed: Session expired or invalid cookies.");
          } else if (html.toLowerCase().includes("cancel")) {
            console.log("taauth: appointment booking successful");

            // extract appointment details and save them
            if (bookAppointment) {
              const appointmentDetails =
                extractAppointmentFromUrl(bookAppointment);
              const savedSchoolId = await SecureStorage.load("school_id");

              await saveAppointmentData({
                ...appointmentDetails,
                schoolId: savedSchoolId || appointmentDetails.schoolId,
                reason: "Guidance Appointment",
              });
            }

            onResult("Appointment booked successfully!");
          } else if (isAppointmentForm(html)) {
            console.log("taauth: appointment form detected, needs user input");
            onResult(html);
          } else {
            console.log(
              "taauth: appointment booking failed - unexpected response"
            );
            onResult("Failed to book appointment. Please try again.");
          }
        } else if (cancelAppointment) {
          console.log("taauth: Processing appointment cancellation response");
          if (html.toLowerCase().includes("log in")) {
            onResult(
              "Cancellation failed: Session expired or invalid cookies."
            );
          } else if (
            html.toLowerCase().includes("cancelled") ||
            html.toLowerCase().includes("canceled")
          ) {
            console.log("taauth: appointment cancelled successfully");

            // remove appointment from saved data
            if (cancelAppointment.id) {
              await removeAppointmentData(cancelAppointment.id);
            }

            onResult("Appointment cancelled successfully!");
          } else {
            // Even if we don't see explicit confirmation, remove from local storage
            if (cancelAppointment.id) {
              await removeAppointmentData(cancelAppointment.id);
            }
            onResult("Appointment successfully processed.");
          }
        } else if (submitAppointmentForm) {
          console.log("taauth: Processing form submission response");
          if (html.toLowerCase().includes("log in")) {
            onResult(
              "Form submission failed: Session expired or invalid cookies."
            );
          } else if (
            html.toLowerCase().includes("cancel") ||
            html.toLowerCase().includes("booked")
          ) {
            console.log("taauth: appointment form submitted successfully");

            // Save appointment data when form is successfully submitted
            if (submitAppointmentForm.hiddenFields) {
              const appointmentDetails = {
                date:
                  submitAppointmentForm.hiddenFields.dt ||
                  submitAppointmentForm.hiddenFields.inputDate ||
                  "",
                time: submitAppointmentForm.hiddenFields.tm || "",
                id:
                  submitAppointmentForm.hiddenFields.id ||
                  Date.now().toString(),
                schoolId: submitAppointmentForm.hiddenFields.school_id || "",
                reason: submitAppointmentForm.reason || "Guidance Appointment",
              };

              await saveAppointmentData(appointmentDetails);
            }

            onResult("Appointment booked successfully!");
          } else if (
            html.toLowerCase().includes("error") ||
            html.toLowerCase().includes("failed")
          ) {
            console.log("taauth: form submission failed");
            onResult("Failed to submit appointment form. Please try again.");
          } else {
            // assume success if we get a valid response without error indicators
            console.log("taauth: form submission completed");
            onResult("Appointment request submitted successfully!");
          }
        }
      } else if (message.type === "error") {
        console.error("taauth: WebView error:", message);
        onError?.(`taauth: WebView error: ${message}`);
        onResult("Operation Failed: WebView Error");
      }
    } catch (error: any) {
      console.error(
        "taauth: Error parsing WebView message or processing data:",
        error
      );
      onError?.(`taauth: Error processing data: ${error.toString()}`);
      onResult("Operation Failed: Internal Error");
    } finally {
      if (!isReauthenticating) {
        onLoadingChange?.(false);
      }
    }
  };

  const handleLoadEnd = () => {
    console.log("taauth: WebView onLoadEnd triggered");
    if (webviewRef.current) {
      console.log("taauth: Injecting JavaScript...");
      webviewRef.current.injectJavaScript(getInjectedJavaScript());
    } else {
      console.log("taauth: WebView ref is null!");
    }
  };

  const handleLoadStart = () => {
    console.log("taauth: WebView onLoadStart triggered for URL:", targetUrl);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("taauth: WebView error:", nativeEvent);
    console.error(
      "taauth: Error details:",
      JSON.stringify(nativeEvent, null, 2)
    );

    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    onError?.(`WebView error: ${nativeEvent.description || "Unknown error"}`);
    onLoadingChange?.(false);
  };

  // for form submissions, use webview native post capability
  if (submitAppointmentForm && targetUrl === "FORM_SUBMIT") {
    const formDataString = createFormDataString(
      isReauthenticating
        ? originalRequestRef.current?.submitAppointmentForm ||
            submitAppointmentForm
        : submitAppointmentForm
    );

    return (
      <View style={styles.hiddenWebViewContainer}>
        <WebView
          ref={webviewRef}
          source={{
            uri: "https://ta.yrdsb.ca/live/students/bookAppointment.php",
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formDataString,
          }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.hiddenWebView}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("taauth: WebView navigation error:", nativeEvent);

            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId);
              setTimeoutId(null);
            }

            onError?.(
              `taauth: WebView navigation error: ${nativeEvent.description}`
            );
            onResult(
              "Failed to reach TeachAssist servers! Check your internet and try again."
            );
            onLoadingChange?.(false);
          }}
        />
      </View>
    );
  }

  if (!targetUrl) {
    return null;
  }

  return (
    <View style={styles.hiddenWebViewContainer}>
      <WebView
        ref={webviewRef}
        source={{ uri: targetUrl }}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.hiddenWebView}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        onError={handleWebViewError}
        onLoadProgress={(event) => {
          console.log("taauth: Load progress:", event.nativeEvent.progress);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log(
            "taauth: HTTP error:",
            nativeEvent.statusCode,
            nativeEvent.description
          );
        }}
      />
    </View>
  );
};

// hide webview
const styles = StyleSheet.create({
  hiddenWebViewContainer: {
    width: 0,
    height: 0,
    position: "absolute",
    opacity: 0,
  },
  hiddenWebView: {
    flex: 1,
  },
});

export default TeachAssistAuthFetcher;
