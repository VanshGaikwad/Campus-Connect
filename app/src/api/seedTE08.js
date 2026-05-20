const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// 1. Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Constants
const DEPT = "ENTC";
const YEAR = "TE";
const DIV = "08";

// 2. Corrected Timetable Data from your Image
const timetableData = {
    monday: [
        { type: "practical", sub: "MP1", time: "10:30 - 12:30", room: "A3-104", batch: "K8" },

        { type: "lecture", sub: "CN", time: "01:15 - 02:15", room: "A3-208", batch: "all" },
        { type: "lecture", sub: "PM", time: "02:15 - 03:15", room: "A3-208", batch: "all" },

        { type: "practical", sub: "CN", time: "03:30 - 05:30", batch: "K8" },
        { type: "practical", sub: "PDC", time: "03:30 - 05:30", batch: "L8" },
        { type: "practical", sub: "MP2", time: "03:30 - 05:30", batch: "M8" },
        { type: "practical", sub: "Ele2_NS", time: "03:30 - 05:30", batch: "N8" }
    ],

    tuesday: [
        { type: "lecture", sub: "PDC", time: "01:15 - 02:15", room: "A3-208", batch: "all" },
        { type: "lecture", sub: "Ele2_NS", time: "02:15 - 03:15", room: "A3-208", batch: "all" },

        { type: "practical", sub: "PDC", time: "03:30 - 05:30", batch: "K8" },
        { type: "practical", sub: "MP2", time: "03:30 - 05:30", batch: "L8" },
        { type: "practical", sub: "Ele2_NS", time: "03:30 - 05:30", batch: "M8" },
        { type: "practical", sub: "MP1", time: "03:30 - 05:30", batch: "N8" }
    ],

    wednesday: [
        { type: "lecture", sub: "CN", time: "10:30 - 11:30", room: "A3-107", batch: "all" },
        { type: "lecture", sub: "PM", time: "11:30 - 12:30", room: "A3-107", batch: "all" },

        { type: "lecture", sub: "Ele2_NS", time: "01:15 - 02:15", room: "A3-208", batch: "all" },
        { type: "lecture", sub: "PDC", time: "02:15 - 03:15", room: "A3-208", batch: "all" },

        { type: "practical", sub: "MP2", time: "03:30 - 05:30", batch: "K8" },
        { type: "practical", sub: "Ele2_NS", time: "03:30 - 05:30", batch: "L8" },
        { type: "practical", sub: "MP1", time: "03:30 - 05:30", batch: "M8" },
        { type: "practical", sub: "CN", time: "03:30 - 05:30", batch: "N8" }
    ],

    thursday: [
        { type: "lecture", sub: "PM", time: "01:15 - 02:15", room: "A3-208", batch: "all" },
        { type: "lecture", sub: "Ele2_NS", time: "02:15 - 03:15", room: "A3-208", batch: "all" },

        { type: "practical", sub: "Ele2_NS", time: "03:30 - 05:30", batch: "K8" },
        { type: "practical", sub: "MP1", time: "03:30 - 05:30", batch: "L8" },
        { type: "practical", sub: "CN", time: "03:30 - 05:30", batch: "M8" },
        { type: "practical", sub: "PDC", time: "03:30 - 05:30", batch: "N8" }
    ],

    friday: [

        { type: "lecture", sub: "CN", time: "01:15 - 02:15", room: "A3-208", batch: "all" },
        { type: "lecture", sub: "PDC", time: "02:15 - 03:15", room: "A3-208", batch: "all" },

        { type: "practical", sub: "CN", time: "03:30 - 05:30", batch: "L8" },
        { type: "practical", sub: "PDC", time: "03:30 - 05:30", batch: "M8" },
        { type: "practical", sub: "MP2", time: "03:30 - 05:30", batch: "N8" }
    ]
};

async function seedData() {
    const students = [];

    fs.createReadStream('te08_students.csv')
        .pipe(csv())
        .on('data', (data) => students.push(data))
        .on('end', async () => {
            console.log(`Processing ${students.length} students...`);

            const divisionRef = db
                .collection('departments').doc(DEPT)
                .collection('years').doc(YEAR)
                .collection('divisions').doc(DIV);

            // 1. Upload Timetable
            await divisionRef.collection('timetables').doc('weekly_schedule').set(timetableData);
            console.log('✅ Timetable Updated.');

            // 2. Upload Students in Batches
            let batch = db.batch();
            let count = 0;

            for (const student of students) {
                const studentCode = student['Student Code'].trim();
                const batchName = student['Batch'].trim();
                const studentRef = divisionRef.collection('students').doc(studentCode);

                batch.set(studentRef, {
                    name: student['Name'],
                    email: student['Mail'],
                    batch: batchName,
                    password: student['passwords'] || studentCode,
                    role: "student",
                    subscribedTopics: [
                        `${DEPT}_All`,
                        `${DEPT}_${YEAR}_${DIV}_All`,
                        `${DEPT}_${YEAR}_${DIV}_${batchName}`
                    ]
                });

                count++;
                if (count === 400) { // Firestore batch limit is 500
                    await batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            }

            await batch.commit();
            console.log('✅ All students seeded successfully.');
            process.exit();
        });
}

seedData();