import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth'; 
import {
  getStartOfMonth,
  generateUniqueId,
  parseISODateToLocal,
} from '../utils/dateHelpers';

// --- Global Configuration ---
const API_BASE_URL = 'http://localhost:5000/api/v1/mess'; 
const POLLING_INTERVAL = 5000; // Poll data every 5 seconds

// Keep your existing Firebase Config (for Auth only)
const firebaseConfig = {
  apiKey: 'AIzaSyDwi_WT5ipEL2MN08cn__WOceCPiJ3AAws',
  authDomain: 'messmate2025.firebaseapp.com',
  projectId: 'messmate2025',
  storageBucket: 'messmate2025.firebasestorage.app',
  messagingSenderId: '816133721747',
  appId: '1:816133721747:web:8708b2ab7caf5aa6758766',
  measurementId: 'G-5P0NERX0XG',
};

const initialMessData = {
  name: '',
  members: {},
  expenses: [],
  adminUid: '',
  joinKey: '',
};

// --- HELPER FUNCTIONS ---
export const updateUserNameInFirebase = async (user, newName) => {
  if (!user || !newName) return;
  await updateProfile(user, { displayName: newName });
};

// --- API FETCH HELPER ---
const fetchApi = async (endpoint, data) => {
    const body = JSON.stringify({ ...data, userId: data.userId });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `API Error on ${endpoint}`);
    }
    return response.json();
}

// --- MAIN HOOK ---
export const useMessManager = () => {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messData, setMessData] = useState(initialMessData);
  const [currentMessId, setCurrentMessId] = useState(localStorage.getItem('currentMessId')); 
  const [currentMonthStart, setCurrentMonthStart] = useState(getStartOfMonth(new Date()));
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const userId = user?.uid;
  const userName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    (userId ? `User ${userId.substring(0, 4)}` : 'Unknown');
  const isAdmin = userId && messData.adminUid === userId;
  const currentMessName = messData.name || 'Mess Dashboard';
  const currentJoinKey = messData.joinKey || 'N/A';

  // --- Auth Initialization (Contains the critical fix) ---
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig); 
      const authInstance = getAuth(app);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, (authUser) => {
        if (authUser) {
          setUser(authUser);
          
          // --- CRITICAL FIX START ---
          // Read localStorage value IMMEDIATELY and update state synchronously
          const savedMessId = localStorage.getItem('currentMessId');
          if (savedMessId) {
             setCurrentMessId(savedMessId); 
          }
          // --- CRITICAL FIX END ---
          
        } else {
          setUser(null);
          setCurrentMessId(null);
          localStorage.removeItem('currentMessId');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase Auth initialization error:', error);
      setLoading(false);
    }
  }, []);

  // --- Data Polling Loop ---
  const fetchMessData = useCallback(async (messId) => {
    if (!messId || !userId) return; 
    try {
      const data = await fetchApi('/details', { messId, userId });
      setMessData(data);
    } catch (e) {
      console.error("Error fetching mess data:", e);
      if (e.message.includes('404') || e.message.includes('not found') || e.message.includes('Server error')) {
         setCurrentMessId(null);
         localStorage.removeItem('currentMessId');
      }
    }
  }, [userId]);


  useEffect(() => {
    if (currentMessId) { 
      fetchMessData(currentMessId); 

      const interval = setInterval(() => {
        fetchMessData(currentMessId);
      }, POLLING_INTERVAL); 

      return () => clearInterval(interval); 
    } else {
      setMessData(initialMessData);
    }
  }, [currentMessId, fetchMessData]);
  
  // --- CALCULATIONS (UNCHANGED) ---
  const calculatedSummary = useMemo(() => {
    let totalMeals = 0;
    let totalExpenses = 0;
    let totalDeposited = 0;
    const memberSummaries = {};

    const targetYear = currentMonthStart.getFullYear();
    const targetMonth = currentMonthStart.getMonth();

    const monthlyExpenses = messData.expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getFullYear() === targetYear &&
        expenseDate.getMonth() === targetMonth
      );
    });

    monthlyExpenses.forEach((expense) => {
      totalExpenses += expense.amount || 0;
    });

    if (messData.members) {
      Object.keys(messData.members).forEach((memberId) => {
        const member = messData.members[memberId];
        let memberMeals = 0;

        if (member.meals) {
          Object.keys(member.meals).forEach((dateKey) => {
            const mealDateStr = dateKey.split('_')[0];
            const mealDate = parseISODateToLocal(mealDateStr);

            if (
              mealDate.getFullYear() === targetYear &&
              mealDate.getMonth() === targetMonth
            ) {
              memberMeals += member.meals[dateKey];
            }
          });
        }

        const deposit = member.deposit || 0;
        totalDeposited += deposit;
        totalMeals += memberMeals;

        memberSummaries[memberId] = {
          name: member.name,
          totalMeals: memberMeals,
          deposit,
          balance: 0,
        };
      });
    }

    const availableAmount = totalDeposited - totalExpenses;
    const ratePerMeal = totalMeals > 0 ? totalExpenses / totalMeals : 0;
    const formattedRate = ratePerMeal.toFixed(2);

    Object.keys(memberSummaries).forEach((uidKey) => {
      const summary = memberSummaries[uidKey];
      const expenseShare = summary.totalMeals * ratePerMeal;
      summary.balance = expenseShare - summary.deposit; 
    });

    return {
      totalMeals,
      totalExpenses,
      totalDeposited,
      availableAmount,
      ratePerMeal: formattedRate,
      memberSummaries,
      monthlyExpenses,
    };
  }, [messData, currentMonthStart]);


  // --- API CALLS ---
  
  const updateMealCount = useCallback(
    async (uid, dateKey, newCount) => {
      if (!userId || !currentMessId || !isAdmin) return;
      const count = Math.max(0, parseInt(newCount, 10) || 0);

      try {
        await fetchApi('/meal', { 
            messId: currentMessId, 
            userId,
            memberUid: uid, 
            dateKey, 
            newCount: count 
        });
      } catch (e) {
        console.error('Meal update failed:', e);
      }
    },
    [userId, currentMessId, isAdmin], 
  );

  const addExpense = useCallback(
    async (newExpenses) => {
      if (!userId || !currentMessId || !isAdmin) return;

      const expensesToAdd = newExpenses.map((item) => ({
        id: generateUniqueId(),
        description: item.description,
        amount: parseFloat(item.amount),
        date: Date.now(),
        addedBy: userId,
      }));

      try {
        await fetchApi('/expense', { 
            messId: currentMessId, 
            userId, 
            newExpenses: expensesToAdd 
        });
        fetchMessData(currentMessId); 
      } catch (e) {
        console.error('Error adding expense batch:', e);
      }
    },
    [userId, currentMessId, isAdmin, fetchMessData],
  );

  const addDeposit = useCallback(
    async (memberUid, amount) => {
      if (!userId || !currentMessId || !isAdmin) return;
      const depositAmount = parseFloat(amount);

      try {
        await fetchApi('/deposit', { 
            messId: currentMessId, 
            userId, 
            memberUid, 
            depositAmount 
        });
        fetchMessData(currentMessId); 
        setDepositModalOpen(false);
      } catch (e) {
        console.error('Error adding deposit:', e);
      }
    },
    [userId, currentMessId, isAdmin, fetchMessData],
  );
  
  const createMessApi = useCallback(async (messId, name, joinKey, members) => {
      if (!userId) throw new Error("User not authenticated.");

      return fetchApi('/create', {
        messId,
        name,
        adminUid: userId,
        joinKey,
        members,
        userId
      });
  }, [userId]);

  const joinMessApi = useCallback(async (messId, joinKey, defaultDeposit) => {
      if (!userId || !userName) throw new Error("User or username missing.");
      
      return fetchApi('/join', {
        messId,
        joinKey,
        userId,
        userName,
        defaultDeposit,
      });
  }, [userId, userName]);


  // --- Return all state and functions ---
  return {
    loading,
    user,
    auth,
    userId,
    userName,
    isAdmin,
    messData,
    currentMessId,
    setCurrentMessId,
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
    createMessApi,
    joinMessApi,
  };
};