import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import * as Network from 'expo-network';

const TeacherHomeScreen = ({ navigation }) => {
    const { userInfo, logout } = useContext(AuthContext);
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        checkActiveSession();
    }, []);

    const checkActiveSession = async () => {
        try {
            const res = await client.get('/sessions/active');
            if (res.data) {
                setActiveSession(res.data);
                navigation.navigate('TeacherSession', { session: res.data });
            }
        } catch (error) {
            console.log('No active session');
        }
    };

    const startSession = async () => {
        try {
            const { isConnected } = await Network.getNetworkStateAsync();
            if (!isConnected) {
                Alert.alert('Error', 'No internet connection');
                return;
            }

            const sessionData = {
                subject: 'Data Structures',
                section: 'A',
                bssid: 'DEBUG_BSSID',
                ssid: 'ClassWiFi'
            };

            const res = await client.post('/sessions/start', sessionData);
            navigation.navigate('TeacherSession', { session: res.data });
        } catch (error) {
            Alert.alert('Error', 'Failed to start session');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome, {userInfo.name}</Text>
            <Text style={styles.subtitle}>Department: {userInfo.department || 'CS'}</Text>

            <View style={styles.buttonContainer}>
                <Button title="Start Session (Data Structures)" onPress={startSession} />
                <View style={{ marginTop: 10 }}>
                    <Button title="View Reports" onPress={() => navigation.navigate('TeacherReports')} color="#6200ee" />
                </View>
            </View>

            <View style={styles.logout}>
                <Button title="Logout" onPress={logout} color="red" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 18, marginBottom: 30 },
    buttonContainer: { width: '100%', marginBottom: 20 },
    logout: { marginTop: 20 }
});

export default TeacherHomeScreen;
