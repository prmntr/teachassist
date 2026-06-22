import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  View,
} from "react-native";
import { hapticsImpact, hapticsNotification } from "@/utils/haptics";
import {
  fetchTeacherDetails,
  formatTeacherDate,
  type TeacherDetails,
  type TeacherQualification,
} from "@/utils/teacherRegistry";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import PageBackground from "@/components/ui/PageBackground";

const TeacherDetailsPage = () => {
  const { activeTone, isDark } = useTheme();
  const params = useLocalSearchParams();
  const octid = Array.isArray(params.octid) ? params.octid[0] : params.octid;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const status = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const firstCertified = Array.isArray(params.firstCertified)
    ? params.firstCertified[0]
    : params.firstCertified;
  const applicationType = Array.isArray(params.applicationType)
    ? params.applicationType[0]
    : params.applicationType;
  const clientGuid = Array.isArray(params.clientGuid)
    ? params.clientGuid[0]
    : params.clientGuid;
  const [details, setDetails] = useState<TeacherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const detailsRequestId = useRef(0);
  const mutedTextClassName = isDark ? "text-appgraylight" : "text-appgraydark";

  useEffect(() => {
    const requestId = detailsRequestId.current + 1;
    detailsRequestId.current = requestId;
    let isActiveRequest = true;

    const loadDetails = async () => {
      setDetails(null);
      setLoading(true);

      if (!octid) {
        setLoading(false);
        return;
      }

      try {
        const teacherDetails = await fetchTeacherDetails({
          id: octid,
          name: name || "Teacher",
          status: status || "",
          firstCertified: firstCertified || "",
          applicationType: applicationType || "",
          clientGuid: clientGuid || "",
        });
        if (!isActiveRequest || detailsRequestId.current !== requestId) return;
        setDetails(teacherDetails);
        await hapticsNotification(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        if (!isActiveRequest || detailsRequestId.current !== requestId) return;
        console.warn("teacher details failed", error);
        await hapticsNotification(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Unable to Load Qualifications",
          "The teacher registry did not return details. Try again later.",
        );
      } finally {
        if (isActiveRequest && detailsRequestId.current === requestId) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isActiveRequest = false;
    };
  }, [applicationType, clientGuid, firstCertified, name, octid, status]);

  const renderQualificationSection = (
    title: string,
    subtitle: string,
    qualifications: TeacherQualification[],
  ) => (
    <View className="mt-7">
      <Text
        className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold`}
      >
        {title}
      </Text>
      <Text className={`${mutedTextClassName} text-sm mt-1 leading-5`}>
        {subtitle}
      </Text>
      {qualifications.length === 0 ? (
        <Text className={`${mutedTextClassName} mt-2 text-sm`}>
          No records listed.
        </Text>
      ) : (
        qualifications.map((item, index) => (
          <View
            key={`${title}-${item.subject || item.name || "qualification"}-${index}`}
            className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-xl p-3 mt-2`}
          >
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold`}
            >
              {item.subject || item.name || "Qualification"}
            </Text>
            {item.option ? (
              <Text className={`${mutedTextClassName} text-sm mt-1`}>
                Option: {item.option}
              </Text>
            ) : null}
            {item.division ? (
              <Text className={`${mutedTextClassName} text-sm mt-1`}>
                {item.division}
              </Text>
            ) : null}
            {item.institution ? (
              <Text className={`${mutedTextClassName} text-sm mt-1`}>
                {item.institution}
              </Text>
            ) : null}
            {item.code || item.type ? (
              <Text className={`${mutedTextClassName} text-xs mt-1`}>
                {[item.type, item.code].filter(Boolean).join(" / ")}
              </Text>
            ) : null}
            {item.date ? (
              <Text className={`${mutedTextClassName} text-xs mt-2`}>
                {formatTeacherDate(item.date)}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/TeacherSearch" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        {loading ? (
          <View>
            <ActivityIndicator
              size="large"
              className="mt-8"
              color={activeTone.accent}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} text-lg font-semibold text-center mt-5`}
            >
              Loading teacher information...
            </Text>
          </View>
        ) : details ? (
          <View>
            <View className="flex-row items-center mb-5">
              <Text
                className={`text-4xl font-semibold flex-1 ${isDark ? "text-appwhite" : "text-appblack"}`}
                numberOfLines={2}
              >
                {details.name}
              </Text>
              <LiquidGlassButton
                onPress={async () => {
                  await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(
                    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(details.name)}`,
                  );
                }}
              >
                <View className="ml-1 mb-2">
                  <Image
                    source={require("../../../assets/images/linkedin.png")}
                    className="w-8 h-8 ml-2 mr-3"
                  />
                </View>
              </LiquidGlassButton>
            </View>
            <View>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mb-3`}
              />
              <Text className={`${mutedTextClassName} text-sm mt-1`}>
                OCT ID: {details.id}
              </Text>
              {details.firstCertified ? (
                <Text className={`${mutedTextClassName} text-sm mt-1`}>
                  First certified: {formatTeacherDate(details.firstCertified)}
                </Text>
              ) : null}
              {details.applicationType ? (
                <Text className={`${mutedTextClassName} text-sm mt-1`}>
                  Application type: {details.applicationType}
                </Text>
              ) : null}
              <Text
                className={`text-sm font-semibold mt-2 ${
                  details.status.toLowerCase().includes("good standing")
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {details.status || "Status unavailable"}
              </Text>
              <View
                className={`${isDark ? "bg-dark4" : "bg-light4"} h-px mt-4`}
              />
              {renderQualificationSection(
                "Education",
                "Degree and credential records held by this teacher.",
                details.degrees,
              )}
              {renderQualificationSection(
                "Teaching Qualifications",
                "Teaching subjects this teacher is qualified to instruct.",
                details.teaching,
              )}
              {renderQualificationSection(
                "Additional Qualifications",
                "Extra specialist, subject, or professional qualifications completed after certification.",
                details.additional,
              )}
            </View>
            <Text className={`${mutedTextClassName} text-center mt-7 text-sm`}>
              Use this information responsibly!
            </Text>
          </View>
        ) : (
          <Text className={`${mutedTextClassName} text-center mt-8`}>
            No teacher details were available.
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

export default TeacherDetailsPage;
