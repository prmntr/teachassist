import { findOne, textContent } from "domutils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { parseDocument } from "htmlparser2";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import TeachAssistAuthFetcher, { SecureStorage } from "../(auth)/taauth";
// Import the new parser component
import { GradesParser } from "../(components)/GradeParser";

// Helper to extract just the course name quickly for the header
const getCourseNameFromHtml = (html: string | null): string => {
  if (!html) return "Course";
  try {
    const dom = parseDocument(html);
    const h2 = findOne((el) => el.tagName === "h2", dom, true);
    return h2 ? textContent(h2).trim() : "Course";
  } catch (e) {
    return "Course name encountered an error \n" + JSON.stringify(e);
  }
};

const CourseViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const subjectID = id ? parseInt(id as string, 10) : null;

  const [courseHtml, setCourseHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");

  const onFetchResult = (result: string) => {
    if (result.includes("Login Failed")) {
      setMessage("Session expired. Please log in again.");
      setTimeout(() => router.replace("/signin"), 2000);
    } else {
      setCourseHtml(result);
      setIsLoading(false);
      setMessage("Course data loaded from network.");
      if (subjectID) {
        SecureStorage.save(`course_${subjectID}`, result);
      }
    }
  };

  const onError = (error: string) => {
    setMessage(`Error: ${error}`);
    setTimeout(() => router.replace("/signin"), 2000);
  };

  const onLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  useEffect(() => {
    const loadCourseData = async () => {
      if (subjectID === null) {
        setMessage("Error: No course ID provided.");
        setIsLoading(false);
        return;
      }

      const cachedHtml = await SecureStorage.load(`course_${subjectID}`);

      if (cachedHtml) {
        setCourseHtml(cachedHtml);
        setIsLoading(false);
        setMessage("Course data loaded from cache.");
      } else {
        setMessage(
          `No cached data for course ${subjectID}. Fetching from network...`
        );
        setIsLoading(true); // Ensure loading is true when fetching
      }
    };

    loadCourseData();
  }, [subjectID]);

  // Use useMemo to avoid re-parsing the course name on every render
  const courseName = useMemo(
    () => getCourseNameFromHtml(courseHtml),
    [courseHtml]
  );

  // Determine if we need to render the fetcher component
  const shouldFetch = !courseHtml && isLoading;

  return (
    <View className="bg-2 flex-1">
      <TouchableOpacity
        className="absolute top-15 left-5 flex flex-row items-center gap-2 bg-gray-700/80 rounded-lg px-4 py-2 shadow-lg z-50 backdrop-blur-xl"
        onPress={() => {
          router.replace("/courses");
        }}
      >
        <Image
          className="w-8 h-8"
          style={{ tintColor: "#edebea" }}
          source={require("../../assets/images/arrow-icon-left.png")}
        />
        <Text className="text-white font-semibold text-lg">Back</Text>
      </TouchableOpacity>
      <ScrollView>
        <View className="pt-20 px-5 pb-10 mt-10">
          <Text className="text-center text-baccent text-4xl font-bold mb-2">
            {isLoading && !courseHtml ? "Loading..." : courseName}
          </Text>
          <Text className="bg-emerald-500/20 border-emerald-500/30 border text-emerald-400/80 p-2 text-center rounded-lg font-medium mb-5 mt-1">
            {message}
          </Text>

          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#27b1fa" />
              {/* The fetcher is now a hidden component, triggered by state */}
              {shouldFetch && subjectID !== null && (
                <View style={{ display: "none" }}>
                  <TeachAssistAuthFetcher
                    fetchWithCookies
                    subjectID={subjectID}
                    onResult={onFetchResult}
                    onError={onError}
                    onLoadingChange={onLoadingChange}
                  />
                </View>
              )}
            </>
          ) : (
            // When not loading, and we have HTML, render the parser
            courseHtml && <GradesParser htmlContent={courseHtml} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default CourseViewScreen;
