import { db } from './firebaseConfig';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const seedDatabase = async () => {
  try {
    console.log("Starting Seed...");

    // 1. SEED TEST USERS (Student & Faculty)
    // Replace 'REPLACE_WITH_ACTUAL_UID' with the UID from Firebase Auth Console
    const studentUID = "REPLACE_WITH_YOUR_UID"; 
    await setDoc(doc(db, "users", studentUID), {
      name: "Shailesh Suryawanshi",
      pictId: "I2K221010",
      role: "student",
      dept: "CS",
      class: "TE-1",
      semester: "6",
      email: "student@pict.edu",
      contactNo: "9876543210",
      isFirstLogin: false // Set to true to test password change flow
    });

    // 2. SEED PLACEMENT DRIVES (TNP Tab)
    const tnpRef = collection(db, "placement_drives");
    const drives = [
      {
        companyName: "Google",
        lpa: "32",
        criteria: "7.5+ CGPA, No Backlogs",
        skills: ["Java", "DSA", "System Design"],
        status: "today",
        venue: "PICT Auditorium",
        reportingTime: "09:00 AM",
        regLink: "https://google.com/careers"
      },
      {
        companyName: "NVIDIA",
        lpa: "24",
        criteria: "8.0+ CGPA",
        skills: ["C++", "Python", "ML"],
        status: "upcoming",
        regLink: "https://nvidia.com/jobs"
      },
      {
        companyName: "PhonePe",
        lpa: "20",
        status: "visited",
        totalHired: 12,
        criteria: "All Depts eligible"
      }
    ];
    for (const drive of drives) await addDoc(tnpRef, drive);

    // 3. SEED NOTICES (Notice Tab)
    const noticeRef = collection(db, "notices");
    const notices = [
      {
        title: "Unit Test 1 Schedule",
        description: "Exams start from 20th March. Check portal for seating.",
        type: "academics",
        severity: "high", // Red coding
        timestamp: serverTimestamp()
      },
      {
        title: "Holi Break",
        description: "College will remain closed on 25th March.",
        type: "holidays",
        severity: "low", // Green/Blue coding
        timestamp: serverTimestamp()
      }
    ];
    for (const notice of notices) await addDoc(noticeRef, notice);

    // 4. SEED TIMETABLE (Home Screen 'Today's Classes')
    // Doc ID is Dept_Year_Div for efficient querying
    await setDoc(doc(db, "timetables", "CS_TE_1"), {
      monday: [
        { sub: "CN", time: "10:00 AM", room: "A1-402", teacher: "Prof. Kulkarni" },
        { sub: "OS", time: "11:00 AM", room: "A1-402", teacher: "Prof. Patil" }
      ],
      friday: [
        { sub: "PDC", time: "09:00 AM", room: "A1-203", teacher: "Prof. Sharma" },
        { sub: "AI/ML", time: "10:00 AM", room: "A1-203", teacher: "Prof. Joshi" }
      ]
    });

    console.log("✅ Database Seeded Successfully!");
  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};