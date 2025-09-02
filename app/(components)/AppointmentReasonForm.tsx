import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FormOption {
  id: string;
  value: string;
  label: string;
  type: "radio" | "checkbox";
}

interface AppointmentReasonFormProps {
  html: string;
  onSubmit: (formData: FormSubmissionData) => void;
  onCancel: () => void;
}

interface FormSubmissionData {
  reason?: string;
  withParent?: boolean;
  online?: boolean;
  hiddenFields: Record<string, string>;
}

// some schools want their kids to give reasons for appts

const AppointmentReasonForm: React.FC<AppointmentReasonFormProps> = ({
  html,
  onSubmit,
  onCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [withParent, setWithParent] = useState<boolean>(false);
  const [online, setOnline] = useState<boolean>(false);
  const [formOptions, setFormOptions] = useState<FormOption[]>([]);
  const [hiddenFields, setHiddenFields] = useState<Record<string, string>>({});

  useEffect(() => {
    parseForm();
  }, [html]);

  const parseForm = () => {
    // Extract 'hidden' fields
    const hiddenInputRegex = /<input[^>]+type="hidden"[^>]*>/g;
    const hiddenMatches = html.match(hiddenInputRegex) || [];
    const hiddenData: Record<string, string> = {};

    hiddenMatches.forEach((input) => {
      const nameMatch = input.match(/name="([^"]+)"/);
      const valueMatch = input.match(/value="([^"]*)"/);
      if (nameMatch && valueMatch) {
        hiddenData[nameMatch[1]] = valueMatch[1];
      }
    });

    // Extract radio button options for reasons
    const radioInputRegex = /<input[^>]+type="radio"[^>]+name="reason"[^>]*>/g;
    const labelRegex = /<label[^>]*for="([^"]+)"[^>]*>(.*?)<\/label>/g;
    const options: FormOption[] = [];

    // get all their labels based on their for attributes
    const labelMap: Record<string, string> = {};
    let labelMatch;
    while ((labelMatch = labelRegex.exec(html)) !== null) {
      labelMap[labelMatch[1]] = labelMatch[2].trim();
    }

    let radioMatch;
    while ((radioMatch = radioInputRegex.exec(html)) !== null) {
      const input = radioMatch[0];

      const idMatch = input.match(/id="([^"]+)"/);
      const valueMatch = input.match(/value="([^"]+)"/);

      if (idMatch && valueMatch) {
        const label = labelMap[idMatch[1]] || `Option ${valueMatch[1]}`;

        options.push({
          id: idMatch[1],
          value: valueMatch[1],
          label: label,
          type: "radio",
        });
      }
    }

    setFormOptions(options);
    setHiddenFields(hiddenData);
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for your appointment.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const formData: FormSubmissionData = {
      reason: selectedReason,
      withParent,
      online,
      hiddenFields,
    };

    onSubmit(formData);
  };

  const handleReasonSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(value);
  };

  const handleCheckboxToggle = (type: "withParent" | "online") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "withParent") {
      setWithParent(!withParent);
    } else {
      setOnline(!online);
    }
  };

  return (
    <ScrollView
      className="bg-3 rounded-xl p-6 mb-4 shadow-lg w-full"
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6">
        <Text className="text-2xl text-baccent font-semibold mb-3 text-center">
          Appointment Details
        </Text>
        <Text className="text-appwhite/70 text-center mb-6">
          Please select a reason for your guidance appointment:
        </Text>

        {/* choose a reason */}
        <View className="mb-6">
          {formOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleReasonSelect(option.value)}
              className={`mb-3 p-4 rounded-lg border ${
                selectedReason === option.value
                  ? "bg-baccent/20 border-baccent/60"
                  : "bg-gray-500/10 border-gray-500/30"
              }`}
            >
              <View className="flex-row items-center">
                <View
                  className={`w-5 h-5 rounded-full border-2 mr-3 ${
                    selectedReason === option.value
                      ? "border-baccent bg-baccent"
                      : "border-appgray"
                  }`}
                >
                  {selectedReason === option.value && (
                    <View className="w-full h-full rounded-full bg-baccent" />
                  )}
                </View>
                <Text
                  className={`flex-1 ${
                    selectedReason === option.value
                      ? "text-baccent"
                      : "text-appwhite"
                  }`}
                >
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* booking for online doesnt do anything so removed for now */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => handleCheckboxToggle("withParent")}
            className="mb-3 p-4 rounded-lg border border-gray-500/30 bg-gray-500/10"
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded border-2 mr-3 ${
                  withParent
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-gray-400"
                }`}
              >
                {withParent && (
                  <Text className="text-white text-xs text-center font-bold">
                    ✓
                  </Text>
                )}
              </View>
              <Text
                className={
                  withParent ? "text-emerald-400 mr-10" : "text-appwhite mr-10"
                }
              >
                Check this box if your parent will be a part of the meeting
              </Text>
            </View>
          </TouchableOpacity>
          {/* 
          <TouchableOpacity
            onPress={() => handleCheckboxToggle("online")}
            className="mb-3 p-4 rounded-lg border border-gray-500/30 bg-gray-500/10"
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded border-2 mr-3 ${
                  online ? "border-purple-400 bg-purple-400" : "border-gray-400"
                }`}
              >
                {online && (
                  <Text className="text-white text-xs text-center font-bold">
                    ✓
                  </Text>
                )}
              </View>
              <Text className={online ? "text-purple-400" : "text-appwhite"}>
                Request Online Video meeting
              </Text>
            </View>
          </TouchableOpacity>
          */}
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 bg-red-500/20 border-red-500/30 border px-4 py-3 rounded-lg"
          >
            <Text className="text-red-400 font-medium text-center text-lg">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            className={`flex-1 px-4 py-3 rounded-lg border ${
              selectedReason
                ? "bg-emerald-500/20 border-emerald-500/30"
                : "bg-gray-500/20 border-gray-500/30"
            }`}
            disabled={!selectedReason}
          >
            <Text
              className={`font-medium text-center text-lg ${
                selectedReason ? "text-emerald-400" : "text-gray-400"
              }`}
            >
              Submit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AppointmentReasonForm;
