import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const seedEvents = async () => {
  try {
    console.log("Seeding Events...");
    const eventRef = collection(db, "events");

    const events = [
      {
        title: "Credenz '26",
        organizer: "PISB",
        date: "March 25, 2026",
        description: "The annual technical festival of PICT featuring Robosoccer, Web Weaver, and DataWiz.",
        category: "Technical",
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop",
        regLink: "https://credenz.in",
        isFeatured: true,
        timestamp: serverTimestamp()
      },
      {
        title: "Impetus & Concepts",
        organizer: "PICT",
        date: "April 02, 2026",
        description: "National level project competition and exhibition. Showcase your innovation to industry experts.",
        category: "Technical",
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop",
        regLink: "https://pictinc.org",
        isFeatured: false,
        timestamp: serverTimestamp()
      },
      {
        title: "ACM-W Hackathon",
        organizer: "PICT ACM Student Chapter",
        date: "March 28, 2026",
        description: "A 24-hour hackathon focused on solving real-world problems using AI and Blockchain.",
        category: "Technical",
        image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1000&auto=format&fit=crop",
        regLink: "https://pict.acm.org",
        isFeatured: false,
        timestamp: serverTimestamp()
      },
      {
        title: "Unmesh '26",
        organizer: "Cultural Committee",
        date: "April 10, 2026",
        description: "The biggest cultural extravaganza of PICT. Music, Dance, and Drama.",
        category: "Cultural",
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop",
        regLink: "https://pict.edu/cultural",
        isFeatured: false,
        timestamp: serverTimestamp()
      }
    ];

    for (const event of events) {
      await addDoc(eventRef, event);
    }

    console.log("✅ Events Seeded Successfully!");
  } catch (error) {
    console.error("❌ Error seeding events:", error);
  }
};