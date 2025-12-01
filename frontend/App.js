import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import TeacherHomeScreen from './screens/TeacherHomeScreen';
import TeacherSessionScreen from './screens/TeacherSessionScreen';
import StudentHomeScreen from './screens/StudentHomeScreen';
import StudentAttendanceScreen from './screens/StudentAttendanceScreen';
import StudentHistoryScreen from './screens/StudentHistoryScreen';
import TeacherReportsScreen from './screens/TeacherReportsScreen';

const Stack = createStackNavigator();

const AppNav = () => {
  const { userToken, userRole, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userToken === null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : userRole === 'teacher' ? (
          <>
            <Stack.Screen name="TeacherHome" component={TeacherHomeScreen} />
            <Stack.Screen name="TeacherSession" component={TeacherSessionScreen} />
            <Stack.Screen name="TeacherReports" component={TeacherReportsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
            <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
            <Stack.Screen name="StudentHistory" component={StudentHistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNav />
    </AuthProvider>
  );
}
