import React from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

const statusTone = {
  today: {
    card: 'border-blue-400 bg-blue-50',
    chip: 'bg-blue-100 text-blue-700',
  },
  upcoming: {
    card: 'border-emerald-300 bg-emerald-50',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  visited: {
    card: 'border-slate-300 bg-white',
    chip: 'bg-slate-100 text-slate-700',
  },
};

function formatReportingTime(timestamp) {
  if (!timestamp) return 'TBA';

  if (typeof timestamp?.toDate === 'function') {
    return timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'TBA';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function openRegistrationUrl(url) {
  if (!url) {
    Alert.alert('Registration unavailable', 'Registration link is not available yet.');
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Invalid link', 'Could not open registration link.');
    return;
  }

  await Linking.openURL(url);
}

export default function CompanyCard({ drive, segment }) {
  const tone = statusTone[segment] || statusTone.visited;
  const companyName = drive?.companyName || 'Unknown Company';
  const lpa = drive?.lpa || 'N/A';
  const criteria = drive?.criteria || 'Criteria will be updated soon.';

  const registerUrl =
    drive?.registerUrl || drive?.registrationUrl || drive?.url || drive?.applyUrl || '';

  const placedCount =
    drive?.totalStudentsPlaced ?? drive?.placedCount ?? drive?.studentsPlaced ?? 'N/A';

  return (
    <View className={`mb-4 rounded-2xl border p-4 shadow-sm ${tone.card}`}>
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-bold text-slate-900">{companyName}</Text>
          <Text className="mt-1 text-sm font-semibold text-slate-600">CTC: {lpa} LPA</Text>
        </View>
        <Text className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${tone.chip}`}>
          {segment}
        </Text>
      </View>

      <View className="mt-3 rounded-xl bg-white/80 p-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligibility</Text>
        <Text className="mt-1 text-sm text-slate-700">{criteria}</Text>
      </View>

      {segment === 'today' ? (
        <View className="mt-3 rounded-xl bg-blue-100 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reporting Time</Text>
          <Text className="mt-1 text-base font-bold text-blue-900">{formatReportingTime(drive?.timestamp)}</Text>
        </View>
      ) : null}

      {segment === 'upcoming' ? (
        <Pressable
          onPress={() => openRegistrationUrl(registerUrl)}
          className="mt-3 items-center rounded-xl bg-emerald-600 px-4 py-3 active:bg-emerald-700"
        >
          <Text className="text-sm font-semibold text-white">Register</Text>
        </Pressable>
      ) : null}

      {segment === 'visited' ? (
        <View className="mt-3 rounded-xl bg-slate-100 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Students Placed</Text>
          <Text className="mt-1 text-base font-bold text-slate-900">{placedCount}</Text>
        </View>
      ) : null}
    </View>
  );
}
