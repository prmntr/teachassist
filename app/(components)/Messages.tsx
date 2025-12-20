import { useEffect, useState } from "react";
import { Text } from "react-native";
import { SecureStorage } from "../(auth)/taauth";

// i got bored

function Messages() {
  const [userName, setUserName] = useState<string | null>(null);
  const [message1, setMessage1] = useState<string>("");
  const [message2, setMessage2] = useState<string>("");

  const getUserName = async () => {
    let userName = await SecureStorage.load("ta_username");
    setUserName(userName);
    return userName;
  };

  let preMessage = [
    "Hey, ",
    "Hello, ",
    "Hi ",
    "What's up, ",
    "How's it going, ",
    "Greetings, ",
    "Good to see you, ",
    "Welcome back, ",
  ];

  let postMessage = ["!", "!", "!", "?", "?", ".", ".", "."];

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
    (now >= start && now <= new Date(year, 11, 31, 23, 59, 59, 999)) ||
    (now.getMonth() === 0 && now <= end)
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

    const num = Math.floor(Math.random() * preMessage.length);
    const randomMessage1 = preMessage[num];
    const randomMessage2 = postMessage[num];
    setMessage1(randomMessage1);
    setMessage2(randomMessage2);
  }, []);

  // slow phone
  if (!userName) {
    return <Text>Loading...</Text>;
  }

  return (
    <Text>
      {message1}
      <Text className={`text-baccent font-semibold`}>{userName}</Text>
      {message2}
    </Text>
  );
}

export default Messages;
