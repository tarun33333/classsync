import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import * as Network from 'expo-network';

const TeacherHomeScreen = ({ navigation }) => {
    const { userInfo, logout } = useContext(AuthContext);
    const [routines, setRoutines] = useState([]);
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        fetchRoutines();
        checkActiveSession();
    }, []);

    const fetchRoutines = async () => {
        try {
            const res = await client.get('/routines/teacher');
            setRoutines(res.data);
        } catch (error) {
            console.log('Error fetching routines');
        }
    };

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

    const startSession = async (routine) => {
        try {
            const { isConnected } = await Network.getNetworkStateAsync();
            if (!isConnected) {
                Alert.alert('Error', 'No internet connection');
                return;
            }

            const sessionData = {
                subject: routine.subject,
                section: routine.section,
                bssid: 'DEBUG_BSSID',
                ssid: 'ClassWiFi'
            };

            const res = await client.post('/sessions/start', sessionData);
            navigation.navigate('TeacherSession', { session: res.data });
        } catch (error) {
            Alert.alert('Error', 'Failed to start session');
        }
    };

    const renderRoutine = ({ item }) => (
        <View style={styles.card}>
            <View>
                <Text style={styles.subject}>{item.subject}</Text>
                <Text style={styles.details}>{item.section} | {item.day} | {item.startTime} - {item.endTime}</Text>
            </View>
            <Button title="Start" onPress={() => startSession(item)} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome, {userInfo.name}</Text>
            <Text style={styles.subtitle}>Your Schedule</Text>

            <FlatList
                data={routines}
                keyExtractor={(item) => item._id}
                renderItem={renderRoutine}
                ListEmptyComponent={<Text style={styles.noData}>No classes assigned.</Text>}
            />

            <View style={styles.logout}>
                <Button title="Logout" onPress={logout} color="red" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 18, marginBottom: 20, color: '#666' },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, elevation: 2 },
    subject: { fontSize: 18, fontWeight: 'bold' },
    details: { color: '#555' },
    noData: { textAlign: 'center', marginTop: 20, color: '#888' },
    logout: { marginTop: 20 }
});

export default TeacherHomeScreen;
