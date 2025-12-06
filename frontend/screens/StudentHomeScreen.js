import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

const StudentHomeScreen = ({ navigation }) => {
    const { userInfo } = useContext(AuthContext);
    const [periods, setPeriods] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await client.get('/attendance/dashboard');
            setPeriods(res.data);
        } catch (error) {
            console.log('Error fetching dashboard');
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    const handleMarkAttendance = (sessionId) => {
        navigation.navigate('StudentAttendance', { sessionId });
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View>
                <Text style={styles.subject}>{item.subject}</Text>
                <Text>{item.startTime} - {item.endTime}</Text>
                <Text style={[styles.status,
                item.status === 'present' ? styles.present :
                    item.status === 'ongoing' ? styles.ongoing : styles.upcoming
                ]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            {item.status === 'ongoing' && (
                <Button title="Mark" onPress={() => handleMarkAttendance(item.sessionId)} />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hi, {userInfo.name}</Text>
            <Text style={styles.subtitle}>Roll: {userInfo.rollNumber}</Text>

            <Text style={styles.header}>Today's Classes</Text>
            <FlatList
                data={periods}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />


        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 16, marginBottom: 20, color: '#666' },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    card: { padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subject: { fontSize: 18, fontWeight: 'bold' },
    status: { marginTop: 5, fontWeight: 'bold' },
    present: { color: 'green' },
    ongoing: { color: 'blue' },
    upcoming: { color: 'gray' },
    logout: { marginTop: 10 }
});

export default StudentHomeScreen;
