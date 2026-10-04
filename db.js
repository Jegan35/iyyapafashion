// db.js
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const BILLS_COLLECTION = "bills";
const COMPANIES_COLLECTION = "companies";

// ==========================================
// Bills CRUD
// ==========================================

export async function saveBill(billData) {
    try {
        const docRef = await addDoc(collection(db, BILLS_COLLECTION), {
            ...billData,
            createdAt: serverTimestamp(),
            isDeleted: false
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving bill:", error);
        return { success: false, message: error.message };
    }
}

export async function getBills(includeDeleted = false) {
    try {
        const q = query(
            collection(db, BILLS_COLLECTION), 
            where("isDeleted", "==", includeDeleted),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const bills = [];
        querySnapshot.forEach((doc) => {
            bills.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: bills };
    } catch (error) {
        console.error("Error getting bills:", error);
        
        // Handle missing composite index error gracefully by sorting client-side as a fallback
        if (error.code === 'failed-precondition' || String(error.message).includes("index")) {
             console.warn("Missing Firestore Index. Fetching without orderBy and sorting locally. Click the link in your console to build the index.");
             const qFallback = query(collection(db, BILLS_COLLECTION), where("isDeleted", "==", includeDeleted));
             const fallbackSnapshot = await getDocs(qFallback);
             const bills = [];
             fallbackSnapshot.forEach((doc) => {
                 bills.push({ id: doc.id, ...doc.data() });
             });
             // Sort client side
             bills.sort((a,b) => {
                 const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                 const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                 return timeB - timeA;
             });
             return { success: true, data: bills };
        }
        return { success: false, message: error.message };
    }
}

export async function updateBill(id, updateData) {
    try {
        const docRef = doc(db, BILLS_COLLECTION, id);
        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error("Error updating bill:", error);
        return { success: false, message: error.message };
    }
}

export async function softDeleteBill(id) {
    return await updateBill(id, { isDeleted: true });
}

export async function restoreBill(id) {
    return await updateBill(id, { isDeleted: false });
}

export async function permanentlyDeleteBill(id) {
    try {
        await deleteDoc(doc(db, BILLS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error("Error deleting bill permanently:", error);
        return { success: false, message: error.message };
    }
}

// ==========================================
// Companies CRUD
// ==========================================

export async function saveCompany(companyData) {
    try {
        const docRef = await addDoc(collection(db, COMPANIES_COLLECTION), {
            ...companyData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving company:", error);
        return { success: false, message: error.message };
    }
}

export async function updateCompany(id, companyData) {
    try {
        const docRef = doc(db, COMPANIES_COLLECTION, id);
        await updateDoc(docRef, companyData);
        return { success: true };
    } catch (error) {
        console.error("Error updating company:", error);
        return { success: false, message: error.message };
    }
}

export async function getCompanies() {
    try {
        const q = query(collection(db, COMPANIES_COLLECTION), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const companies = [];
        querySnapshot.forEach((doc) => {
            companies.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: companies };
    } catch (error) {
        console.error("Error getting companies:", error);
        
        // Fallback if missing index
        if (error.code === 'failed-precondition' || String(error.message).includes("index")) {
            const querySnapshot = await getDocs(collection(db, COMPANIES_COLLECTION));
            const companies = [];
            querySnapshot.forEach((doc) => {
                companies.push({ id: doc.id, ...doc.data() });
            });
             companies.sort((a,b) => {
                 const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                 const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                 return timeB - timeA;
             });
            return { success: true, data: companies };
        }
        return { success: false, message: error.message };
    }
}

export async function deleteCompany(id) {
    try {
        await deleteDoc(doc(db, COMPANIES_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error("Error deleting company:", error);
        return { success: false, message: error.message };
    }
}
