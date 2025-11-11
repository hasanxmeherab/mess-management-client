import React, { useState } from 'react';
import { generateMessId, generateJoinKey } from '../utils/dateHelpers'; 

const MessChooser = ({ userId, userName, setCurrentMessId, createMessApi, joinMessApi }) => {
    const [isJoining, setIsJoining] = useState(false);
    const [messIdInput, setMessIdInput] = useState('');
    const [joinKeyInput, setJoinKeyInput] = useState('');
    const [messNameInput, setMessNameInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- CREATE MESS ---
    const handleCreateMess = async () => {
        setIsLoading(true);
        setError('');
        const newMessId = generateMessId();
        const newJoinKey = generateJoinKey();
        const messName = messNameInput.trim() || `${userName}'s Mess`;

        try {
            // Data structure matches the server schema
            const members = {
                [userId]: {
                    name: userName,
                    deposit: 0,
                    meals: {}
                }
            };
            
            // Call the new API function
            await createMessApi(newMessId, messName, newJoinKey, members);

            // Store Mess ID locally (replaces Firestore mapping document)
            localStorage.setItem('currentMessId', newMessId); 
            setCurrentMessId(newMessId);

        } catch (e) {
            console.error("Error creating mess:", e);
            setError(`Failed to create mess: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- JOIN MESS ---
    const handleJoinMess = async () => {
        setIsLoading(true);
        setError('');
        const messId = messIdInput.trim().toUpperCase();
        const joinKey = joinKeyInput.trim().toUpperCase();

        if (!messId || !joinKey) {
            setError("Please enter both Mess ID and Join Key.");
            setIsLoading(false);
            return;
        }

        try {
            // Call the new API function for joining
            await joinMessApi(messId, joinKey, 0); // Default deposit 0

            // Store Mess ID locally............
            localStorage.setItem('currentMessId', messId);
            setCurrentMessId(messId);

        } catch (e) {
            console.error("Error joining mess:", e);
            setError(`Failed to join mess. ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const actionButtonClasses = "w-full py-3 px-4 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
            <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-2xl">
                <h2 className="text-3xl font-extrabold text-indigo-700 text-center">
                    Mess Selection
                </h2>
                
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                {/* CREATE MESS SECTION */}
                {!isJoining && (
                    <div className="space-y-4 p-4 border border-indigo-200 rounded-xl bg-indigo-50">
                        <h3 className="text-xl font-bold text-indigo-800">Create New Mess</h3>
                        <input
                            type="text"
                            placeholder="Enter Mess Name (e.g., Hostel Mess A)"
                            value={messNameInput}
                            onChange={(e) => setMessNameInput(e.target.value)}
                            className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleCreateMess}
                            disabled={isLoading}
                            className={`${actionButtonClasses} bg-indigo-600 hover:bg-indigo-700`}
                        >
                            {isLoading ? 'Creating...' : 'Create Mess (Become Manager)'}
                        </button>
                        <button
                            onClick={() => { setIsJoining(true); setError(''); }}
                            className="w-full text-indigo-600 font-medium mt-2 hover:text-indigo-800 transition text-sm"
                        >
                            or Join an existing Mess
                        </button>
                    </div>
                )}

                {/* JOIN MESS SECTION */}
                {isJoining && (
                    <div className="space-y-4 p-4 border border-green-200 rounded-xl bg-green-50">
                        <h3 className="text-xl font-bold text-green-800">Join Existing Mess</h3>
                        <input
                            type="text"
                            placeholder="Mess ID (e.g., 5A4B1C2D)"
                            value={messIdInput}
                            onChange={(e) => setMessIdInput(e.target.value)}
                            className="w-full p-3 border border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                            disabled={isLoading}
                        />
                        <input
                            type="password"
                            placeholder="Join Key (Secret Password)"
                            value={joinKeyInput}
                            onChange={(e) => setJoinKeyInput(e.target.value)}
                            className="w-full p-3 border border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleJoinMess}
                            disabled={isLoading}
                            className={`${actionButtonClasses} bg-green-600 hover:bg-green-700`}
                        >
                            {isLoading ? 'Joining...' : 'Join Mess'}
                        </button>
                        <button
                            onClick={() => { setIsJoining(false); setError(''); }}
                            className="w-full text-green-600 font-medium mt-2 hover:text-green-800 transition text-sm"
                        >
                            or Create a new Mess
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessChooser;
