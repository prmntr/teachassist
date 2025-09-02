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

// Appointment data structure
export interface AppointmentData {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM:SS format
  teacher?: string;
  subject?: string;
  reason?: string;
  bookedAt: string; // ISO timestamp when booked
  schoolId: string;
}

interface TeachAssistAuthFetcherProps {
  loginParams?: LoginParams;
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
  getGuidance,
  bookAppointment,
  submitAppointmentForm,
  cancelAppointment,
  onResult,
  onError,
  onLoadingChange,
}) => {
  const webviewRef = useRef<WebView>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null); // to manage the url webview will load; once changed webview will navigate

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

      // Create new appointment object
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

      // Add to appointments array
      appointments.push(newAppointment);

      // Save back to secure storage
      await SecureStorage.save("ta_appointments", JSON.stringify(appointments));
      console.log("taauth: Appointment data saved successfully");
    } catch (error) {
      console.error("taauth: Error saving appointment data:", error);
    }
  };

  // reve appointment from secure store
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

  // parse the url to get the important bits of the appointment
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

    //* fix
    if (formData.online) {
      params.append("online", "100");
    }

    params.append("submit", "Submit Reason");

    return params.toString();
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
    "room": "123",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "93",
    "hasGrade": true
  },
  {
    "courseCode": "MHF4U1-5",
    "courseName": "Advanced Functions",
    "block": "3",
    "room": "67",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "99",
    "hasGrade": true
  },
  {
    "courseCode": "LUNCH-3",
    "courseName": "Lunch with Kai Cenat",
    "block": "4",
    "room": "THICK",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "See teacher",
    "hasGrade": false
  },
  {
    "courseCode": "FRNCH-1",
    "courseName": "French As A Second language",
    "block": "5",
    "room": "Ãâ‚¬",
    "startDate": "2025-09-02",
    "semester": 1,
    "endDate": "2026-01-29",
    "grade": "56",
    "hasGrade": true
  },
  {
    "courseCode": "SCH4U1-1",
    "courseName": "Chemistry",
    "block": "1",
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
      } else if (getGuidance && savedStudentId && savedSessionToken) {
        const savedSchoolId = await SecureStorage.load("school_id");
        if (savedSchoolId) {
          const guidanceDate = getGuidance.toISOString().slice(0, 10);
          console.log(`taauth: Fetching guidance for date ${guidanceDate}`);
          const url = `https://ta.yrdsb.ca/live/students/bookAppointment.php?school_id=${savedSchoolId}&student_id=${savedStudentId}&inputDate=${guidanceDate}`;
          setTargetUrl(url);
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
      } else if (cancelAppointment && savedStudentId && savedSessionToken) {
        const { date, time, id, schoolId } = cancelAppointment;
        const cancelUrl = `https://ta.yrdsb.ca/live/students/bookAppointment.php?dt=${date}&tm=${time}&id=${id}&school_id=${schoolId}&action=cancel`;
        console.log(`taauth: Canceling appointment with URL: ${cancelUrl}`);
        setTargetUrl(cancelUrl);
      } else if (submitAppointmentForm && savedStudentId && savedSessionToken) {
        // Handle form submission using WebView's POST capability
        console.log("taauth: Submitting appointment form data");
        setTargetUrl("FORM_SUBMIT"); // Special marker for form submission
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
    getGuidance,
    bookAppointment,
    submitAppointmentForm,
    cancelAppointment,
    onResult,
    onError,
    onLoadingChange,
  ]);

  // Enhanced JavaScript injection for form submissions
  const getInjectedJavaScript = () => {
    // Default JavaScript for getting HTML and cookies
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

  // Check if HTML contains a form that needs to be filled
  const isAppointmentForm = (html: string): boolean => {
    return (
      html.includes('name="reason"') &&
      html.includes('type="radio"') &&
      html.includes("Submit Reason")
    );
  };

  // maybe refactor
  // the webview has fetched whatever html was requested, handle it here
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const message: WebViewDataMessage = JSON.parse(event.nativeEvent.data);
      if (message.type === "htmlAndCookies") {
        let { html, cookies } = message;

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

            console.log(coursesHtmlString);
            console.log(coursesHtmlString.length);

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

            // Extract appointment details and save them
            if (bookAppointment) {
              const appointmentDetails =
                extractAppointmentFromUrl(bookAppointment);
              const savedSchoolId = await SecureStorage.load("school_id");

              await saveAppointmentData({
                ...appointmentDetails,
                schoolId: savedSchoolId || appointmentDetails.schoolId,
                reason: "Guidance Appointment", // Default reason, could be enhanced
              });
            }

            onResult("Appointment booked successfully!");
          } else if (isAppointmentForm(html)) {
            console.log("taauth: appointment form detected, needs user input");
            onResult(html); // Return the form HTML for the UI to parse
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

            // Remove appointment from saved data
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
            // Assume success if we get a valid response without error indicators
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
      onLoadingChange?.(false);
    }
  };

  const handleLoadEnd = () => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(getInjectedJavaScript());
    }
  };

  // for form submissions, use WebView's native POST capability
  if (submitAppointmentForm && targetUrl === "FORM_SUBMIT") {
    const formDataString = createFormDataString(submitAppointmentForm);

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
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.hiddenWebView}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("taauth: WebView navigation error:", nativeEvent);
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
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.hiddenWebView}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("taauth: WebView navigation error:", nativeEvent);
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
