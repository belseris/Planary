import React from "react";
import { TextInput, View, Text } from "react-native";

export default function TextInputField({ label, value, onChangeText, secureTextEntry, keyboardType }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }}
      />
    </View>
  );
}
