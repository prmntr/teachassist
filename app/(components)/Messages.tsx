import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";
import { SecureStorage } from "../(auth)/taauth";
import { useTheme } from "../contexts/ThemeContext";
// i got bored

function Messages() {
  const { isDark } = useTheme();
  const [userName, setUserName] = useState<string | null>(null);
  const [message1, setMessage1] = useState<string>("");
  const [message2, setMessage2] = useState<string>("");
  const [messageMode, setMessageMode] = useState<
    "default" | "inspirational" | "off"
  >("default");

  const getUserName = async () => {
    let userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  let preMessage = [
    "Hey, ",
    "Hello, ",
    "Haii ",
    "What's up, ",
    "whats poppin ",
    "Greetings, ",
    "Good to see you, ",
    "Welcome back, ",
  ];

  let postMessage = ["!", "!", "!!!!", "?", "", ".", ".", "."];

  if (messageMode === "inspirational") {
    preMessage = [
      "Keep reaching higher",
      "Every effort counts",
      "You're making progress",
      "Stay focused",
      "You've got this",
      "Keep pushing forward",
      "Believe in yourself",
      "lock in",
    ];
    postMessage = ["!", "!", "!", ".", ".", ".", "!", ""];
  }

  // Christmas message logic
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 11, 20); // Dec 20
  const end = new Date(
    year + (now.getMonth() === 0 ? -1 : 0),
    0,
    5,
    23,
    59,
    59,
    999
  ); // Jan 5

  if (
    messageMode === "default" &&
    ((now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
      (now.getMonth() === 0 && now <= end))
  ) {
    preMessage = [
      "Happy Holidays, ",
      "Happy New Year, ",
      "",
      "Touch some snow, ",
      "What's jollying, ",
      "Merry Christmas, ",
    ];

    postMessage = [" ⭐", "🎉", " on the holiday grind...", " ❄️", "?", " 🎄"];
  }

  useEffect(() => {
    getUserName();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const storedMessageMode = await AsyncStorage.getItem("messages_mode");
        if (
          storedMessageMode === "default" ||
          storedMessageMode === "inspirational" ||
          storedMessageMode === "off"
        ) {
          setMessageMode(storedMessageMode);
        }
      };

      loadSettings();
    }, [])
  );

  useEffect(() => {
    const num = Math.floor(Math.random() * preMessage.length);
    const randomMessage1 = preMessage[num];
    const randomMessage2 = postMessage[num];
    setMessage1(randomMessage1);
    setMessage2(randomMessage2);
  }, [messageMode]);

  // slow phone
  if (messageMode === "off") {
    return null;
  }

  if (!userName && messageMode !== "inspirational") {
    return <Text>Loading...</Text>;
  }

  return (
    <Text
      className={`text-lg mt-1 px-5 ${isDark ? "text-appwhite" : "text-appblack"}`}
    >
      {message1}
      {messageMode === "default" && (
        <Text className={`text-baccent font-semibold`}>{userName}</Text>
      )}
      {message2}
    </Text>
  );
}

export default Messages;
