import { View, } from "react-native";
import Text from "@/components/ui/AppText";
import { useTheme } from "@/contexts/ThemeContext";
import { type StudentGrade } from "./studentGrade";

type StudentGradeLetterProps = {
  grade: StudentGrade | null;
  className?: string;
};

export const StudentGradeLetter = ({
  grade,
  className,
}: StudentGradeLetterProps) => {
  const { isDark } = useTheme();
  return getStudentGradeLetter(grade, className, isDark);
};

export const getStudentGradeLetter = (
  grade: StudentGrade | null,
  className?: string,
  isDark?: boolean,
) => {
  if (grade === 9)
    return (
      <View>
        <Text
          className={`mt-2 text-3xl font-semibold text-center ${isDark ? "text-baccent" : "text-info"}`}
        >
          Dum spiro, spero.
        </Text>
        <Text
          className={`mt-0 text-lg ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
        >
          {`
Congrats! You finished grade 9. 
          
Was it good? Bad? Terrible? Terrific?
I hope you didn't say your answer out loud; I'm just a heartless piece of glass.

For real though, good job. Grade 9 is a LOT (don't let the seniors say otherwise), and you made it through! 

I know everyone always tells you "high school goes by fast" but it REALLY does. Trust me. Advice? Join some clubs, talk to people, ask stupid questions. You've got 3 years left - make 'em count.

Enjoy your summer!`}
        </Text>
        <Text
          className={`font-semibold text-2xl mt-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          teach<Text className="text-baccent font-semibold">a</Text>ssist
        </Text>
      </View>
    );
  if (grade === 10)
    return (
      <View>
        <Text
          className={`mt-2 text-3xl font-semibold text-center ${isDark ? "text-baccent" : "text-info"}`}
        >
          Per aspera ad astra.
        </Text>
        <Text
          className={`mt-0 text-lg ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
        >
          {`
Helloooo, sophomore!

You got through grade 10. Awesome!! A bit harder than expected, don't you think?

You're in an interesting spot now. You're no longer a freshman noob, but not *quite* into the grade 11 & 12 pressure cooker. Enjoy it. 

The skills and friendships you've developed will carry you further than you think.

Advice? Use this summer to explore your interests. Read a book, learn some stuff, whatever. Figure out what you like (and don't like). It'll come in handy.

Have a nice break :)`}
        </Text>
        <Text
          className={`font-semibold text-2xl mt-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          teach<Text className="text-baccent font-semibold">a</Text>ssist
        </Text>
      </View>
    );
  if (grade === 11)
    return (
      <View>
        <Text
          className={`mt-2 text-3xl font-semibold text-center ${isDark ? "text-baccent" : "text-info"}`}
        >
          Fortes fortuna adiuvat.
        </Text>
        <Text
          className={`mt-0 text-lg ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
        >
          {`
Grade. Eleven.

Y'know, when I was in elementary school, I thought grade 11s were these big, strong, domineering academic weapons. Oh, how wrong I was.

Things got a bit more serious this year. You made some tough choices about your life, and you probably have some doubt on where you're going next. That's good; it means you're thinking about things that matter.

Advice? Trust in yourself. Grade 12's the last year, so don't spend it just surviving. Go to the game. Stay for the conversation. Tell your friends what they mean to you. 

The fasten seatbelt sign's on. Buckle up.`}
        </Text>
        <Text
          className={`font-semibold text-2xl mt-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          teach<Text className="text-baccent font-semibold">a</Text>ssist
        </Text>
      </View>
    );
  if (grade === 12)
    return (
      <View>
        <Text
          className={`mt-2 text-3xl font-semibold text-center ${isDark ? "text-baccent" : "text-info"}`}
        >
          Veni, Vidi, Vici.
        </Text>
        <Text
          className={`mt-0 text-lg ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
        >
          {`
Do you remember your first day? 

Excited, nervous, terrified, somewhere in between?

Now look at you. You have grown in ways that are hard to put into words - more confident, more capable, more *you*. Wherever you're going in life, godspeed.

As for advice?`}
        </Text>
        <View
          className={`${isDark ? "bg-dark4" : "bg-light4"} rounded-xl p-4 mt-3`}
        >
          <Text
            className={`text-sm ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
          >
            {`Your time is limited. So don't waste it living someone else's life. 
            
Don't be trapped by dogma, which is living with the results of other people's thinking. Don't let the noise of others opinions drown out your own inner voice. 
            
And most important, have the courage to follow your heart and intuition. They somehow already know what you truly want to become. 
            
Everything else is secondary.`}
          </Text>
          <Text
            className={`mt-4 font-bold text-sm text-baccent`}
          >
            - Steve Jobs
          </Text>
        </View>
        <Text
          className={`mt-4 italic text-lg ${isDark ? "text-appwhite" : "text-appblack"} leading-7`}
        >
          en garde!
        </Text>
        <Text
          className={`font-semibold text-2xl mt-4 ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          teach<Text className="text-baccent font-semibold">a</Text>ssist
        </Text>
        <Text
          className={`mt-4 text-sm ${isDark ? "text-appgraylight" : "text-appgraydark"} leading-7`}
        >
          p.s before you uninstall this app, leave a review? ok thx bye
        </Text>
      </View>
    );
  return <Text className={className}>No year-level letter available yet.</Text>;
};
