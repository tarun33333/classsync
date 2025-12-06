import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import client from '../api/client';

const screenWidth = Dimensions.get('window').width;

const StudentSummaryScreen = () => {
    const [stats, setStats] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

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
            console.log('Error fetching stats', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    const getRandomColor = (index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return colors[index % colors.length];
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.title}>Attendance Summary</Text>

            <View style={styles.chartContainer}>
                <Text style={styles.subtitle}>Subject-wise Present Count</Text>
                {stats.length > 0 ? (
                    <PieChart
                        data={stats}
                        width={screenWidth - 40}
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
                    <Text style={styles.noData}>No attendance data available yet.</Text>
                )}
            </View>

            <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                    Total Classes Attended: {stats.reduce((acc, curr) => acc + curr.population, 0)}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#555' },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        elevation: 3,
        marginBottom: 20
    },
    noData: { textAlign: 'center', marginVertical: 20, color: '#888' },
    summaryBox: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        elevation: 2,
        alignItems: 'center'
    },
    summaryText: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' }
});

export default StudentSummaryScreen;
