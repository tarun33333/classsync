import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert, Modal } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import client from '../api/client';
import * as Network from 'expo-network';

const StudentAttendanceScreen = ({ route, navigation }) => {
    const { sessionId } = route.params;
    const [step, setStep] = useState(1); // 1: WiFi, 2: OTP/QR
    const [otp, setOtp] = useState('');
    const [scanning, setScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const verifyWifi = async () => {
        try {
            // Simulate getting BSSID. In Expo Go, this returns null or IP.
            // We'll send "DEBUG_BSSID" to match the backend bypass for now.
            // In production, use a native module or config plugin.
            const bssid = 'DEBUG_BSSID';

            await client.post('/attendance/verify-wifi', { sessionId, bssid });
            setStep(2);
        } catch (error) {
            Alert.alert('WiFi Verification Failed', error.response?.data?.message || 'Error');
        }
    };

    const submitOtp = async () => {
        try {
            await client.post('/attendance/mark', { sessionId, code: otp, method: 'otp' });
            Alert.alert('Success', 'Attendance Marked via OTP!');
            navigation.navigate('StudentHome');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);
        setScanning(false);
        try {
            await client.post('/attendance/mark', { sessionId, code: data, method: 'qr' });
            Alert.alert('Success', 'Attendance Marked via QR!');
            navigation.navigate('StudentHome');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Invalid QR');
            setScanned(false);
        }
    };

    if (scanning) {
        if (hasPermission === null) {
            return <Text>Requesting for camera permission</Text>;
        }
        if (hasPermission === false) {
            return <Text>No access to camera</Text>;
        }

        return (
            <View style={styles.container}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "pdf417"],
                    }}
                    style={StyleSheet.absoluteFillObject}
                />
                <Button title="Cancel Scan" onPress={() => setScanning(false)} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mark Attendance</Text>

            {step === 1 && (
                <View>
                    <Text style={styles.instruction}>Step 1: Verify WiFi Connection</Text>
                    <Text>Please connect to the classroom WiFi.</Text>
                    <Button title="Verify WiFi" onPress={verifyWifi} />
                </View>
            )}

            {step === 2 && (
                <View>
                    <Text style={styles.instruction}>Step 2: Verify Identity</Text>

                    <Text style={styles.label}>Option A: Enter OTP</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 4-digit OTP"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="numeric"
                        maxLength={4}
                    />
                    <Button title="Submit OTP" onPress={submitOtp} />

                    <Text style={styles.or}>OR</Text>

                    <Text style={styles.label}>Option B: Scan QR Code</Text>
                    <Button title="Scan QR Code" onPress={() => { setScanned(false); setScanning(true); }} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    instruction: { fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
    label: { fontSize: 16, marginTop: 20, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
    or: { textAlign: 'center', marginVertical: 20, fontWeight: 'bold' }
});

export default StudentAttendanceScreen;
