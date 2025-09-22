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
    if (userName !== null && userName.includes("349300863")) {
      setUserName("Josh Zhou"); // you should question it josh
    } else {
      setUserName(userName);
    }
    return userName;
  };

  const preMessage = [
    "Hey, ",
    "Hello, ",
    "Hi ",
    "What's up, ",
    "How's it going, ",
    "Greetings, ",
    "Good to see you, ",
    "Welcome back, ",
  ];

  const postMessage = ["!", "!", "!", "?", "?", ".", ".", ""];

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
