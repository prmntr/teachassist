import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import Text from "@/components/ui/AppText";
import AppTextInput from "@/components/ui/AppTextInput";
import BackButton from "@/components/ui/Back";
import PageBackground from "@/components/ui/PageBackground";

const sanitizeNumericInput = (value: string) =>
  value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

const parseMark = (value: string): number | null => {
  const sanitized = sanitizeNumericInput(value);
  if (!sanitized) return null;
  const parsed = Number.parseFloat(sanitized);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatMark = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(1);
};

const calculateFinalMark = (
  current: number,
  weight: number,
  exam: number,
): number => (current * (100 - weight) + exam * weight) / 100;

const calculateExamMark = (
  current: number,
  weight: number,
  final: number,
): number => (final * 100 - current * (100 - weight)) / weight;

const ExamCalc = () => {
  const { isDark } = useTheme();
  const [currentMark, setCurrentMark] = useState("");
  const [examWeight, setExamWeight] = useState("");
  const [finalMark, setFinalMark] = useState("");
  const [examMark, setExamMark] = useState("");
  const [lastEdited, setLastEdited] = useState<"final" | "exam" | null>(null);

  useEffect(() => {
    if (!lastEdited) return;

    const current = parseMark(currentMark);
    const weight = parseMark(examWeight);

    if (current === null || weight === null) {
      if (lastEdited === "final" && examMark) setExamMark("");
      if (lastEdited === "exam" && finalMark) setFinalMark("");
      return;
    }

    if (lastEdited === "final") {
      const final = parseMark(finalMark);
      if (final === null || weight <= 0) {
        if (examMark) setExamMark("");
        return;
      }
      const exam = calculateExamMark(current, weight, final);
      const nextExam = formatMark(exam);
      if (nextExam !== examMark) setExamMark(nextExam);
      return;
    }

    const exam = parseMark(examMark);
    if (exam === null) {
      if (finalMark) setFinalMark("");
      return;
    }
    if (weight <= 0) {
      const nextFinal = formatMark(current);
      if (nextFinal !== finalMark) setFinalMark(nextFinal);
      return;
    }
    const final = calculateFinalMark(current, weight, exam);
    const nextFinal = formatMark(final);
    if (nextFinal !== finalMark) setFinalMark(nextFinal);
  }, [currentMark, examWeight, finalMark, examMark, lastEdited]);

  const inputClassName = `${
    isDark ? "bg-dark4 text-appwhite" : "bg-light4 text-appblack"
  } rounded-xl px-3 py-3`;
  const labelClassName = `${
    isDark ? "text-appgraylight" : "text-appgraydark"
  } text-sm font-medium`;
  const helperClassName = `${
    isDark ? "text-appgraylight/70" : "text-appgraydark/70"
  } text-xs`;

  return (
    <View className={`flex-1 ${isDark ? "bg-dark1" : "bg-light1"}`}>
      <PageBackground />
      <BackButton path="/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ paddingTop: 118, paddingBottom: 40 }}
      >
        <Text
          className={`text-4xl font-semibold ${isDark ? "text-appwhite" : "text-appblack"}`}
        >
          Exam Calculator
        </Text>
        <Text
          className={`mt-1 text-base leading-6 ${isDark ? "text-appgraylight" : "text-appgraydark"}`}
        >
          Enter your current mark and exam weight, then fill in either final or
          exam mark to calculate the latter.
        </Text>
        <View
          className={`${isDark ? "bg-dark3" : "bg-light3"} rounded-2xl p-5  mt-7`}
        >
          <View className="mb-5">
            <View className="flex-row items-center mb-2">
              <Text className={labelClassName}>Current Course Mark</Text>
              <Text className="text-danger ml-1">*</Text>
            </View>
            <AppTextInput
              className={inputClassName}
              value={currentMark}
              onChangeText={(value) =>
                setCurrentMark(sanitizeNumericInput(value))
              }
              placeholder="e.g. 87.5"
              placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          <View className="mb-5">
            <View className="flex-row items-center mb-2">
              <Text className={labelClassName}>Exam Weight (%)</Text>
              <Text className="text-danger ml-1">*</Text>
            </View>
            <AppTextInput
              className={inputClassName}
              value={examWeight}
              onChangeText={(value) =>
                setExamWeight(sanitizeNumericInput(value))
              }
              placeholder="e.g. 30"
              placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text className={`mt-2 ${helperClassName}`}>
              Ex: 20 means your exam is worth 20% of your final grade.
            </Text>
          </View>

          <View className="mb-5">
            <Text className={`${labelClassName} mb-2`}>Final Mark</Text>
            <AppTextInput
              className={inputClassName}
              value={finalMark}
              onChangeText={(value) => {
                setFinalMark(sanitizeNumericInput(value));
                setLastEdited("final");
              }}
              placeholder="Leave blank to calculate"
              placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          <View>
            <Text className={`${labelClassName} mb-2`}>Exam Mark</Text>
            <AppTextInput
              className={inputClassName}
              value={examMark}
              onChangeText={(value) => {
                setExamMark(sanitizeNumericInput(value));
                setLastEdited("exam");
              }}
              placeholder="Leave blank to calculate"
              placeholderTextColor={isDark ? "#85868e" : "#6d6e77"}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ExamCalc;
