import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import { parseStudentGrades, type Course } from "../(components)/CourseParser"; // Update import path
import Messages from "../(components)/Messages";
import { CourseInfoBox } from "../(components)/QuickCourse";
import GradeAverageTracker from "../(components)/GradeAverage";

const CoursesScreen = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const router = useRouter();

  // Load cached course HTML data for courses that have subject IDs
  const loadCachedCourses = async (courseList: Course[]) => {
    const cached: { [key: string]: string } = {};
    for (const course of courseList) {
      if (course.subjectId) {
        const cachedData = await SecureStorage.load(
          `course_${course.subjectId}`
        );
        if (cachedData) {
          cached[course.subjectId] = cachedData;
        }
      }
    }
  };

  const getUserName = async () => {
    const userName = await SecureStorage.load("ta_username");
    return userName;
  };

  const onFetchResult = async (result: string) => {
    if (result.includes("Login Failed")) {
      setMessage("Session expired. Please log in again.");
      router.replace("/signin");
    } else if (result.includes("Login Success")) {
      // After successful login, reload the data
      setMessage("Login successful! Loading courses...");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShouldRefreshWithLogin(false);
      loadHtmlOrFetch();
    } else {
      // Parse the HTML using the new parser
      try {
        const parsedCoursesJson = parseStudentGrades(result);
        const parsedCourses: Course[] = JSON.parse(parsedCoursesJson);

        // Save to secure storage
        await SecureStorage.save("ta_courses", parsedCoursesJson);

        setCourses(parsedCourses);

        if (parsedCourses.length > 0) {
          setMessage(
            `Found ${parsedCourses.length} course(s). Loading cached data...`
          );

          // Load cached HTML for courses with subject IDs
          await loadCachedCourses(parsedCourses);

          const coursesWithGrades = parsedCourses.filter(
            (course) => course.hasGrade
          );
          setMessage(
            `Courses loaded successfully. ${coursesWithGrades.length} courses have grades available.`
          );
        } else {
          setMessage("No courses found in the response.");
        }
      } catch (error) {
        console.error("Error parsing courses:", error);
        setMessage("Error parsing course data. Please try again.");
      }

      setIsLoading(false);
    }
  };

  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setShouldRefreshWithLogin(false);
    setIsLoading(false);
  };

  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const loadHtmlOrFetch = async () => {
    setMessage("Checking for saved courses...");
    const savedCoursesJson = await SecureStorage.load("ta_courses");

    await getUserName();

    if (savedCoursesJson) {
      try {
        const savedCourses: Course[] = JSON.parse(savedCoursesJson);
        setCourses(savedCourses);

        // Load cached HTML for courses with subject IDs
        await loadCachedCourses(savedCourses);

        setMessage(``);
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing saved courses:", error);
        setMessage("Error loading saved courses. Fetching fresh data...");
        // Continue to fetch fresh data
      }
    }

    // Check if this is a test account
    const savedUsername = await SecureStorage.load("ta_username");
    if (savedUsername?.includes("123456789")) {
      setMessage("This is a test account. No courses are available.");
      setCourses([]);
      setIsLoading(false);
    } else if (!savedCoursesJson) {
      setMessage("Stored courses not found. Trying again...");
      console.warn("Courses not found in storage");
      setIsLoading(true);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setCourses([]);

    // Clear stored course data
    await SecureStorage.delete("ta_courses");

    // Clear cached HTML for courses that have subject IDs
    for (const course of courses) {
      if (course.subjectId) {
        await SecureStorage.delete(`course_${course.subjectId}`);
      }
    }

    // Get credentials for re-authentication
    const savedUsername = await SecureStorage.load("ta_username");
    const savedPassword = await SecureStorage.load("ta_password");

    if (savedUsername && savedPassword) {
      setMessage("Refreshing...");
      setLoginCredentials({
        username: savedUsername,
        password: savedPassword,
      });
      setShouldRefreshWithLogin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      router.replace("/signin");
      Alert.alert("Username and password not found. Please log in again.");
    }

    // Handle test account
    if (savedUsername === "123456789") {
      console.log(savedUsername);
      setCourses([]);
      setIsLoading(false);
    }
  };

  // Filter courses by semester for organization
  const semester1Courses = courses.filter((course) => course.semester === 1);
  const semester2Courses = courses.filter((course) => course.semester === 2);

  useEffect(() => {
    loadHtmlOrFetch();
  }, []);

  return (
    <View className="flex-1 bg-2 px-5">
      <View className="flex-row items-center justify-between mt-18">
        <Text className="text-5xl font-semibold text-appwhite">My Courses</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            handleRefresh();
          }}
          className="bg-baccent/80 rounded-lg px-3 py-2"
          disabled={isLoading}
        >
          <Image
            source={require("../../assets/images/refresh.png")}
            className="w-8 h-8"
            style={{ tintColor: "#191919" }}
          />
        </TouchableOpacity>
      </View>
      <Text className="text-gray-300 text-lg mt-1">{Messages()}</Text>
      {message === "" ? (
        <View className="mb-5"></View> // show nothing successfully fetched
      ) : (
        <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 mt-5 p-2 text-center rounded-lg font-medium mb-5">
          {message}
        </Text>
      )}

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

      {courses.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <GradeAverageTracker
            showTrend={true}
            showCourseCount={true}
            showLastUpdated={true}
          />
          {/* sem 1 Courses */}
          {semester1Courses.length > 0 && (
            <>
              <View className="mt-6">
                <Text className="text-appwhite/90 text-xl font-semibold mb-2">
                  Semester 1 ({semester1Courses.length} courses)
                </Text>
              </View>
              {semester1Courses.map((course) => (
                <View key={`${course.courseCode}-${course.semester}`}>
                  {course.hasGrade ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.replace("/courseview/${course.subjectId}")
                      }
                    >
                      <CourseInfoBox courseCode={course.courseCode} />
                    </TouchableOpacity>
                  ) : (
                    <View>
                      <CourseInfoBox courseCode={course.courseCode} />
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* sem 2 Courses */}
          {semester2Courses.length > 0 && (
            <>
              <View className="mt-6">
                <Text className="text-appwhite/90 text-xl font-semibold mb-2">
                  Semester 2 ({semester2Courses.length} courses)
                </Text>
              </View>
              {semester2Courses.map((course) => (
                <View key={`${course.courseCode}-${course.semester}`}>
                  {course.hasGrade ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.replace("/courseview/${course.subjectId}")
                      }
                    >
                      <CourseInfoBox courseCode={course.courseCode} />
                    </TouchableOpacity>
                  ) : (
                    <View>
                      <CourseInfoBox courseCode={course.courseCode} />
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {!isLoading && courses.length === 0 && (
        <View className="flex items-center justify-center mt-10">
          <Image
            source={require("../../assets/images/not_found.png")}
            className="w-30 h-30 my-3"
            style={{ tintColor: "#27b1fa" }}
          />
          <Text className="text-appwhite text-center text-xl font-semibold">
            {"No courses found! \nPlease try again later."}
          </Text>
        </View>
      )}
    </View>
  );
};

export default CoursesScreen;
