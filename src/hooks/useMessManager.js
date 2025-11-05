import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, updateProfile, signInWithCustomToken } from 'firebase/auth'; 
import { getFirestore, doc, setDoc, getDoc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';

// --- Global Configuration (Replace with your actual values locally) ---
const appId = 'local-mess-app';
const firebaseConfig = {
    apiKey: "AIzaSyDwi_WT5ipEL2MN08cn__WOceCPiJ3AAws",
    authDomain: "messmate2025.firebaseapp.com",
    projectId: "messmate2025",
    storageBucket: "messmate2025.firebasestorage.app",
    messagingSenderId: "816133721747",
    appId: "1:816133721747:web:8708b2ab7caf5aa6758766",
    measurementId: "G-5P0NERX0XG"
};
const initialAuthToken = null; 
const initialMessData = {
    name: '',
    members: {},
    expenses: [],
    adminUid: '',
    joinKey: '',
};

// --- HELPER FUNCTIONS (RETAINED IN THIS FILE) ---

/** Generates a unique 8-character ID for the mess. */
export const generateMessId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

/** Generates a simple 6-digit join key. */
export const generateJoinKey = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/** Generates a simple, short unique ID for expenses, etc. (FIX for crypto.randomUUID) */
export const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 9);
};

/** Calculates the start of the month (YYYY-MM-01 00:00:00). */
export const getStartOfMonth = (date) => {
    const d = new Date(date);
    d.setDate(1); // Set to the first day of the month
    d.setHours(0, 0, 0, 0);
    return d;
};


/**
 * Updates the user's display name in Firebase Auth.
 * AuthPage calls this after user creation.
 */
export const updateUserNameInFirebase = async (user, newName) => {
    if (!user || !newName) return;
    await updateProfile(user, { displayName: newName });
};


// --- MAIN HOOK ---

export const useMessManager = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messData, setMessData] = useState(initialMessData);
    const [currentMessId, setCurrentMessId] = useState(null);
    // MODIFIED: Use currentMonthStart instead of currentWeekStart
    const [currentMonthStart, setCurrentMonthStart] = useState(getStartOfMonth(new Date())); 
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');

    // Derived State
    const userId = user?.uid;
    const userName = user?.displayName || user?.email?.split('@')[0] || (userId ? `User ${userId.substring(0, 4)}` : 'Unknown');
    const isAdmin = userId && messData.adminUid === userId;
    const currentMessName = messData.name || 'Mess Dashboard';
    const currentJoinKey = messData.joinKey || 'N/A';
    
    // --- FIREBASE REFERENCES ---

    /** Helper to get the public Mess document reference. */
    const getMessRef = useCallback((messId) => {
        if (!db || !messId) return null;
        return doc(db, `artifacts/${appId}/public/data/mess_details`, messId);
    }, [db]);

    /** Helper to get the private user mess mapping document reference. */
    const getMessMappingRef = useCallback((uid) => {
        if (!db || !uid) return null;
        return doc(db, `artifacts/${appId}/users/${uid}/messUserMap`, 'currentMessDoc');
    }, [db]);

    // --- 1. INITIALIZATION & AUTHENTICATION ---
    
    const initializeMember = useCallback(async (uid, email, messId) => {
        const docRef = getMessRef(messId);
        if (!docRef) return;
        
        const defaultName = user?.displayName || email?.split('@')[0] || `User ${uid.substring(0, 4)}`; 

        try {
            await runTransaction(db, async (transaction) => {
                const messDoc = await transaction.get(docRef);
                const currentData = messDoc.exists() ? messDoc.data() : initialMessData;
                
                if (!currentData.adminUid) {
                    currentData.adminUid = uid;
                }

                if (!currentData.members[uid]) {
                    const newMember = {
                        name: defaultName,
                        deposit: 0,
                        meals: {},
                    };
                    currentData.members[uid] = newMember;
                    transaction.update(docRef, { members: currentData.members, adminUid: currentData.adminUid });
                }
            });
        } catch (error) {
            console.error("Error initializing member:", error);
        }
    }, [db, getMessRef, user]);


    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(firestore);
            setAuth(authInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (authUser) => {
                if (authUser) {
                    setUser(authUser);
                    
                    const mappingRef = getMessMappingRef(authUser.uid);
                    if (mappingRef) {
                        try {
                            const mapSnap = await getDoc(mappingRef);
                            if (mapSnap.exists() && mapSnap.data().messId) {
                                const savedMessId = mapSnap.data().messId;
                                setCurrentMessId(savedMessId);
                                await initializeMember(authUser.uid, authUser.email, savedMessId); 
                            }
                        } catch (e) {
                            console.error("Error fetching user mess mapping:", e);
                        }
                    }
                } else {
                    setUser(null);
                    setCurrentMessId(null);
                    if (initialAuthToken) {
                         signInWithCustomToken(authInstance, initialAuthToken).catch(console.error);
                    }
                }
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization error:", error);
            setLoading(false);
        }
    }, [getMessMappingRef, initializeMember]); 


    // --- 2. DATA LISTENER ---

    useEffect(() => {
        const messRef = getMessRef(currentMessId);
        if (!db || !userId || !messRef) {
            setMessData(initialMessData);
            return;
        }

        const unsubscribe = onSnapshot(messRef, (docSnap) => {
            if (docSnap.exists()) {
                setMessData(docSnap.data());
            } else {
                setCurrentMessId(null); 
                console.warn(`Mess document ${currentMessId} does not exist.`);
            }
        }, (error) => {
            console.error("Firestore snapshot error:", error);
        });

        return () => unsubscribe();
    }, [db, userId, currentMessId, getMessRef]);


    // --- 3. CORE MONTHLY CALCULATIONS (MODIFIED) ---

    const calculatedSummary = useMemo(() => {
        let totalMeals = 0;
        let totalExpenses = 0;
        let totalDeposited = 0; 
        let memberSummaries = {};

        // Define the bounds for the current calculation month
        const monthStart = new Date(currentMonthStart).getTime();
        const nextMonthStart = new Date(currentMonthStart);
        nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
        const monthEnd = nextMonthStart.getTime();

        // --- EXPENSE FILTERING (Monthly) ---
        const monthlyExpenses = messData.expenses.filter(expense => {
            return expense.date >= monthStart && expense.date < monthEnd;
        });

        monthlyExpenses.forEach(expense => {
            totalExpenses += expense.amount || 0;
        });

        // --- MEAL FILTERING & COUNTING (Monthly) ---
        Object.keys(messData.members).forEach(memberId => {
            const member = messData.members[memberId];
            let memberMeals = 0;

            if (member.meals) {
                Object.keys(member.meals).forEach(dateKey => {
                    // dateKey format: YYYY-MM-DD_B
                    const mealDateStr = dateKey.split('_')[0];
                    const mealDate = new Date(mealDateStr).getTime();
                    
                    if (mealDate >= monthStart && mealDate < monthEnd) {
                        memberMeals += member.meals[dateKey];
                    }
                });
            }
            
            // Total deposits are cumulative
            const deposit = member.deposit || 0;
            totalDeposited += deposit;

            totalMeals += memberMeals;
            memberSummaries[member.name] = { 
                totalMeals: memberMeals, 
                deposit: deposit, 
                balance: 0 
            };
        });
        
        const availableAmount = totalDeposited - totalExpenses; 

        const ratePerMeal = totalMeals > 0 ? (totalExpenses / totalMeals) : 0;
        const formattedRate = ratePerMeal.toFixed(2);

        Object.keys(memberSummaries).forEach(name => {
            const summary = memberSummaries[name];
            const expenseShare = summary.totalMeals * ratePerMeal;
            
            // Balance calculation: Monthly Expense Share - Member's Cumulative Deposit
            summary.balance = expenseShare - summary.deposit; 
        });

        return {
            totalMeals: totalMeals,
            totalExpenses: totalExpenses,
            totalDeposited: totalDeposited, 
            availableAmount: availableAmount, 
            ratePerMeal: formattedRate, 
            memberSummaries: memberSummaries, 
            monthlyExpenses: monthlyExpenses 
        };
    }, [messData, currentMonthStart]); 


    // --- 4. DATA MUTATION FUNCTIONS ---
    
    const updateMealCount = useCallback(async (uid, dateKey, newCount) => {
        if (!db || !userId || !currentMessId) return;

        if (!isAdmin) {
            console.warn("Permission Denied: Only Admin can update meal counts.");
            return; 
        }
        
        const docRef = getMessRef(currentMessId);
        const count = Math.max(0, parseInt(newCount, 10) || 0);

        try {
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const data = docSnap.data();
                if (data.members[uid]) {
                    if (!data.members[uid].meals) data.members[uid].meals = {};
                    data.members[uid].meals[dateKey] = count;
                    transaction.update(docRef, { members: data.members });
                }
            });
        } catch (e) {
            console.error("Meal update failed: ", e);
        }
    }, [db, userId, currentMessId, isAdmin, getMessRef]);

    const addExpense = useCallback(async (description, amount) => {
        if (!db || !userId || !currentMessId || !isAdmin) return;
        const docRef = getMessRef(currentMessId);

        const expense = {
            id: generateUniqueId(),
            description: description,
            amount: parseFloat(amount),
            date: Date.now(),
            addedBy: userId,
        };

        try {
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const data = docSnap.data();
                const expenses = data.expenses || [];
                expenses.push(expense);
                transaction.update(docRef, { expenses: expenses });
            });
            setExpenseModalOpen(false);
        } catch (e) {
            console.error("Error adding expense: ", e);
        }
    }, [db, userId, currentMessId, isAdmin, getMessRef]);

    const addDeposit = useCallback(async (memberUid, amount) => {
        if (!db || !userId || !currentMessId || !isAdmin) return;
        const docRef = getMessRef(currentMessId);
        const depositAmount = parseFloat(amount);

        try {
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(docRef);
                const data = docSnap.data();
                const memberData = data.members[memberUid];

                if (memberData) {
                    memberData.deposit = (memberData.deposit || 0) + depositAmount;
                    data.members[memberUid] = memberData;
                    transaction.update(docRef, { members: data.members });
                }
            });
            setDepositModalOpen(false);
        } catch (e) {
            console.error("Error adding deposit: ", e);
        }
    }, [db, userId, currentMessId, isAdmin, getMessRef]);


    // --- Return all state and functions ---
    return {
        loading,
        user,
        auth,
        db,
        userId,
        userName,
        isAdmin,
        messData,
        currentMessId,
        setCurrentMessId,
        getMessRef,
        getMessMappingRef,
        calculatedSummary,
        currentMessName,
        currentJoinKey,
        currentMonthStart, 
        setCurrentMonthStart, 
        updateMealCount,
        expenseModalOpen,
        setExpenseModalOpen,
        addExpense,
        depositModalOpen,
        setDepositModalOpen,
        addDeposit,
        copyMessage,
        setCopyMessage,
        signOut,
    };
};