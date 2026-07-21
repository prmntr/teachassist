import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  LayoutChangeEvent,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { AppAlert, AlertIcon } from "@/components/ui/AppAlert";
import { SecureStorage } from "../(auth)/taauth";
import { hapticsImpact } from "@/utils/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import BackButton from "@/components/ui/Back";
import PageBackground from "@/components/ui/PageBackground";

// Icon images
const uploadIcon = require("../../assets/images/pencil.png");
const removeIcon = require("../../assets/images/trash-bin.png");

const STUDENT_ID_IMAGE_KEY = "student_id_virtual_image";

const StudentIDScreen = () => {
  const { isDark } = useTheme();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [studentIdImage, setStudentIdImage] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState({ width: 0, height: 0 });
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    const loadStudentCard = async () => {
      const [storedName, storedSchool, storedImage] = await Promise.all([
        SecureStorage.load("ta_username"),
        SecureStorage.load("school_name"),
        SecureStorage.load(STUDENT_ID_IMAGE_KEY),
      ]);

      setStudentName(storedName);
      setSchoolName(storedSchool);
      setStudentIdImage(storedImage);
    };

    loadStudentCard();
  }, []);

  const pickStudentIdImage = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 2],
      quality: 1,
    });

    if (result.canceled) return;

    const imageUri = result.assets[0]?.uri;
    if (!imageUri) {
      AppAlert.alert(
        "Unable to load image",
        "Try choosing a different photo.",
        { icon: AlertIcon.error },
      );
      return;
    }

    setStudentIdImage(imageUri);
    await SecureStorage.save(STUDENT_ID_IMAGE_KEY, imageUri);
  };

  const removeStudentIdImage = async () => {
    await hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    AppAlert.alert(
      "Remove Student ID",
      "Are you sure you want to delete your student ID?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setStudentIdImage(null);
            await SecureStorage.delete(STUDENT_ID_IMAGE_KEY);
          },
        },
      ],
      { icon: AlertIcon.delete },
    );
  };

  const cardImageSource = studentIdImage
    ? { uri: studentIdImage }
    : require("../../assets/images/mockid.png");
  const displayedAspectRatio = isLandscape ? 3 / 2 : 2 / 3;
  const availableWidth = Math.max(previewFrame.width - 24, 0);
  const availableHeight = Math.max(previewFrame.height - 24, 0);
  const cardWidth =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth, availableHeight * displayedAspectRatio)
      : 0;
  const cardHeight = cardWidth > 0 ? cardWidth / displayedAspectRatio : 0;
  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } =
      event.nativeEvent.layout;
    setPreviewFrame((current) =>
      current.width === layoutWidth && current.height === layoutHeight
        ? current
        : { width: layoutWidth, height: layoutHeight },
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <View className="flex-1 px-5 pt-[118px] pb-10">
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Virtual Student ID
        </Text>

        <View style={{ flex: 1, minHeight: 0 }} className="mt-3">
          <ImageBackground
            source={require("../../assets/images/striped_bg.png")}
            imageStyle={{ borderRadius: 24 }}
            className={`${isDark ? "bg-dark3" : "bg-light3"} flex-1 rounded-3xl overflow-hidden p-0 justify-start`}
            style={{ flex: 1, minHeight: 0, padding: 0 }}
          >
            <View style={{ flex: 1, minHeight: 0 }} className="flex-1">
              <View className="w-full pt-5 px-6">
                <Text
                  className={`text-2xl font-bold ${isDark ? "text-appwhite" : "text-appblack"}`}
                >
                  {studentName ?? "Student"}
                  <Text
                    className={`${isDark ? "text-appgraydark" : "text-appgraydark"}`}
                  >{` | `}</Text>
                  <Text className={`mt-1 text-sm text-baccent`}>
                    {schoolName ?? "School"}
                  </Text>
                </Text>
              </View>
              <View
                className="flex-1 items-center justify-center w-full"
                style={{ flex: 1, minHeight: 0 }}
                onLayout={handlePreviewLayout}
              >
                <View
                  style={{
                    width: cardWidth || "100%",
                    height: cardHeight || "100%",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      borderRadius: 12,
                    }}
                  >
                    <Image
                      source={cardImageSource}
                      resizeMode="contain"
                      style={{
                        width: isLandscape ? "100%" : cardHeight || "100%",
                        height: isLandscape ? "100%" : cardWidth || "100%",
                        transform: isLandscape
                          ? [{ rotate: "0deg" }]
                          : [{ rotate: "90deg" }],
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} mt-4 rounded-2xl py-3  flex-row items-center justify-center gap-6 px-10`}
        >
          <TouchableOpacity
            className={`rounded-xl bg-baccent/60 p-3 flex-row items-center justify-center gap-2 ${studentIdImage ? "w-1/2" : "w-full"}`}
            onPress={pickStudentIdImage}
          >
            <Image
              className="w-5 h-5"
              style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
              source={uploadIcon}
            />
            <Text
              className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-md`}
            >
              {studentIdImage ? "Replace" : "Upload"}
            </Text>
          </TouchableOpacity>
          {studentIdImage ? (
            <TouchableOpacity
              className={`rounded-xl bg-danger/70 p-3 flex-row items-center justify-center gap-2 ${studentIdImage ? "w-1/2" : "w-full"}`}
              onPress={removeStudentIdImage}
            >
              <Image
                className="w-5 h-5"
                style={{ tintColor: isDark ? "#edebea" : "#2f3035" }}
                source={removeIcon}
              />
              <Text
                className={`${isDark ? "text-appwhite" : "text-appblack"} font-semibold text-md`}
              >
                Remove
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default StudentIDScreen;
