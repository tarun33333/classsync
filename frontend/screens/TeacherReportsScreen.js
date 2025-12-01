import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import client from '../api/client';

const screenWidth = Dimensions.get('window').width;

const TeacherReportsScreen = () => {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await client.get('/attendance/reports');
            setReports(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    const chartData = {
        labels: reports.map(r => r.subject.substring(0, 3)), // Shorten subject name
        datasets: [
            {
                data: reports.map(r => r.presentCount)
            }
        ]
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Class Reports</Text>

            {reports.length > 0 ? (
                <>
                    <Text style={styles.subtitle}>Attendance Trend (Last 10 Sessions)</Text>
                    <BarChart
                        data={chartData}
                        width={screenWidth - 20}
                        height={220}
                        yAxisLabel=""
                        chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                    />

                    <Text style={styles.subtitle}>Session Details</Text>
                    {reports.map((item, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.cardTitle}>{item.subject} ({item.section})</Text>
                            <Text>Date: {new Date(item.date).toLocaleDateString()}</Text>
                            <View style={styles.statsRow}>
                                <Text style={styles.present}>Present: {item.presentCount}</Text>
                                <Text style={styles.absent}>Absent: {item.absentCount}</Text>
                            </View>
                        </View>
                    ))}
                </>
            ) : (
                <Text style={styles.noData}>No reports available.</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    noData: { textAlign: 'center', marginVertical: 20, color: '#888' },
    card: { padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    statsRow: { flexDirection: 'row', marginTop: 5 },
    present: { color: 'green', marginRight: 15, fontWeight: 'bold' },
    absent: { color: 'red', fontWeight: 'bold' }
});

export default TeacherReportsScreen;
