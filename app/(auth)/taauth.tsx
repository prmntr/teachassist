import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as SecureStore from "expo-secure-store";

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

// accepts several props:

// vanilla login user pass
type LoginParams = {
  username: string;
  password: string;
};

interface TeachAssistAuthFetcherProps {
  loginParams?: LoginParams;
  // fetch with saved cookies; for getting courses
  fetchWithCookies?: boolean;
  // getting id
  subjectID?: number | null;

  onResult: (result: string) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

interface WebViewDataMessage {
  type: "htmlAndCookies";
  html: string;
  cookies: string;
}

// props may change in future
const TeachAssistAuthFetcher: React.FC<TeachAssistAuthFetcherProps> = ({
  loginParams,
  fetchWithCookies,
  subjectID,
  onResult,
  onError,
  onLoadingChange,
}) => {
  const webviewRef = useRef<WebView>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  // get course url in string; may break
  const extractCourseIds = (htmlString: string): string[] => {
    const sixDigitRegex = /\b\d{6}\b/g;
    const matches = htmlString.match(sixDigitRegex);
    return matches ? [...new Set(matches)] : []; // remove duplicates
  };

  // fetch course HTML for multiple course ids
  const fetchMultipleCourses = async (
    courseIds: string[],
    cookies: string,
    studentId: string
  ) => {
    console.log(
      `taauth: Pre-fetching HTML for ${courseIds.length} courses: ${courseIds.join(", ")}`
    );

    for (const courseId of courseIds) {
      try {
        // just in case extractor failed
        if (courseId.length !== 6 || !/^\d{6}$/.test(courseId)) {
          console.warn(`taauth: Skipping invalid course ID: ${courseId}`);
          // in case course id is invalid
          await SecureStorage.save(
            `course_${courseId}`,
            `<h2>Invalid Course ID</h2><div>Course ID ${courseId} is not valid.</div>`
          );
          continue;
        }

        // who at teachassist authorized this
        const courseUrl = `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${courseId}&student_id=${studentId}`;

        console.log(`taauth: fetching course ${courseId} for spec. course url`);

        const response = await fetch(courseUrl, {
          headers: {
            Cookie: cookies,
          },
        });

        if (response.ok) {
          const courseHtml = await response.text();
          await SecureStorage.save(`course_${courseId}`, courseHtml);
          console.log(`taauth: successfully cached course ${courseId}`);
        } else {
          console.warn(
            `taauth: FAILED to get course ${courseId}, status: ${response.status}`
          );
          // give the user the error
          await SecureStorage.save(
            `course_${courseId}`,
            `<h2>Course ${courseId}</h2><div>Failed to load course data.</div>`
          );
        }
      } catch (error) {
        console.error(`taauth: Error fetching course ${courseId}:`, error);
        // give the user the error
        await SecureStorage.save(
          `course_${courseId}`,
          `<h2>Course ${courseId}</h2><div>Error loading course: ${error}</div>`
        );
      }
    }
  };

  // initialize everything
  useEffect(() => {
    const initializeFetcher = async () => {
      onLoadingChange?.(true);

      // get user and pass
      const savedStudentId = await SecureStorage.load("ta_student_id");
      const savedSessionToken = await SecureStorage.load("ta_session_token");

      // check for main courses page html first if not logging in
      if (!loginParams && !subjectID) {
        const cachedMainHtml = await SecureStorage.load("courses_main_html");
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
        const url = `https://ta.yrdsb.ca/live/index.php?subject_id=0&username=${encodedUsername}&password=${encodedPassword}&submit=Login`;
        setTargetUrl(url);
      } else if (
        fetchWithCookies &&
        savedStudentId &&
        savedSessionToken &&
        subjectID !== null
      ) {
        // If cache is missed
        // TODO: why is this broken
        console.log(
          `taauth: Cache miss for course ${subjectID}. Attempting to fetch with saved cookies.`
        );
        const url = `https://ta.yrdsb.ca/live/students/viewReport.php?subject_id=${subjectID}&student_id=${savedStudentId}`;
        setTargetUrl(url);
      } else {
        const errorMessage = "taauth: Invalid parameters or no saved session.";
        console.error(errorMessage);
        onError?.(errorMessage);
        onLoadingChange?.(false);
      }
    };

    initializeFetcher();
  }, [
    loginParams,
    fetchWithCookies,
    subjectID,
    onResult,
    onError,
    onLoadingChange,
  ]);

  // meat
  const injectedJavaScript = `
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

  // maybe refactor
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

            // parse using ai generated regex for courses
            const allDivs = html.match(
              /<div class="green_border_message box">([\s\S]*?)<\/div>/g
            );

            let courseArr: string[] = [];

            if (allDivs) {
              const targetDiv = allDivs.find((div) =>
                div.includes("Course Name")
              );

              if (targetDiv) {
                // Get TR tags from that div
                const matches = targetDiv.match(/<tr[\s\S]*?<\/tr>/g);
                if (matches) {
                  courseArr = matches.map((tr) =>
                    tr.replace(/<[^>]*>/g, "").trim()
                  );
                }
              }
            }

            console.log("Course response: " + courseArr);
            const coursesHtmlString = JSON.stringify(courseArr);

            const cookiePairs = cookies.split("; ").map((c) => c.split("="));
            const studentId =
              cookiePairs.find((pair) => pair[0] === "student_id")?.[1] || null;
            const sessionToken =
              cookiePairs.find((pair) => pair[0] === "session_token")?.[1] ||
              null;

            if (studentId && sessionToken) {
              // save everything
              await SecureStorage.save("ta_username", loginParams.username);
              await SecureStorage.save("ta_password", loginParams.password);
              await SecureStorage.save("ta_student_id", studentId);
              await SecureStorage.save("ta_session_token", sessionToken);
              await SecureStorage.save("courses_main_html", coursesHtmlString);

              // extract course IDs from the courses HTML and fetch all of them
              const courseIds = extractCourseIds(coursesHtmlString);

              if (courseIds.length > 0) {
                console.log(
                  `taauth: Found ${courseIds.length} course ids: ${courseIds.join(", ")}`
                );
                await fetchMultipleCourses(courseIds, cookies, studentId);
                console.log(
                  "taauth: everything stored securely"
                );
              } else {
                console.log("taauth: no course ids were found.");
              }

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
          // This block is for fetching course data with cookies
          if (html.toLowerCase().includes("log in")) {
            onResult("Login Failed: Session expired or invalid cookies.");
          } else {
            onResult(html);
            console.log("taauth: html fetched successfully with cookies");
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
      webviewRef.current.injectJavaScript(injectedJavaScript);
    }
  };

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
          onResult("Failed to reach TeachAssist servers! Check your internet and try again.");
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
