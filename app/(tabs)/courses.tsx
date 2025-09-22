import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  // FlatList,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
import { parseStudentGrades, type Course } from "../(components)/CourseParser"; // Update import path
import GradeAverageTracker from "../(components)/GradeAverage";
import Messages from "../(components)/Messages";
import { CourseInfoBox } from "../(components)/QuickCourse";
import { useTheme } from "../contexts/ThemeContext";


const CoursesScreen = () => {
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [shouldRefreshWithLogin, setShouldRefreshWithLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const router = useRouter();

  // load cached course html for cpurses w subject ids
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
    if (result.includes("Login Failed") || result.includes("Session expired")) {
      // Try automatic re-authentication first
      const savedUsername = await SecureStorage.load("ta_username");
      const savedPassword = await SecureStorage.load("ta_password");

      if (savedUsername && savedPassword && !shouldRefreshWithLogin) {
        console.log(
          "Session expired, attempting automatic re-authentication..."
        );
        setMessage("Session expired. Re-authenticating...");
        setLoginCredentials({
          username: savedUsername,
          password: savedPassword,
        });
        setShouldRefreshWithLogin(true);
        return; // Don't redirect yet, try reauth first
      } else {
        // If already tried reauth or no credentials, redirect to signin
        setMessage("Please log in again.");
        router.replace("/signin");
      }
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

    if (!savedCoursesJson) {
      setMessage("Stored courses not found. Trying again...");
      console.warn("Courses not found in storage");
      setIsLoading(true);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);

    const networkState = await NetInfo.fetch();
    console.log("Connection type", networkState.type);

    if (networkState.isConnected === false) {
      setMessage(`No internet connection.\nCheck your network and try again.`);
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return; // Exit early if no internet
    }
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
  };

  // Filter courses by semester for organization
  const semester1Courses = courses.filter((course) => course.semester === 1);
  const semester2Courses = courses.filter((course) => course.semester === 2);

  useEffect(() => {
    loadHtmlOrFetch();
  }, []);

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <View className={`flex-row items-center justify-between mt-18 px-5`}>
        <Text
          className={`text-5xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          My Courses
        </Text>
        <View className="shadow-md">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleRefresh();
            }}
            className={`${isDark ? "bg-baccent/95" : "bg-baccent"} rounded-lg px-3 py-2`}
            disabled={isLoading}
          >
            <Image
              source={require("../../assets/images/refresh.png")}
              className={`w-7 h-8`}
              style={{
                tintColor: `${isDark ? "#111113" : "#fafafa"}`,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text
        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg mt-1 px-5`}
      >
        {Messages()}
      </Text>
      {message === "" ? (
        <View className={`mb-2`}></View> // show nothing successfully fetched
      ) : (
        <Text
          className={`${
            message.includes("No internet")
              ? "bg-danger text-appwhite"
              : `bg-baccent/80 ${isDark ? "text-appwhite" : "text-appblack"}`
          } mt-5 p-2 text-center rounded-lg font-medium mb-5 mx-5 px-5`}
        >
          {message}
        </Text> // disent betwn normal and no internet
      )}
      {isLoading && (
        <>
          <ActivityIndicator size="large" color="#ffffff" className={`mt-5`} />
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
        <ScrollView showsVerticalScrollIndicator={false} className="px-5">
          {/* this is literally the only way it works and i have no idea why wtf*/}
          <View className="shadow-md mt-5">
            <GradeAverageTracker
              showTrend={true}
              showCourseCount={true}
              showLastUpdated={true}
            />
          </View>
          {/* sem 1 Courses */}
          {semester1Courses.length > 0 && (
            <View>
              <View className={`mt-2`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-medium`}
                >
                  Semester{" "}
                  <Text className={`text-baccent text-2xl font-bold`}>1</Text>
                </Text>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2`}
                >
                  {semester1Courses.length} courses available
                </Text>
              </View>
              {semester1Courses.map((course) => (
                <View key={`${course.courseCode}-${course.semester}`}>
                  {course.hasGrade ? (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push(`/courseview/${course.subjectId}`);
                      }}
                      className="mb-6"
                    >
                      <CourseInfoBox course={course} />
                    </TouchableOpacity>
                  ) : (
                    <View className="shadow-md">
                      <View
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          borderRadius: 12,
                        }}
                        className="mb-6"
                      >
                        <CourseInfoBox course={course} />
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1,
                            overflow: "hidden",
                            borderRadius: 12,
                          }}
                        >
                          <ImageBackground
                            source={
                              isDark
                                ? require("../../assets/images/striped_bg.png")
                                : require("../../assets/images/striped_bg_white.png")
                            }
                            style={{ flex: 1 }}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* sem 2 Courses */}
          {semester2Courses.length > 0 && (
            <>
              <View className={`mt-6`}>
                <Text
                  className={`${isDark ? "text-appwhite" : "text-appblack"} text-xl font-medium`}
                >
                  Semester{" "}
                  <Text className={`text-baccent text-2xl font-bold`}>2</Text>
                </Text>
                <Text
                  className={`${isDark ? "text-appgraylight" : "text-appgraydark"} text-md mb-2`}
                >
                  {semester2Courses.length} courses available
                </Text>
              </View>
              {semester2Courses.map((course) => (
                <View key={`${course.courseCode}-${course.semester}`}>
                  {course.hasGrade ? (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push(`/courseview/${course.subjectId}`);
                      }}
                      className="mb-6"
                    >
                      <CourseInfoBox course={course} />
                    </TouchableOpacity>
                  ) : (
                    <View className="shadow-md">
                      <View
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          borderRadius: 12,
                        }}
                        className="mb-6"
                      >
                        <CourseInfoBox course={course} />
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1,
                            overflow: "hidden",
                            borderRadius: 12,
                          }}
                        >
                          <ImageBackground
                            source={
                              isDark
                                ? require("../../assets/images/striped_bg.png")
                                : require("../../assets/images/striped_bg_white.png")
                            }
                            style={{ flex: 1 }}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
          <Link
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            className={`mb-10 mt-3 p-3`}
          >
            <Text
              className={`text-appgraydark text-center text-md`}
            >
              click me for a prize
            </Text>
          </Link>
        </ScrollView>
      )}

      {!isLoading && courses.length === 0 && (
        <View className={`flex items-center justify-center mt-10`}>
          <Image
            source={require("../../assets/images/not_found.png")}
            className={`w-30 h-30 my-3`}
            style={{ tintColor: "#27b1fa" }}
          />
          <Text
            className={`${isDark ? "text-appwhite" : "text-appblack"} text-center text-xl font-semibold`}
          >
            {"No courses found!\nPlease try again later."}
          </Text>
        </View>
      )}
    </View>
  );
};

export default CoursesScreen;
