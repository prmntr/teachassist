import { useRouter, Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import { CourseInfoBox } from "../(components)/QuickCourse";
import Messages from "../(components)/Messages";

// Retrieve each course


const CoursesScreen = () => {
  const [coursesHtml, setCoursesHtml] = useState<string | null>(null);
  const [cachedHtml, setCachedHtml] = useState<{ [key: string]: string }>({});
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const router = useRouter();

  // since idk what the courses thing looks like (made in august), take a chance and get 6 digit strings
  const extractCourseIds = (htmlString: string): string[] => {
    const sixDigitRegex = /\b\d{6}\b/g;
    const matches = htmlString.match(sixDigitRegex);
    return matches ? [...new Set(matches)] : []; // remove duplicates
  };

  // get the html of all the courses (should already be here from taauth)
  const loadCachedCourses = async (ids: string[]) => {
    const cached: { [key: string]: string } = {};
    for (const id of ids) {
      const cachedData = await SecureStorage.load(`course_${id}`);
      if (cachedData) {
        cached[id] = cachedData;
      }
    }
    setCachedHtml(cached);
  };

  const getUserName = async () => {
    const userName = await SecureStorage.load("ta_username");
    return userName;
  };

  const onFetchResult = async (result: string) => {
    if (result.includes("Login Failed")) {
      setMessage("Session expired. Please log in again.");
      router.replace("/signin");
    } else if (result === "Login Success") {
      // after successful login, reload the data
      setMessage("Login successful! Loading courses...");
      setShouldRefreshWithLogin(false);
      loadHtmlOrFetch();
    } else {
      setCoursesHtml(result);

      // Extract course IDs from the result
      const extractedIds = extractCourseIds(result);
      setCourseIds(extractedIds);

      if (extractedIds.length > 0) {
        setMessage(
          `Found ${extractedIds.length} course(s). Loading cached data...`
        );

        // Load cached HTML for all found course IDs
        await loadCachedCourses(extractedIds);

        setMessage(
          `Courses loaded successfully. Found course IDs: ${extractedIds.join(", ")}`
        );
      } else {
        setMessage("No course IDs found in the response.");
      }

      setIsLoading(false);
    }
  };

  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setShouldRefreshWithLogin(false);
    // Don't automatically redirect to signin on refresh errors
    setIsLoading(false);
  };

  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const loadHtmlOrFetch = async () => {
    setMessage("Checking for saved courses...");
    const savedCourses = await SecureStorage.load("courses_main_html");
    console.log(savedCourses);

    await getUserName();

    if (savedCourses) {
      setCoursesHtml(savedCourses);

      // Extract course IDs from saved courses
      const extractedIds = extractCourseIds(savedCourses);
      setCourseIds(extractedIds);

      if (extractedIds.length > 0) {
        // Load cached HTML for all found course IDs
        await loadCachedCourses(extractedIds);
      }
      setMessage(`Courses last updated ${new Date().toLocaleTimeString()}`);

      setIsLoading(false);
    } else {
      setMessage(
        "Stored courses not found. Trying again..." // reauth with cookies
      );
      console.warn("Cookies not found");
      setIsLoading(true);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setCoursesHtml(null);
    setCachedHtml({});
    setCourseIds([]);

    // clear html
    await SecureStorage.delete("courses_main_html");

    // clear KNOWN course ids
    for (const id of courseIds) {
      await SecureStorage.delete(`course_${id}`);
    }

    // get credentials
    const savedUsername = await SecureStorage.load("ta_username");
    const savedPassword = await SecureStorage.load("ta_password");

    if (savedUsername && savedPassword) {
      setMessage("Refreshing...");
      setLoginCredentials({
        username: savedUsername,
        password: savedPassword,
      });
      setShouldRefreshWithLogin(true);
    } else {
      router.replace("/signin");
      Alert.alert("Username and password not found. Please log in again.");
    }
  };

  useEffect(() => {
    loadHtmlOrFetch();
  }, []);

  return (
    <View className="flex-1 bg-2 px-5">
      <View className="flex-row items-center justify-between mt-18">
        <Text className="text-5xl font-semibold text-appwhite">My Courses</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          className="bg-baccent/20 border-baccent/30 border rounded-lg px-3 py-2"
          disabled={isLoading}
        >
          <Image
            source={require("../../assets/images/refresh.png")}
            className="w-8 h-8"
            style={{ tintColor: "#27b1fa" }}
          />
        </TouchableOpacity>
      </View>
      <Text className="text-gray-300 text-lg mt-1">{Messages()}</Text>
      <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 mt-5 p-2 text-center rounded-lg font-medium">
        {message}
      </Text>

      {isLoading && (
        <>
          <ActivityIndicator size="large" color="#ffffff" className="mt-5" />
          {message.includes("re-authenticate") && (
            <TeachAssistAuthFetcher
              fetchWithCookies
              onResult={onFetchResult}
              onError={onError}
              onLoadingChange={onLoadingChange}
            />
          )}
          {shouldRefreshWithLogin && loginCredentials && (
            <TeachAssistAuthFetcher
              loginParams={loginCredentials}
              onResult={onFetchResult}
              onError={onError}
              onLoadingChange={onLoadingChange}
            />
          )}
        </>
      )}

      {coursesHtml && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {courseIds.length === 0 ? (
            <View className="flex items-center justify-center mt-10">
              <Image
                source={require("../../assets/images/not_found.png")}
                className=" w-30 h-30 my-3"
                style={{ tintColor: "#27b1fa" }}
              />
              <Text className="text-appwhite text-center text-xl font-semibold">
                {"No courses found! \nPlease try again later."}
              </Text>
            </View>
          ) : (
            <>
              {/* 
              <Text className="text-white mb-4">
                {"Response from teachassist: \n\n" + coursesHtml}
              </Text>
              */}

              {/* display course ids */}
              {courseIds.map((courseId) => (
                <Link
                  key={courseId}
                  href={
                    !cachedHtml[courseId]
                      ? `/courseview/Error`
                      : `/courseview/${courseId}`
                  }
                  className={`min-w-max my-7 ${
                    cachedHtml[courseId]?.toLowerCase().includes("internet")
                      ? "pointer-events-none cursor-default"
                      : ""
                  }`}
                >
                  <CourseInfoBox htmlContent={cachedHtml[courseId] ?? ""} />
                </Link>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default CoursesScreen;
