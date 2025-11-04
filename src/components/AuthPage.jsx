import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { updateUserNameInFirebase } from '../hooks/useMessManager.js'; // Retaining the path that should work based on file structure

// Helper component for loading spinner
const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AuthPage = ({ auth }) => {
    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isSignIn) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (!displayName.trim()) {
                    setError('Please enter your display name.');
                    setIsLoading(false);
                    return;
                }
                
                // Sign up logic: Create user first
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Update the user's name immediately
                await updateUserNameInFirebase(userCredential.user, displayName.trim());
            }
        } catch (e) {
            console.error("Auth Error:", e.message);
            // Display a user-friendly error message, removing the 'Firebase: ' prefix
            setError(e.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl border border-indigo-100">
                <div className="text-center">
                    <h2 className="mt-6 text-4xl font-extrabold text-indigo-800">
                        {isSignIn ? 'Welcome Back!' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-md text-gray-600">
                        {isSignIn ? 'Sign in to access your dashboard.' : 'Join the Mess to get started.'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {/* Name Input (Only for Sign Up) */}
                    {!isSignIn && (
                        <div>
                            <input
                                type="text"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your Name"
                                className="appearance-none rounded-t-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-inner"
                            />
                        </div>
                    )}
                    
                    {/* Email Input */}
                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            className={`appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-inner 
                                ${isSignIn ? 'rounded-t-md' : 'rounded-none border-t-0'}`}
                        />
                    </div>
                    
                    {/* Password Input */}
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className={`appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-inner 
                                ${isSignIn ? 'rounded-b-md' : 'rounded-b-md border-t-0'}`}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg border border-red-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50 shadow-lg"
                        >
                            {isLoading ? <LoadingSpinner /> : (isSignIn ? 'Sign In' : 'Sign Up')}
                        </button>
                    </div>
                </form>

                <div className="flex items-center justify-center">
                    <button
                        onClick={() => {
                            setIsSignIn(!isSignIn);
                            setError('');
                            setDisplayName('');
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition"
                    >
                        {isSignIn ? "Don't have an account? Create Account" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
