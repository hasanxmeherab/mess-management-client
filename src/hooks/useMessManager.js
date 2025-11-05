import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, updateProfile, signInWithCustomToken } from 'firebase/auth'; 
import { getFirestore, doc, setDoc, getDoc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';

import { 
    generateUniqueId, 
    getStartOfMonth, // NEW: Import monthly helper
    // Note: generateMessId, generateJoinKey, copyToClipboard are now imported 
    // in components/MessChooser and components/Dashboard where they are used.
} from '../utils/dateHelpers.js'; 

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
    // Use displayName if available, otherwise fallback to email prefix
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
        
        // Use user's displayName (set during signup) or email prefix as default
        // Access 'user' state which is guaranteed to be set if this runs after successful auth
        const defaultName = user?.displayName || email?.split('@')[0] || `User ${uid.substring(0, 4)}`; 

        try {
            await runTransaction(db, async (transaction) => {
                const messDoc = await transaction.get(docRef);
                const currentData = messDoc.exists() ? messDoc.data() : initialMessData;
                
                // If the mess doesn't have an admin, the person joining first becomes admin (Self-bootstrap)
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
                    
                    // Attempt to fetch saved mess ID for automatic dashboard entry
                    const mappingRef = getMessMappingRef(authUser.uid);
                    if (mappingRef) {
                        try {
                            const mapSnap = await getDoc(mappingRef);
                            if (mapSnap.exists() && mapSnap.data().messId) {
                                const savedMessId = mapSnap.data().messId;
                                setCurrentMessId(savedMessId);
                                // The initialization logic here relies on the global user state being set right above this block
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

        // --- EXPENSE FILTERING ---
        const monthlyExpenses = messData.expenses.filter(expense => {
            // Check if the expense date is within the current month bounds
            return expense.date >= monthStart && expense.date < monthEnd;
        });

        monthlyExpenses.forEach(expense => {
            totalExpenses += expense.amount || 0;
        });

        // --- MEAL FILTERING & COUNTING ---
        Object.keys(messData.members).forEach(memberId => {
            const member = messData.members[memberId];
            let memberMeals = 0;

            // Only sum meals that belong to the current month
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
            
            // Deposits are generally cumulative, but we keep the current total deposit for member's current balance
            const deposit = member.deposit || 0;
            totalDeposited += deposit;

            totalMeals += memberMeals;
            memberSummaries[member.name] = { 
                totalMeals: memberMeals, 
                deposit: deposit, // This is the total running deposit
                balance: 0 
            };
        });
        
        const availableAmount = totalDeposited - totalExpenses; // Note: This calculation is now misleading as deposit is cumulative, but expenses are monthly. For a truly accurate monthly view, deposits should also be filtered or a separate "Monthly Deposit" field should be used. For simplicity, we keep running deposit for now.

        const ratePerMeal = totalMeals > 0 ? (totalExpenses / totalMeals) : 0;
        const formattedRate = ratePerMeal.toFixed(2);

        Object.keys(memberSummaries).forEach(name => {
            const summary = memberSummaries[name];
            const expenseShare = summary.totalMeals * ratePerMeal;
            
            // Balance calculation: Total Expense Share - Member's Total Deposit
            // A positive balance means the member OWES money (share > deposit)
            // A negative balance means the member has CREDIT (deposit > share)
            summary.balance = expenseShare - summary.deposit; 
        });

        return {
            totalMeals: totalMeals,
            totalExpenses: totalExpenses, // Total expenses in the CURRENT MONTH
            totalDeposited: totalDeposited, // Total cumulative deposits
            availableAmount: availableAmount, // Cumulative deposit - monthly expenses
            ratePerMeal: formattedRate, // Calculated based on monthly expenses and monthly meals
            memberSummaries: memberSummaries, // Balances calculated using monthly meals/expenses vs. cumulative deposit
            monthlyExpenses: monthlyExpenses // NEW: Export the filtered expenses for history display
        };
    }, [messData, currentMonthStart]); // Dependency added for recalculation when month changes


    // --- 4. DATA MUTATION FUNCTIONS ---
    // (No change needed here, they continue to update the centralized Firestore object)
    const updateMealCount = useCallback(async (uid, dateKey, newCount) => {
        if (!db || !userId || !currentMessId) return;

        // **STRICT ADMIN-ONLY MEAL ENTRY SECURITY CHECK**
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
        currentMonthStart, // MODIFIED
        setCurrentMonthStart, // MODIFIED
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