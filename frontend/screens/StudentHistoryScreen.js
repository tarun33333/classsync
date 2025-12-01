import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import client from '../api/client';

const screenWidth = Dimensions.get('window').width;

const StudentHistoryScreen = () => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [markedDates, setMarkedDates] = useState({});

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await client.get('/attendance/student');
            setHistory(res.data);

            const marks = {};
            res.data.forEach(item => {
                const date = item.createdAt.split('T')[0];
                marks[date] = {
                    selected: true,
                    selectedColor: item.status === 'present' ? 'green' : 'red'
                };
            });
            setMarkedDates(marks);
        } catch (error) {
            console.log(error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await client.get('/attendance/stats');
            // Transform for PieChart
            const chartData = res.data.map((item, index) => ({
                name: item._id,
                population: item.presentCount,
                color: getRandomColor(index),
                legendFontColor: '#7F7F7F',
                legendFontSize: 15
            }));
            setStats(chartData);
        } catch (error) {
            console.log(error);
        }
    };

    const getRandomColor = (index) => {
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
        return colors[index % colors.length];
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Attendance History</Text>

            <Calendar
                markedDates={markedDates}
                theme={{
                    selectedDayBackgroundColor: 'green',
                    todayTextColor: 'blue',
                }}
            />

            <Text style={styles.subtitle}>Subject-wise Attendance</Text>
            {stats.length > 0 ? (
                <PieChart
                    data={stats}
                    width={screenWidth}
                    height={220}
                    chartConfig={{
                        backgroundColor: '#1cc910',
                        backgroundGradientFrom: '#eff3ff',
                        backgroundGradientTo: '#efefef',
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                />
            ) : (
                <Text style={styles.noData}>No stats available yet.</Text>
            )}

            <Text style={styles.subtitle}>Recent Logs</Text>
            {history.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.logItem}>
                    <Text style={styles.logSubject}>{item.session.subject}</Text>
                    <Text style={item.status === 'present' ? styles.present : styles.absent}>
                        {item.status.toUpperCase()}
                    </Text>
                    <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    subtitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    noData: { textAlign: 'center', marginVertical: 20, color: '#888' },
    logItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    logSubject: { fontWeight: 'bold' },
    present: { color: 'green', fontWeight: 'bold' },
    absent: { color: 'red', fontWeight: 'bold' }
});

export default StudentHistoryScreen;
