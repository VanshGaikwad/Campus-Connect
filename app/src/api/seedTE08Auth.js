const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const DEPT = "ENTC";
const YEAR = "TE";
const DIV = "08";

async function seedStudentsWithAuth() {
    const students = [];

    // Use the exact filename from your folder
    fs.createReadStream('te08_students.csv')
        .pipe(csv())
        .on('data', (data) => students.push(data))
        .on('end', async () => {
            console.log(`Starting Auth and Firestore sync for ${students.length} students...`);

            const divisionRef = db
                .collection('departments').doc(DEPT)
                .collection('years').doc(YEAR)
                .collection('divisions').doc(DIV);

            for (const student of students) {
                const studentCode = student['Student Code'].trim();
                const email = student['Mail'].trim();
                const password = student['passwords']?.trim() || studentCode;
                const batchName = student['Batch'].trim();

                try {
                    // 1. Create User in Firebase Authentication
                    // We set the uid to studentCode so Auth and Firestore IDs match exactly
                    const userRecord = await auth.createUser({
                        uid: studentCode,
                        email: email,
                        password: password,
                        displayName: student['Name'],
                    });

                    console.log(`Successfully created Auth user: ${userRecord.uid}`);

                    // 2. Create User Document in Firestore
                    await divisionRef.collection('students').doc(studentCode).set({
                        name: student['Name'],
                        email: email,
                        batch: batchName,
                        role: "student",
                        subscribedTopics: [
                            `${DEPT}_All`,
                            `${DEPT}_${YEAR}_${DIV}_All`,
                            `${DEPT}_${YEAR}_${DIV}_${batchName}`
                        ]
                    });

                } catch (error) {
                    if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                        console.log(`Skipping: ${studentCode} already exists in Auth.`);
                    } else {
                        console.error(`Error for ${studentCode}:`, error.message);
                    }
                }
            }
            console.log('✅ Auth and Firestore Seeding Complete.');
            process.exit();
        });
}

seedStudentsWithAuth();